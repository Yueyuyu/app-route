import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { UpdateInstaller } from '../src/main/desktop/updateInstaller.ts'
import type { ReleasedPackage, UpdateDownload } from '../src/shared/updates.ts'

const bytes = Buffer.from('fixture installer; never an executable')
const release: ReleasedPackage = {
  version: '0.3.0', publishedAt: '2026-11-18T00:00:00Z', notes: '',
  releaseUrl: 'https://github.com/Yueyuyu/app-route/releases/tag/v0.3.0',
  assetName: 'AppRoute-0.3.0-setup-x64.exe',
  downloadUrl: 'https://github.com/Yueyuyu/app-route/releases/download/v0.3.0/AppRoute-0.3.0-setup-x64.exe',
  sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length,
}
async function root(t: test.TestContext) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-update-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  return directory
}
test('更新流式下载、校验并在安装前重新备份；只能执行主进程选择的文件', async t => {
  const directory = await root(t), phases: UpdateDownload[] = [], backups: boolean[] = []
  let requests = 0, launched = 0
  const updater = new UpdateInstaller({ root: directory, platform: 'win32', arch: 'x64', installation: 'automatic', changed: state => phases.push(state),
    prepare: async (_version, installing) => { backups.push(installing) },
    fetch: async (url, options) => {
      requests++; assert.equal(url, release.downloadUrl); assert.equal(options?.redirect, 'manual'); assert.equal(options.credentials, 'omit')
      assert.equal(new Headers(options.headers).has('authorization'), false)
      return new Response(bytes)
    } })
  assert.equal(updater.start(release).phase, 'preparing')
  updater.start(release)
  assert.equal((await updater.settled()).phase, 'ready'); assert.equal(requests, 1)
  assert.equal(updater.snapshot().received, bytes.length)
  assert.ok(phases.some(state => state.phase === 'verifying'))
  assert.equal(JSON.stringify(updater.snapshot()).includes(directory), false)
  await updater.install(release, async (file, mode) => {
    launched++; assert.equal(mode, 'automatic')
    assert.deepEqual(await fs.readFile(file), bytes); assert.ok(file.startsWith(path.join(directory, 'updates')))
    await assert.rejects(updater.install(release, async () => { assert.fail('duplicate install') }))
  })
  assert.equal(launched, 1); assert.deepEqual(backups, [false, true])
})
test('备份失败、下载长度或哈希错误均不留下可安装文件，错误信息不泄露本机路径', async t => {
  for (const scenario of ['backup', 'length', 'hash', 'disk-error']) {
    let fetches = 0, installs = 0
    const updater = new UpdateInstaller({ root: await root(t), platform: 'win32', arch: 'x64', installation: 'automatic',
      prepare: async () => { if (scenario === 'backup') throw new Error('管理记录待核对，请先处理后再创建升级备份。'); if (scenario === 'disk-error') throw new Error('ENOENT C:/Private/User') },
      fetch: async () => { fetches++; return new Response(scenario === 'length' ? bytes.subarray(0, 2) : scenario === 'hash' ? Buffer.alloc(bytes.length) : bytes) } })
    updater.start(release); const state = await updater.settled()
    assert.equal(state.phase, 'error'); assert.equal(state.message?.includes('Private'), false)
    if (scenario === 'backup' || scenario === 'disk-error') assert.equal(fetches, 0)
    await assert.rejects(updater.install(release, async () => { installs++ })); assert.equal(installs, 0)
  }
})
test('只允许 GitHub 安装资产重定向，拒绝任意路径、错误架构与超限安装包', async t => {
  let fetches = 0
  const updater = new UpdateInstaller({ root: await root(t), platform: 'win32', arch: 'x64', installation: 'automatic', prepare: async () => {},
    fetch: async () => { fetches++; return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }) } })
  for (const change of [{ assetName: '../run.exe' }, { downloadUrl: 'https://evil.invalid/setup.exe' }, { size: 600 * 1024 * 1024 }, { sha256: '' }, { version: '../0.3.0' }]) assert.throws(() => updater.start({ ...release, ...change }))
  assert.equal(fetches, 0)
  updater.start(release); assert.equal((await updater.settled()).phase, 'error'); assert.equal(fetches, 1)
  const urls: string[] = []
  const valid = new UpdateInstaller({ root: await root(t), platform: 'win32', arch: 'x64', installation: 'automatic', prepare: async () => {},
    fetch: async url => { urls.push(String(url)); return urls.length === 1 ? new Response(null, { status: 302, headers: { Location: 'https://release-assets.githubusercontent.com/example?token=fixture-only' } }) : new Response(bytes) } })
  valid.start(release); assert.equal((await valid.settled()).phase, 'ready'); assert.equal(urls.length, 2)
})
test('取消下载可重试，不会启动安装器；旧任务不会同时下载另一版本', async t => {
  let enter: () => void = () => {}, releaseBackup: () => void = () => {}
  const entered = new Promise<void>(resolve => { enter = resolve }), delayed = new Promise<void>(resolve => { releaseBackup = resolve })
  let calls = 0
  const updater = new UpdateInstaller({ root: await root(t), platform: 'win32', arch: 'x64', installation: 'automatic',
    prepare: async () => { enter(); await delayed },
    fetch: async () => { calls++; return new Response(bytes) } })
  updater.start(release); await entered; updater.cancel(); releaseBackup()
  assert.equal((await updater.settled()).phase, 'cancelled'); assert.equal(calls, 0)
  updater.start(release); assert.equal((await updater.settled()).phase, 'ready'); assert.equal(calls, 1)
})
test('安装前发现文件替换、发布摘要变化或新备份失败时保留当前应用', async t => {
  const directory = await root(t)
  let failBackup = false, installs = 0
  const updater = new UpdateInstaller({ root: directory, platform: 'win32', arch: 'x64', installation: 'automatic',
    prepare: async (_version, installing) => { if (installing && failBackup) throw new Error('有分流操作尚未完成，请稍后更新。') },
    fetch: async () => new Response(bytes) })
  updater.start(release); await updater.settled()
  await assert.rejects(updater.install({ ...release, sha256: 'a'.repeat(64) }, async () => { installs++ }), /发布内容已变化/)
  failBackup = true
  await assert.rejects(updater.install(release, async () => { installs++ }), /分流操作/)
  assert.equal(updater.snapshot().phase, 'ready')
  failBackup = false
  const folders = await fs.readdir(path.join(directory, 'updates'))
  await fs.writeFile(path.join(directory, 'updates', folders[0], release.assetName), Buffer.alloc(bytes.length))
  await assert.rejects(updater.install(release, async () => { installs++ }), /校验失败/)
  assert.equal(installs, 0)
})
test('Mac 只打开校验通过的 DMG，不宣称自动替换或退出', async t => {
  const suffix = 'mac-arm64.dmg', name = 'AppRoute-0.3.0-' + suffix
  const macRelease = { ...release, assetName: name, downloadUrl: 'https://github.com/Yueyuyu/app-route/releases/download/v0.3.0/' + name }
  const updater = new UpdateInstaller({ root: await root(t), platform: 'darwin', arch: 'arm64', installation: 'manual', prepare: async () => {}, fetch: async () => new Response(bytes) })
  updater.start(macRelease); await updater.settled()
  await updater.install(macRelease, async (file, mode) => { assert.equal(mode, 'manual'); assert.ok(file.endsWith('.dmg')) })
  assert.equal(updater.snapshot().phase, 'ready')
})
