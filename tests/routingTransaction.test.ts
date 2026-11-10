import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import test, { type TestContext } from 'node:test'
import YAML from 'yaml'
import vm from 'node:vm'
import { RoutingService, type ServiceOptions } from '../src/main/services/routingService.ts'
import { MihomoRuntime, type RuntimeConfig, type RuntimeConnection, type RuntimeRule } from '../src/main/adapters/mihomoRuntime.ts'
import { atomicWrite, readOptional, writeIfUnchanged } from '../src/main/storage/localState.ts'
import { markerKey, overrideScript } from '../src/core/managedRouting.ts'
import type { Application } from '../src/shared/application.ts'
import { identifyProcessFamily } from '../src/core/processFamily.ts'

class MockRuntime extends MihomoRuntime {
  current: any
  failNextReload = false
  available = true
  activeConnections: RuntimeConnection[] = []
  constructor(config: any) { super('test'); this.current = structuredClone(config) }
  override async config(): Promise<RuntimeConfig> { if (!this.available) throw new Error('内核离线'); return this.current }
  override async version() { return { version: 'test' } }
  override async proxies() { return { proxies: { DIRECT: { name: 'DIRECT', type: 'Direct' }, Group: { name: 'Group', type: 'Selector', all: ['Node'], now: 'Node' }, Node: { name: 'Node', type: 'Shadowsocks', udp: true } } } }
  override async connections() { return { connections: this.activeConnections } }
  override async rules(): Promise<{ rules: RuntimeRule[] }> { return { rules: this.current.rules.map((r: string) => { const parts = r.split(','); const type = parts.shift()!; const proxy = parts.pop()!; return { type, payload: parts.join(','), proxy } }) } }
  override async reload(payload: string) { if (!this.available || this.failNextReload) { this.failNextReload = false; throw new Error('模拟重载失败') }; this.current = YAML.parse(payload) }
}

const app: Application = { id: 'test', name: '测试程序', processes: ['Example.exe'], category: '其他应用', source: 'manual', mode: 'direct' }
async function fixture(t: TestContext, overrides: ServiceOptions = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-test-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const party = path.join(directory, 'party'); const root = path.join(directory, 'data')
  const config = { mode: 'rule', 'mixed-port': 7890, 'find-process-mode': 'strict', proxies: [{ name: 'Node', type: 'ss' }], 'proxy-groups': [{ name: 'Group', type: 'select', proxies: ['Node'] }], rules: ['DOMAIN,existing.example,DIRECT', 'MATCH,Group'] }
  for (const [file, content] of Object.entries({ 'config.yaml': 'operationMode: standard\n', 'profile.yaml': 'current: sample\n', 'override.yaml': 'items:\n  - id: original\n    ext: js\n    type: local\n    global: true\n', 'override/original.js': '// user-owned\nfunction main(c){return c}\n', 'work/config.yaml': YAML.stringify(config) })) await atomicWrite(path.join(party, file), content)
  const runtime = new MockRuntime(config)
  let guardianStarted = false
  const service = new RoutingService({ root, partyRoot: party, runtime: async () => runtime, validate: async () => {}, installKit: async () => {}, guardian: async () => { guardianStarted = true }, ...overrides })
  return { service, runtime, config, party, guardianStarted: () => guardianStarted }
}

test('直连试运行、确认和恢复保留原有文件与规则', async t => {
  const f = await fixture(t)
  const original = await fs.readFile(path.join(f.party, 'override/original.js'), 'utf8')
  const status = await f.service.apply({ applications: [app], revision: 'initial' })
  assert.equal(f.guardianStarted(), true)
  assert.equal(status.rulesLoaded, true)
  assert.ok(status.pending)
  assert.equal(f.runtime.current.rules[0], 'PROCESS-NAME,Example.exe,DIRECT')
  await f.service.confirm(status.pending!.id)
  assert.equal((await f.service.state()).pendingId, undefined)
  assert.equal((await f.service.recoverAll()).restored, true)
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal(await fs.readFile(path.join(f.party, 'override/original.js'), 'utf8'), original)
})
test('重载失败自动回退，不把失败配置当作已应用', async t => {
  const f = await fixture(t); f.runtime.failNextReload = true
  await assert.rejects(f.service.apply({ applications: [app], revision: 'initial' }), /模拟重载失败/)
  assert.deepEqual(f.runtime.current, f.config)
  assert.deepEqual((await f.service.state()).managed, [])
})
test('守护进程启动失败时不应用任何规则', async t => {
  const f = await fixture(t, { guardian: async () => { throw new Error('guardian unavailable') } })
  await assert.rejects(f.service.apply({ applications: [app], revision: 'initial' }), /guardian/)
  assert.deepEqual(f.runtime.current, f.config)
})
test('过期确认会恢复上一轮设置；旧守护任务不会覆盖新操作', async t => {
  const f = await fixture(t, { trialMs: 5 })
  const status = await f.service.apply({ applications: [app], revision: 'initial' })
  await new Promise(resolve => setTimeout(resolve, 15))
  await assert.rejects(f.service.confirm(status.pending!.id), /超时/)
  const before = await f.service.state()
  await f.service.rollback(status.pending!.id)
  assert.deepEqual(await f.service.state(), before)
  assert.deepEqual(f.runtime.current, f.config)
})
test('重启及订阅刷新重新执行覆写；恢复使用当前订阅而非旧快照', async t => {
  const f = await fixture(t)
  const status = await f.service.apply({ applications: [{ ...app, mode: 'proxy' }], target: 'Group', revision: 'initial' })
  const script = await fs.readFile(f.service.party.scriptPath, 'utf8')
  const newConfig = { ...f.config, rules: ['DOMAIN,new.example,DIRECT', ...f.config.rules] }
  const generated = JSON.parse(JSON.stringify(vm.runInNewContext(script + '\nmain(config)', { config: newConfig }, { timeout: 500 })))
  assert.equal(generated.rules[0], 'PROCESS-NAME,Example.exe,Group')
  assert.ok(generated[markerKey])
  await atomicWrite(path.join(f.party, 'work/config.yaml'), YAML.stringify(generated))
  await f.service.rollback(status.pending!.id)
  assert.deepEqual(f.runtime.current.rules, ['DOMAIN,new.example,DIRECT', ...f.config.rules])
})
test('独立服务实例可恢复，内核离线仍先停用持久化规则', async t => {
  const f = await fixture(t)
  await f.service.apply({ applications: [app], revision: 'initial' })
  f.runtime.available = false
  const independent = new RoutingService(f.service.options)
  const result = await independent.recoverAll()
  assert.equal(result.restored, false)
  assert.equal(await readOptional(f.service.party.scriptPath), overrideScript([]))
  assert.deepEqual((await f.service.state()).managed, [])
})
test('并发外部写入被检测，不覆盖新配置', async t => {
  const f = await fixture(t)
  const file = path.join(f.party, 'override.yaml'); const old = await readOptional(file)
  await atomicWrite(file, 'items: []\n# changed\n')
  await assert.rejects(writeIfUnchanged(file, old, 'items: []\n'), /其他程序/)
  assert.equal(await readOptional(file), 'items: []\n# changed\n')
})

test('运行时规则与磁盘不一致时拒绝应用，不覆盖外部规则', async t => {
  const f = await fixture(t)
  f.runtime.current.rules.unshift('DOMAIN,external.example,DIRECT')
  await assert.rejects(f.service.apply({ applications: [app], revision: 'initial' }), /不一致/)
  assert.equal(f.runtime.current.rules[0], 'DOMAIN,external.example,DIRECT')
  assert.equal(f.guardianStarted(), false)
})

test('按现有规则仅移除所选应用，其他已管理应用和用户规则保留', async t => {
  const f = await fixture(t)
  const second = { ...app, id: 'other', processes: ['Other.exe'] }
  const first = await f.service.apply({ applications: [app, second], revision: 'initial' })
  await f.service.confirm(first.pending!.id)
  const next = await f.service.apply({ applications: [{ ...app, mode: 'rule' }], revision: (await f.service.state()).revision })
  assert.deepEqual(f.runtime.current.rules, ['PROCESS-NAME,Other.exe,DIRECT', ...f.config.rules])
  assert.equal(next.managed.length, 1)
})

test('历史事务记录损坏也不能阻止离线全部恢复', async t => {
  const f = await fixture(t)
  const status = await f.service.apply({ applications: [app], revision: 'initial' })
  await atomicWrite(f.service.transactionPath(status.pending!.id), 'damaged transaction')
  assert.equal((await f.service.recoverAll()).restored, true)
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal((await f.service.state()).pendingId, undefined)
})

const pathApp = { ...app, path: 'C:\\Apps\\Example\\Example.exe' }
const resolveFamily: NonNullable<ServiceOptions['resolveFamily']> = async application => identifyProcessFamily(application, [
  { pid: 1, parentPid: 0, path: pathApp.path }, { pid: 2, parentPid: 1, path: 'C:\\Apps\\Example\\web\\helper.exe' },
])
test('一键应用自动解析辅助进程、检查并保留；再次选择规则只移除本应用', async t => {
  const f = await fixture(t, { resolveFamily, probe: async () => true })
  const result = await f.service.applyAutomatically({ applications: [pathApp], revision: 'initial' })
  assert.equal(result.outcome, 'applied')
  assert.equal(result.status.pending, undefined)
  assert.equal(result.status.evidence.length, 0)
  assert.deepEqual(f.runtime.current.rules.slice(0, 2), ['PROCESS-PATH,C:\\Apps\\Example\\Example.exe,DIRECT', 'PROCESS-PATH,C:\\Apps\\Example\\web\\helper.exe,DIRECT'])
  assert.deepEqual(f.runtime.current.rules.slice(2), f.config.rules)
  const refreshed = new RoutingService(f.service.options)
  assert.equal((await refreshed.status()).managed[0].processPaths?.length, 2)
  const restored = await refreshed.applyAutomatically({ applications: [{ ...pathApp, mode: 'rule' }], revision: result.status.revision })
  assert.equal(restored.outcome, 'applied')
  assert.deepEqual(f.runtime.current.rules, f.config.rules)
})
test('自动网络检查回归时恢复全部原规则，失败状态不能假报成功', async t => {
  let count = 0
  const f = await fixture(t, { resolveFamily, probe: async () => ++count <= 2 })
  const result = await f.service.applyAutomatically({ applications: [pathApp], revision: 'initial' })
  assert.equal(result.outcome, 'restored')
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal(result.status.managed.length, 0)
  assert.equal(result.status.pending, undefined)
})
test('自动检查之前不接受示例、伪造路径扩张、失效出口和并发旧修订', async t => {
  const f = await fixture(t, { resolveFamily, probe: async () => true })
  assert.equal((await f.service.applyAutomatically({ applications: [{ ...pathApp, source: 'example' }], revision: 'initial' })).outcome, 'unchanged')
  assert.equal((await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }], target: 'Missing', revision: 'initial' })).outcome, 'unchanged')
  const result = await f.service.applyAutomatically({ applications: [{ ...pathApp, processPaths: ['C:\\Other\\Example.exe'] }], revision: 'initial' })
  assert.equal(result.outcome, 'applied')
  assert.ok(!result.status.managed[0].processPaths?.includes('C:\\Other\\Example.exe'))
  const stale = await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }], target: 'Group', revision: 'initial' })
  assert.equal(stale.outcome, 'unchanged')
  assert.equal(stale.status.managed[0].mode, 'direct')
})
test('路径覆写在模拟客户端重新生成后仍有效，目标消失时回到原规则', async t => {
  const f = await fixture(t, { resolveFamily, probe: async () => true })
  await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }], target: 'Group', revision: 'initial' })
  const script = await fs.readFile(f.service.party.scriptPath, 'utf8')
  const generated = vm.runInNewContext(script + '\nmain(config)', { config: structuredClone(f.config) })
  assert.equal(generated.rules[1], 'PROCESS-PATH,C:\\Apps\\Example\\web\\helper.exe,Group')
  const missing = vm.runInNewContext(script + '\nmain(config)', { config: { ...f.config, 'proxy-groups': [] } })
  assert.deepEqual(JSON.parse(JSON.stringify(missing.rules)), f.config.rules)
})

test('辅助进程遗漏会提示；只验证应用后的精确路径、规则和出口', async t => {
  const f = await fixture(t, { resolveFamily, probe: async () => true })
  const applied = await f.service.applyAutomatically({ applications: [pathApp], revision: 'initial' })
  const recent = new Date(Date.parse(applied.status.managed[0].appliedAt!) + 1000).toISOString()
  const connection = (processPath: string, patch: Partial<RuntimeConnection> = {}): RuntimeConnection => ({
    metadata: { processPath, process: path.win32.basename(processPath), host: 'music.example' },
    chains: ['DIRECT'], start: recent, rule: 'ProcessPath', rulePayload: processPath, ...patch,
  })
  f.runtime.activeConnections = [
    connection(pathApp.path, { start: '2000-01-01T00:00:00.000Z', chains: ['Node'], rule: 'DomainSuffix' }),
    connection('C:\\Apps\\Example\\web\\helper.exe'),
    connection('C:\\Other\\Example.exe'),
    connection('C:\\Apps\\Example\\late.exe', { rule: 'DomainSuffix', rulePayload: 'example' }),
  ]
  const status = await f.service.status()
  assert.equal(status.evidence.length, 1)
  assert.equal(status.evidence[0].process, 'helper.exe')
  assert.equal(status.evidence[0].matched, true)
  assert.deepEqual(status.uncoveredProcesses, [{ applicationId: pathApp.id, process: 'late.exe' }])
  f.runtime.activeConnections.push(connection(pathApp.path, { rule: 'DomainSuffix', rulePayload: 'example' }))
  assert.equal((await f.service.status()).evidence.at(-1)?.matched, false, '出口碰巧直连也不能冒充应用规则命中')
})

test('系统共享目录的新连接不会被当成应用辅助进程反复触发应用', async t => {
  const f = await fixture(t, { resolveFamily: async application => identifyProcessFamily(application, []), probe: async () => true })
  await f.service.applyAutomatically({ applications: [{ ...pathApp, path: 'C:\\Windows\\System32\\Example.exe' }], revision: 'initial' })
  f.runtime.activeConnections = [{ metadata: { process: 'system-host.exe', processPath: 'C:\\Windows\\System32\\system-host.exe' }, chains: ['DIRECT'], start: new Date().toISOString(), rule: 'Match', rulePayload: '' }]
  assert.deepEqual((await f.service.status()).uncoveredProcesses, [])
})
