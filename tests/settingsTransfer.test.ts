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
import { randomUUID } from 'node:crypto'
import { atomicWrite } from '../src/main/storage/localState.ts'
import { settingsDifferences } from '../src/core/settingsDifferences.ts'

const application: Application = { id: 'local-id', name: '本机音乐', path: 'C:\\Apps\\Music\\Music.exe', processes: ['Music.exe'], category: '音乐娱乐', mode: 'rule', source: 'scan' }
const snapshot = (): SettingsSnapshot => ({ app: 'AppRoute', kind: 'approute-settings', version: 1, createdAt: '2026-11-12T00:00:00Z', applications: [{ name: '导入音乐', path: application.path, category: '音乐娱乐', mode: 'direct', favorite: true }], language: 'fr' })

test('失效路径重绑拒绝已管理目标和临时应用，既有路径仍有效时不替换', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-rebind-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root }), moved = { ...application, id: 'new', path: 'C:\\Moved\\Music.exe' }
  routing.applyAutomatically = async () => { assert.fail('binding must not apply routing') }
  let oldExists = false
  const service = new SettingsTransferService(routing, async () => [moved], async file => file === application.path ? oldExists : true)
  const old = { ...application, mode: 'direct' as const, processPaths: [application.path!] }
  const other = { ...moved, mode: 'direct' as const, processPaths: [moved.path!] }
  await routing.save({ revision: 'first', managed: [old, other] })
  const preview = await service.previewMissingPaths()
  const conflict = await service.bind({ token: preview.token, key: '0', candidate: preview.candidates[0].key })
  assert.equal(conflict.rows[0].available, false); assert.match(conflict.rows[0].reason!, /目标应用已有分流/)
  await routing.save({ revision: 'temporary', managed: [{ ...old, temporary: { id: randomUUID(), expiresAt: new Date(Date.now() + 60000).toISOString(), previous: { mode: 'rule' } } }] })
  const timed = await service.previewMissingPaths()
  const blocked = await service.bind({ token: timed.token, key: '0', candidate: timed.candidates[0].key })
  assert.equal(blocked.rows[0].available, false); assert.match(blocked.rows[0].reason!, /先结束临时/)
  await routing.save({ revision: 'available', managed: [old] })
  const stale = await service.previewMissingPaths(); oldExists = true
  const returned = await service.bind({ token: stale.token, key: '0', candidate: stale.candidates[0].key })
  assert.equal(returned.rows[0].available, false); assert.match(returned.rows[0].reason!, /原程序路径仍可用/)
})

test('导入差异只包含实际变化，历史规则与缺省收藏保留当前资料', () => {
  const current = { ...snapshot().applications[0], mode: 'rule' as const, favorite: false }
  assert.deepEqual(settingsDifferences(current, snapshot().applications[0]).map(item => item.field), ['mode', 'favorite'])
  assert.deepEqual(settingsDifferences(current, { ...current, favorite: undefined }), [])
  assert.deepEqual(settingsDifferences(current, { ...snapshot().applications[0], name: 'ignored', category: 'ignored' }, 'routing').map(item => item.field), ['mode'])
})

test('人工绑定只更新预览，拒绝任意路径、重复目标、共享宿主与旧预览，应用时重新核对路径', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-binding-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root }), host = { ...application, id: 'host', path: 'C:\\Windows\\System32\\control.exe', processes: ['control.exe'] }
  let exists = true, requests = 0
  routing.applyAutomatically = async () => { requests++; assert.fail('preview and metadata import cannot apply routing') }
  const service = new SettingsTransferService(routing, async () => [application, host], async () => exists)
  await service.inventory.write({ version: 1, applications: [application], favorites: [] })
  const original = await fs.readFile(path.join(root, 'inventory.json'), 'utf8')
  const data = snapshot(); data.applications[0].path = 'D:\\OldComputer\\Music.exe'
  const preview = await service.preview(data)
  assert.equal(preview.rows[0].available, false); assert.equal(preview.rows[0].canBind, true)
  assert.equal(preview.candidates.length, 1); assert.equal(preview.candidates[0].path, application.path)
  await assert.rejects(service.bind({ token: preview.token, key: '0', candidate: application.path! }), /本机候选/)
  const bound = await service.bind({ token: preview.token, key: '0', candidate: preview.candidates[0].key })
  assert.equal(bound.rows[0].localPath, application.path); assert.equal(bound.rows[0].manualBinding, true)
  assert.equal(bound.rows[0].path, data.applications[0].path, 'source path stays visible separately')
  assert.equal(requests, 0); assert.equal(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'), original)
  assert.equal(await fs.access(routing.statePath).then(() => true, () => false), false)
  await assert.rejects(service.bind({ token: preview.token, key: '0', candidate: preview.candidates[0].key }), /预览已过期/)
  exists = false
  await assert.rejects(service.import({ token: bound.token, keys: ['0'], applyRouting: false, restoreLanguage: false, restoreStrategy: false }), /路径已失效/)
  exists = true
  const result = await service.import({ token: bound.token, keys: ['0'], applyRouting: false, restoreLanguage: false, restoreStrategy: false })
  assert.equal(result.imported, 1); assert.equal(requests, 0)
  const saved = await service.inventory.read(); assert.equal(saved.applications[0].path, application.path); assert.equal(saved.applications[0].id, application.id)
  const routingPreview = await service.preview(data)
  const routingBound = await service.bind({ token: routingPreview.token, key: '0', candidate: routingPreview.candidates[0].key })
  routing.applyAutomatically = async request => {
    requests++; assert.equal(request.applications.length, 1)
    assert.equal(request.applications[0].path, application.path)
    assert.equal(request.applications[0].id, application.id)
    assert.equal(request.applications[0].processPaths, undefined, 'helpers must be rebuilt by the routing service')
    return { outcome: 'applied', message: 'fixture', status: { connected: true, revision: 'fixture', choices: [], managed: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: 'fixture' } }
  }
  assert.equal((await service.import({ token: routingBound.token, keys: ['0'], applyRouting: true, restoreLanguage: false, restoreStrategy: false })).routingApplied, true)
  assert.equal(requests, 1, 'routing is invoked only after explicit import confirmation')
  const duplicates = snapshot(); duplicates.applications.push({ ...duplicates.applications[0], path: 'D:\\Other\\Music.exe' })
  const duplicatePreview = await service.preview(duplicates)
  await assert.rejects(service.bind({ token: duplicatePreview.token, key: '1', candidate: duplicatePreview.candidates[0].key }), /其他导入项目/)
  const stale = await service.preview(data)
  await service.language.write('ja')
  await assert.rejects(service.bind({ token: stale.token, key: '0', candidate: stale.candidates[0].key }), /设置已变化/)
})

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

test('分流历史预览保留当前资料和收藏，待确认记录不可恢复或删除', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-history-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const service = new SettingsTransferService(new RoutingService({ root }), async () => [application], async () => true)
  const favorite = application.path!.toLowerCase()
  await service.inventory.write({ version: 1, applications: [{ ...application, name: '当前自定义名称', category: '当前分类' }], favorites: [favorite] })
  const state = { version: 1, revision: 'old', managed: [{ id: application.id, name: '旧名称', processes: application.processes, processPaths: [application.path], mode: 'direct' }] }
  const id = `state/${Date.now()}-${randomUUID()}.json`
  await atomicWrite(path.join(root, 'backups', id), JSON.stringify(state))
  const backup = await service.backups.read(id)
  assert.equal(backup.snapshot.scope, 'routing'); assert.equal(backup.snapshot.applications[0].favorite, undefined)
  const preview = await service.preview(backup.snapshot)
  await service.import({ token: preview.token, keys: ['0'], applyRouting: false, restoreStrategy: false, restoreLanguage: false })
  const inventory = await service.inventory.read()
  assert.equal(inventory.applications[0].name, '当前自定义名称'); assert.equal(inventory.applications[0].category, '当前分类')
  assert.deepEqual(inventory.favorites, [favorite])
  await atomicWrite(path.join(root, 'backups', id), JSON.stringify({ ...state, pendingId: 'pending-fixture' }))
  const pending = await service.backups.read(id)
  assert.equal(pending.restorable, false)
  await assert.rejects(service.backups.remove(id, pending.fingerprint), /未完成事务/)
})
