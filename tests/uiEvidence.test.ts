import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { PNG } from 'pngjs'
// @ts-expect-error 开发工具直接运行 JavaScript。
import { readUiEvidence, renderUiReport, startUiEvidence } from '../scripts/lib/uiEvidence.mjs'

test('UI 预览拒绝旧版本、未完成、篡改截图与越界路径', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-ui-proof-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const directory = path.join(root, 'output/playwright/settings'); await fs.mkdir(directory, { recursive: true })
  const bytes = PNG.sync.write(new PNG({ width: 1, height: 1 }))
  const source = { revision: 'a'.repeat(40), sourceDigest: 'b'.repeat(64) }
  const record = { version: 1, suite: 'settings', status: 'passed', source, screenshots: [{ file: 'zh-CN-settings.png', locale: 'zh-CN', width: 1, height: 1, sha256: createHash('sha256').update(bytes).digest('hex') }] }
  const save = (value: unknown) => fs.writeFile(path.join(directory, 'evidence.json'), JSON.stringify(value))
  await fs.writeFile(path.join(directory, record.screenshots[0]!.file), bytes)
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify({ checks: ['checked'], errors: [] }))
  await save(record); assert.equal((await readUiEvidence(root, 'settings', source)).screenshots.length, 1)
  await assert.rejects(readUiEvidence(root, 'settings', { ...source, sourceDigest: 'old' }), /当前版本/)
  await save({ ...record, status: 'running' }); await assert.rejects(readUiEvidence(root, 'settings', source), /完整成功/)
  await save({ ...record, screenshots: [{ ...record.screenshots[0], file: '../outside.png' }] }); await assert.rejects(readUiEvidence(root, 'settings', source), /路径/)
  await save(record); await fs.writeFile(path.join(directory, record.screenshots[0]!.file), PNG.sync.write(new PNG({ width: 2, height: 1 })))
  await assert.rejects(readUiEvidence(root, 'settings', source), /不一致/)
  await assert.rejects(readUiEvidence(root, 'localization', source), /ENOENT/)
})

test('界面报告转义验证内容，不将日志解释为 HTML', () => {
  const html = renderUiReport([{ suite: 'settings', platform: 'win32', finishedAt: 'now', screenshots: [], verification: { note: '<script>alert(1)</script>' } }], { revision: 'abc', sourceDigest: 'hash', dirty: true })
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('本地未提交快照')); assert.ok(html.includes('视觉效果仍需人工复核'))
})

test('新验收撤下旧成功报告，执行中源码变化使本次失败', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-ui-source-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  git('init'); await fs.writeFile(path.join(root, '.gitignore'), 'output/\n')
  git('add', '.gitignore'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture')
  const report = path.join(root, 'output/ui-review/index.html')
  await fs.mkdir(path.dirname(report), { recursive: true }); await fs.writeFile(report, 'old success')
  const finish = await startUiEvidence('settings', root)
  await assert.rejects(fs.access(report), /ENOENT/)
  await fs.writeFile(path.join(root, 'new-source.ts'), 'changed')
  await assert.rejects(finish(true), /源码变化/)
  const record = JSON.parse(await fs.readFile(path.join(root, 'output/playwright/settings/evidence.json'), 'utf8'))
  assert.equal(record.status, 'failed')
})
