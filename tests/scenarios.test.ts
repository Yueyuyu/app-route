import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { SettingsScenarios } from '../src/main/services/settingsScenarios.ts'
import { SettingsTransferService } from '../src/main/services/settingsTransfer.ts'
import { RoutingService } from '../src/main/services/routingService.ts'
import type { Application } from '../src/shared/application.ts'

const app: Application = { id: 'music', name: '音乐', category: '音乐娱乐', path: 'C:\\Apps\\Music\\Music.exe', processes: ['Music.exe'], mode: 'rule', source: 'scan' }
async function fixture(t: any) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-scenarios-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root })
  routing.applyAutomatically = async () => { assert.fail('保存、预览或删除方案不能写入网络') }
  const settings = new SettingsTransferService(routing, async () => [app], async () => true)
  await settings.inventory.write({ version: 1, applications: [app], favorites: [app.path!.toLowerCase()] })
  return { root, routing, settings, scenarios: new SettingsScenarios(settings) }
}
test('方案保存只保留所选联网方式，重建服务后预览且默认不恢复语言或代理策略', async t => {
  const f = await fixture(t), draft = await f.scenarios.prepare()
  const inventory = await fs.readFile(path.join(f.root, 'inventory.json'), 'utf8')
  const saved = await f.scenarios.save({ token: draft.token, name: '工作', choices: [{ key: '0', mode: 'direct' }] })
  const recreated = new SettingsScenarios(f.settings), list = await recreated.list()
  assert.equal(list.items[0].name, '工作'); assert.equal(list.items[0].count, 1)
  const preview = await recreated.preview(saved.id, saved.fingerprint)
  assert.equal(preview.rows[0].mode, 'direct'); assert.equal(preview.rows[0].currentMode, 'rule')
  assert.deepEqual(preview.rows[0].differences.map(item => item.field), ['mode'])
  assert.equal(preview.language, undefined); assert.equal(preview.proxyStrategy, undefined)
  assert.equal(preview.rows[0].favorite, undefined)
  assert.equal(await fs.readFile(path.join(f.root, 'inventory.json'), 'utf8'), inventory)
  assert.equal(await fs.access(f.routing.statePath).then(() => true, () => false), false)
  await recreated.remove(saved.id, saved.fingerprint)
  assert.equal((await recreated.list()).items.length, 0)
})
test('方案拒绝过期来源、伪造条目、重复名称、临时状态及内容变化后的删除', async t => {
  const f = await fixture(t), draft = await f.scenarios.prepare()
  const request = { token: draft.token, name: '工作', choices: [{ key: '0', mode: 'direct' as const }] }
  await assert.rejects(f.scenarios.save({ ...request, choices: [{ key: '../other', mode: 'direct' }] }), /无效应用/)
  await assert.rejects(f.scenarios.save({ ...request, choices: [request.choices[0], request.choices[0]] }), /1 至 100/)
  await f.settings.inventory.write({ ...await f.settings.inventory.read(), favorites: [] })
  await assert.rejects(f.scenarios.save(request), /设置已变化/)
  const next = await f.scenarios.prepare(), saved = await f.scenarios.save({ ...request, token: next.token })
  await assert.rejects(f.scenarios.save({ ...request, token: next.token }), /编辑已过期/)
  const duplicate = await f.scenarios.prepare()
  await assert.rejects(f.scenarios.save({ ...request, token: duplicate.token }), /名称已存在/)
  await assert.rejects(f.scenarios.preview('../state', saved.fingerprint), /编号无效/)
  await assert.rejects(f.scenarios.remove(saved.id, 'old'), /已变化/)
  const file = path.join(f.scenarios.folder, saved.id + '.json'), record = JSON.parse(await fs.readFile(file, 'utf8'))
  record.version = 99; await fs.writeFile(file, JSON.stringify(record))
  assert.equal((await f.scenarios.list()).unreadable, 1)
  await assert.rejects(f.scenarios.remove(saved.id, saved.fingerprint))
  const state = await f.routing.state()
  await f.routing.save({ ...state, managed: [{ ...app, mode: 'direct', processPaths: [app.path!], temporary: { id: '11111111-1111-1111-1111-111111111111', expiresAt: new Date(Date.now() + 60000).toISOString(), previous: { mode: 'rule' } } }] })
  const temporary = await f.scenarios.prepare()
  assert.equal(temporary.rows[0].temporary, true)
  await assert.rejects(f.scenarios.save({ ...request, token: temporary.token, name: '临时' }), /临时设置/)
})
