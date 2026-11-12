import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
// @ts-expect-error 开发工具是直接执行的 JavaScript。
import { sandboxEnvironment, waitForState, closeDesktopProcess } from '../scripts/lib/testSandbox.mjs'

test('隔离环境不继承代理、密钥、Node 注入和真实用户目录', () => {
  const root = path.resolve('fixture'), env = sandboxEnvironment(root, { PATH: 'runtime', HOME: 'real', USERPROFILE: 'real', HTTPS_PROXY: 'secret', API_KEY: 'secret', NODE_OPTIONS: '--require injected' })
  assert.equal(env.PATH, 'runtime'); assert.equal(env.API_KEY, undefined); assert.equal(env.HTTPS_PROXY, undefined); assert.equal(env.NODE_OPTIONS, undefined)
  assert.ok(env.HOME.startsWith(root)); assert.ok(env.USERPROFILE.startsWith(root)); assert.ok(env.APPROUTE_DATA_DIR.startsWith(root))
})
test('状态等待覆盖延迟、永不就绪与读取失败，不靠固定睡眠宣称成功', async () => {
  let count = 0
  assert.equal(await waitForState('ready', () => ++count, (value: number) => value === 3, { interval: 1 }), 3)
  await assert.rejects(waitForState('never', () => false, Boolean, { timeout: 5, interval: 1 }), /超时/)
  await assert.rejects(waitForState('read error', () => { throw new Error('read failed') }, Boolean), /read failed/)
})
test('桌面正常关闭不杀进程，关闭卡死只清理持有的子进程并报告失败', async () => {
  let killed = 0
  const child = { exitCode: null as number | null, signalCode: null as string | null, kill(signal: string) { killed++; this.signalCode = signal } }
  await closeDesktopProcess({ process: () => child, close: async () => { child.exitCode = 0 } })
  assert.equal(killed, 0)
  child.exitCode = null
  await assert.rejects(closeDesktopProcess({ process: () => child, close: () => new Promise(() => {}) }, 10), /关闭超时/)
  assert.equal(killed, 1); assert.equal(child.signalCode, 'SIGKILL')
})
test('后台边界实际阻止外部文件读取、写入、网络和子进程，同时允许夹具文件', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-boundary-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const guard = new URL('../scripts/lib/fixtureBoundary.mjs', import.meta.url).href
  const code = `import fs from 'node:fs'; import net from 'node:net'; import cp from 'node:child_process'; import assert from 'node:assert/strict'; import {installFixtureBoundary} from ${JSON.stringify(guard)};
    const root=process.argv[1]; const restore=installFixtureBoundary(root);
    fs.writeFileSync(root+'/ok','ok'); assert.equal(fs.readFileSync(root+'/ok','utf8'),'ok');
    for (const action of [()=>fs.readFileSync(root+'/../outside'),()=>fs.writeFileSync(root+'/../outside','bad'),()=>net.connect(7890,'127.0.0.1'),()=>cp.spawn('anything')]) assert.throws(action,{code:'APPROUTE_TEST_BOUNDARY'});
    await assert.rejects(fetch('https://example.invalid'),{code:'APPROUTE_TEST_BOUNDARY'}); restore();`
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code, root], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal((await fs.readFile(path.join(root, 'boundary-violations.jsonl'), 'utf8')).trim().split('\n').length, 5)
})
