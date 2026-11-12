import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseSettingsText, parseSettingsSnapshot, settingsFileLimit } from '../src/core/settingsTransfer.ts'
import { SettingsTransferService } from '../src/main/services/settingsTransfer.ts'
import { RoutingService } from '../src/main/services/routingService.ts'
import { InventoryPreferencesStore } from '../src/main/services/inventoryPreferences.ts'
import type { SettingsSnapshot } from '../src/shared/settings.ts'
import type { Application } from '../src/shared/application.ts'

const application: Application = { id: 'local-id', name: '本机音乐', path: 'C:\\Apps\\Music\\Music.exe', processes: ['Music.exe'], category: '音乐娱乐', mode: 'rule', source: 'scan' }
const snapshot = (): SettingsSnapshot => ({ app: 'AppRoute', kind: 'approute-settings', version: 1, createdAt: '2026-11-12T00:00:00Z', applications: [{ name: '导入音乐', path: application.path, category: '音乐娱乐', mode: 'direct', favorite: true }], language: 'fr' })

test('设置文件拒绝未知版本、重复路径、路径注入、超大文件并兼容历史导出', () => {
  assert.throws(() => parseSettingsSnapshot({ ...snapshot(), version: 9 }))
  assert.throws(() => parseSettingsSnapshot({ ...snapshot(), applications: [...snapshot().applications, ...snapshot().applications] }))
  assert.throws(() => parseSettingsSnapshot({ ...snapshot(), applications: [{ ...snapshot().applications[0], path: 'C:\\Apps\\..\\Windows\\bad.exe' }] }))
  assert.throws(() => parseSettingsText('x'.repeat(settingsFileLimit + 1)))
  assert.throws(() => parseSettingsText('{broken'))
  const legacy = parseSettingsSnapshot({ app: 'AppRoute', kind: 'application-routing-snapshot', version: 1, exportedAt: '2026-11-12T00:00:00Z', applications: [{ ...application, id: 'untrusted', processPaths: ['C:\\Other\\Other.exe'], icon: 'data:ignored' }] })
  assert.equal(legacy.applications[0].mode, 'rule')
  assert.equal('processPaths' in legacy.applications[0], false)
  assert.equal('id' in legacy.applications[0], false)
})

test('导入只用本机身份，资料导入不写网络；旧缓存不能覆盖新资料', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-import-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root }), inventory = new InventoryPreferencesStore(root)
  await inventory.write({ version: 1, applications: [application], favorites: [] })
  const old = await inventory.read()
  routing.applyAutomatically = async () => { assert.fail('资料导入不能调用网络写入') }
  const service = new SettingsTransferService(routing, async () => [application], async () => true)
  const preview = await service.preview(snapshot())
  assert.equal(preview.rows[0].available, true)
  const result = await service.import({ token: preview.token, keys: ['0'], applyRouting: false, restoreStrategy: false, restoreLanguage: true })
  assert.equal(result.imported, 1); assert.equal(result.routingApplied, false); assert.deepEqual(result.warnings, [])
  const saved = await inventory.read()
  assert.equal(saved.applications[0].id, application.id)
  assert.equal(saved.applications[0].name, '导入音乐')
  assert.equal(saved.applications[0].mode, 'rule')
  assert.equal(saved.favorites.length, 1)
  assert.equal(await service.language.read(), 'fr')
  assert.equal(await fs.access(routing.statePath).then(() => true, () => false), false)
  await assert.rejects(inventory.write(old), /应用资料已变化/)
  const backup = await service.backups.read(result.backupId)
  assert.equal(backup.snapshot.applications[0].name, application.name)
  assert.equal(backup.snapshot.applications[0].favorite, false)
  await assert.rejects(service.import({ token: preview.token, keys: ['0'], applyRouting: false, restoreStrategy: false, restoreLanguage: false }), /预览已过期/)
})

test('路径缺失、共享宿主和预览后变更均不能偷偷写入', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-import-conflict-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root }), inventory = new InventoryPreferencesStore(root)
  const host = { ...application, id: 'system', path: 'C:\\Windows\\System32\\control.exe', processes: ['control.exe'] }
  const service = new SettingsTransferService(routing, async () => [application, host], async () => true)
  const document = snapshot()
  document.applications.push({ ...document.applications[0], path: 'C:\\Missing\\Unknown.exe' }, { ...document.applications[0], path: host.path })
  const preview = await service.preview(document)
  assert.deepEqual(preview.rows.map(row => row.available), [true, false, false])
  await assert.rejects(service.import({ token: preview.token, keys: ['1'], applyRouting: true, restoreStrategy: false, restoreLanguage: false }), /有效的导入项目/)
  await inventory.write({ version: 1, applications: [application], favorites: [] })
  await assert.rejects(service.import({ token: preview.token, keys: ['0'], applyRouting: true, restoreStrategy: false, restoreLanguage: false }), /设置已变化/)
  assert.equal(await fs.access(routing.statePath).then(() => true, () => false), false)
})

test('备份列表、过期删除、损坏文件与路径边界', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-backups-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const service = new SettingsTransferService(new RoutingService({ root }), async () => [], async () => false)
  const id = await service.backups.create(snapshot(), 'manual')
  const listed = await service.backups.list()
  assert.equal(listed[0].id, id); assert.equal(listed[0].valid, true)
  await assert.rejects(service.backups.read('../state.json'), /编号无效/)
  await assert.rejects(service.backups.remove(id, 'stale'), /备份已变化/)
  await fs.writeFile(path.join(root, 'backups', id), '{broken')
  assert.equal((await service.backups.list())[0].valid, false)
  await assert.rejects(service.backups.remove(id, listed[0].fingerprint))
  assert.equal(await fs.readFile(path.join(root, 'backups', id), 'utf8'), '{broken')
  const next = await service.backups.create(snapshot(), 'before-import')
  await service.backups.remove(next, (await service.backups.read(next)).fingerprint)
  await assert.rejects(service.backups.read(next))
})

test('导入期间新选择的语言保留，不被旧预览覆盖', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-import-language-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root })
  const service = new SettingsTransferService(routing, async () => [application], async () => true)
  routing.applyAutomatically = async () => {
    await service.language.write('en')
    return { outcome: 'applied', message: 'fixture', status: {} as any }
  }
  const preview = await service.preview(snapshot())
  const result = await service.import({ token: preview.token, keys: ['0'], applyRouting: true, restoreStrategy: false, restoreLanguage: true })
  assert.equal(result.routingApplied, true)
  assert.equal(result.warnings.length, 1)
  assert.equal(await service.language.read(), 'en')
})

test('链接备份目录不能读写或删除目录外文件', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-linked-backups-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const outside = path.join(root, 'outside'), profile = path.join(root, 'profile')
  await fs.mkdir(outside); await fs.mkdir(profile)
  await fs.symlink(outside, path.join(profile, 'backups'), process.platform === 'win32' ? 'junction' : 'dir')
  const service = new SettingsTransferService(new RoutingService({ root: profile }), async () => [], async () => false)
  await assert.rejects(service.backups.create(snapshot(), 'manual'), /安全读取/)
  await assert.rejects(service.backups.list(), /安全读取/)
  assert.deepEqual(await fs.readdir(outside), [])
})
