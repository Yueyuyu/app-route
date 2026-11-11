import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { ApplicationIconService, normalizeIconPng } from '../src/main/services/applicationIconService.ts'
import { applicationIconCatalog, matchApplicationIcon, matchLocalApplicationIcon } from '../src/core/applicationIcons.ts'
import type { Application, ApplicationScanResult } from '../src/shared/application.ts'

function png(color = 90, transparent = false) {
  const image = new PNG({ width: 32, height: 32 })
  for (let i = 0; i < image.data.length; i += 4) { image.data[i] = color; image.data[i + 3] = transparent ? 0 : 255 }
  return `data:image/png;base64,${PNG.sync.write(image).toString('base64')}`
}
const fixture: Application = { id: 'fixture-one', name: '本机示例', processes: ['Fixture.exe'], mode: 'rule', source: 'scan', category: '其他应用', icon: png(), iconMethod: 'shortcut' }
async function setup(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-icons-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  let result: ApplicationScanResult = { applications: [{ ...fixture }], scannedAt: '2026-11-10T00:00:00Z' }
  const scan = async () => result
  const service = new ApplicationIconService({ root, scan })
  return { root, service, scan, set: (value: ApplicationScanResult) => { result = value } }
}

test('公共目录所有图标与许可都存在；通用进程名不误认，模糊名称不猜测', async () => {
  assert.ok(applicationIconCatalog.applications.length >= 50)
  const ids = new Set<string>()
  for (const entry of applicationIconCatalog.applications) {
    assert.ok(!ids.has(entry.id)); ids.add(entry.id)
    const svg = await fs.readFile(new URL(`../public/icons/apps/${entry.id}.svg`, import.meta.url), 'utf8')
    assert.match(svg, /<svg/)
    assert.ok(applicationIconCatalog.collections[entry.collection as keyof typeof applicationIconCatalog.collections].license)
  }
  assert.equal(matchApplicationIcon({ name: '未知编辑器', processes: ['code.exe'] }), undefined)
  assert.equal(matchApplicationIcon({ name: 'VS Code', processes: ['Code.exe'] })?.id, 'vscode')
  assert.equal(matchApplicationIcon({ name: 'Chromebook Helper', processes: ['unknown.exe'] }), undefined)
  assert.equal(matchApplicationIcon({ name: '微信', processes: ['Weixin.exe'] })?.id, 'wechat')
  assert.equal(matchApplicationIcon({ name: 'Codex', processes: ['ChatGPT.exe'] }), undefined)
  assert.equal(matchApplicationIcon({ name: 'ChatGPT', processes: ['ChatGPT.exe'] })?.id, 'chatgpt')
})

test('本机重名进程保持歧义，产品名精确匹配只影响图标', () => {
  const app = { name: 'Codex', processes: ['Codex.exe'] }
  const actual = { name: 'Codex', processes: ['ChatGPT.exe'] }
  assert.equal(matchLocalApplicationIcon(app, [actual]), actual)
  assert.deepEqual(app.processes, ['Codex.exe'])
  assert.equal(matchLocalApplicationIcon(app, [actual, { ...actual }]), undefined)
  assert.equal(matchLocalApplicationIcon({ name: 'ChatGPT', processes: ['ChatGPT.exe'] }, [actual]), undefined)
})

test('PNG 校验拒绝伪造、损坏、透明空图、超大像素和重复图像头', () => {
  assert.equal(normalizeIconPng(png()).width, 32)
  for (const value of ['data:image/svg+xml;base64,AAAA', png(0, true), 'data:image/png;base64,AAAA', 'http://example.com/a.png']) assert.throws(() => normalizeIconPng(value))
  const bytes = Buffer.from(png().split(',')[1], 'base64')
  const huge = Buffer.from(bytes); huge.writeUInt32BE(100000, 16)
  assert.throws(() => normalizeIconPng(`data:image/png;base64,${huge.toString('base64')}`))
  const duplicate = Buffer.concat([bytes.subarray(0, 33), bytes.subarray(8)])
  assert.throws(() => normalizeIconPng(`data:image/png;base64,${duplicate.toString('base64')}`))
  bytes[bytes.length - 1] ^= 1
  assert.throws(() => normalizeIconPng(`data:image/png;base64,${bytes.toString('base64')}`))
})

test('扫描缓存、用户替换、重启和恢复自动保持优先级，重新扫描不覆盖用户选择', async t => {
  const { service, root, scan } = await setup(t)
  const result = await service.scanApplications()
  assert.match(result.applications[0].icon!, /^\/api\/icons\/image\/cache\//)
  const local = (await service.state()).applications[0]
  assert.equal(local.source, 'local'); assert.equal(local.needsAttention, false)
  await service.replace(local.key, png(180))
  const custom = (await service.state()).applications[0]
  assert.equal(custom.source, 'custom'); assert.notEqual(custom.icon, local.icon)
  const restarted = new ApplicationIconService({ root, scan })
  await restarted.scanApplications()
  assert.equal((await restarted.state()).applications[0].icon, custom.icon)
  await restarted.reset(local.key)
  assert.equal((await restarted.state()).applications[0].icon, local.icon)
})

test('商店白色透明图形增加可见底色，普通图标和用户图片保留原色', () => {
  const image = new PNG({ width: 32, height: 32 })
  for (let y = 8; y < 24; y++) for (let x = 8; x < 24; x++) image.data.fill(255, (y * 32 + x) * 4, (y * 32 + x) * 4 + 4)
  const data = `data:image/png;base64,${PNG.sync.write(image).toString('base64')}`
  assert.equal(normalizeIconPng(data).contrastAdjusted, false)
  const result = normalizeIconPng(data, true)
  assert.equal(result.contrastAdjusted, true)
  const decoded = PNG.sync.read(result.bytes)
  assert.equal(decoded.data[3], 255)
  assert.deepEqual([...decoded.data.subarray((16 * 32 + 16) * 4, (16 * 32 + 16) * 4 + 4)], [255,255,255,255])
  assert.equal(normalizeIconPng(png(), true).contrastAdjusted, false)
})

test('扫描失败保留旧图标并标记待完善，缺图走公共库或明确默认', async t => {
  const { service, set } = await setup(t)
  await service.scanApplications()
  set({ applications: [{ ...fixture, icon: undefined }, { ...fixture, id: 'chrome', name: 'Chrome', processes: ['chrome.exe'], icon: undefined }, { ...fixture, id: 'missing', icon: undefined }], scannedAt: 'later' })
  await service.scanApplications()
  const entries = (await service.state()).applications
  assert.equal(entries[0].source, 'local'); assert.equal(entries[0].needsAttention, true)
  assert.equal(entries[1].source, 'builtin'); assert.equal(entries[1].needsAttention, false)
  assert.equal(entries[2].source, 'fallback'); assert.equal(entries[2].needsAttention, true)
})

test('图标内容损坏会回退，路径穿越不会读取目录外文件', async t => {
  const { service, root } = await setup(t)
  await service.scanApplications()
  const entry = (await service.state()).applications[0]
  const hash = path.basename(entry.icon, '.png')
  await fs.writeFile(path.join(root, 'cache', `${hash}.png`), 'broken')
  const broken = (await service.state()).applications[0]
  assert.equal(broken.source, 'fallback'); assert.equal(broken.needsAttention, true)
  await assert.rejects(service.image('../', hash))
  await assert.rejects(service.image('cache', '../../secret'))
  await assert.rejects(service.replace('../index.json', png()))
})

test('旧草稿图片迁移且不信任客户端路径；新扫描不丢失用户图标', async t => {
  const { service, set } = await setup(t)
  await service.register([{ ...fixture, source: 'manual', path: 'C:\\private\\never-read.exe' }])
  let entry = (await service.state()).applications[0]
  assert.equal(entry.method, 'legacy')
  await service.replace(entry.key, png(130))
  set({ applications: [], scannedAt: 'later' })
  await service.scanApplications()
  entry = (await service.state()).applications[0]
  assert.equal(entry.source, 'custom')
})

test('多个服务并发登记和替换不会丢失索引条目', async t => {
  const { service, root } = await setup(t)
  const other = new ApplicationIconService({ root })
  await Promise.all([service.register([{ ...fixture, id: 'one' }]), other.register([{ ...fixture, id: 'two' }])])
  const state = await service.state()
  assert.equal(state.applications.length, 2)
  await Promise.all(state.applications.map((entry, i) => (i ? other : service).replace(entry.key, png(160 + i))))
  assert.ok((await service.state()).applications.every(entry => entry.source === 'custom'))
})
