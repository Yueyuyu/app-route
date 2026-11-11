import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import test, { type TestContext } from 'node:test'
import YAML from 'yaml'
import vm from 'node:vm'
import { RoutingService, type ServiceOptions } from '../src/main/services/routingService.ts'
import { MihomoRuntime, type RuntimeConfig, type RuntimeConnection, type RuntimeRule } from '../src/main/adapters/mihomoRuntime.ts'
import { atomicWrite, fileStamp, readOptional, writeIfUnchanged } from '../src/main/storage/localState.ts'
import { markerKey, overrideScript, type ProxyInfo } from '../src/core/managedRouting.ts'
import { routingPresentation } from '../src/core/applicationInventory.ts'
import type { Application } from '../src/shared/application.ts'
import { identifyProcessFamily } from '../src/core/processFamily.ts'
import { strategyOwnership } from '../src/core/proxyStrategy.ts'
import type { ProxyStrategy } from '../src/shared/proxyStrategy.ts'

class MockRuntime extends MihomoRuntime {
  current: any
  failNextReload = false
  available = true
  activeConnections: RuntimeConnection[] = []
  reloadCount = 0
  proxyEntries: Record<string, ProxyInfo> = { DIRECT: { name: 'DIRECT', type: 'Direct' }, Group: { name: 'Group', type: 'Selector', all: ['Node'], now: 'Node' }, Node: { name: 'Node', type: 'Shadowsocks', udp: true } }
  constructor(config: any) { super('test'); this.current = structuredClone(config) }
  override async config(): Promise<RuntimeConfig> { if (!this.available) throw new Error('内核离线'); return this.current }
  override async version() { return { version: 'test' } }
  override async proxies() {
    const proxies = structuredClone(this.proxyEntries)
    const owned = this.current['proxy-groups']?.find((group: any) => group.name === strategyOwnership.name)
    if (owned) proxies[owned.name] = { name: owned.name, type: owned.type === 'fallback' ? 'Fallback' : 'URLTest', all: owned.proxies, now: owned.proxies[0] }
    return { proxies }
  }
  override async checkGroup() { return { Node: 10, Backup: 20 } }
  override async connections() { return { connections: this.activeConnections } }
  override async rules(): Promise<{ rules: RuntimeRule[] }> { return { rules: this.current.rules.map((r: string) => { const parts = r.split(','); const type = parts.shift()!; const proxy = parts.pop()!; return { type, payload: parts.join(','), proxy } }) } }
  override async reload(payload: string) { this.reloadCount++; if (!this.available || this.failNextReload) { this.failNextReload = false; throw new Error('模拟重载失败') }; this.current = YAML.parse(payload) }
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
test('管理记录缺失时识别仍在内核加载的历史规则，不能误报默认或持久化通过', async t => {
  const f = await fixture(t)
  const pending = await f.service.apply({ applications: [app], revision: 'initial' })
  await f.service.confirm(pending.pending!.id)
  const generated = structuredClone(f.runtime.current)
  await atomicWrite(path.join(f.party, 'work/config.yaml'), YAML.stringify(generated))
  await fs.unlink(f.service.statePath)
  const before = structuredClone(f.runtime.current)
  const status = await f.service.status()
  assert.equal(status.connected, true)
  assert.equal(status.untrackedRuleCount, 1)
  assert.equal(status.rulesLoaded, false)
  assert.equal(status.persistenceObserved, false)
  assert.match(status.warning!, /管理记录为空/)
  assert.equal(routingPresentation(app, status).label, '状态待核对')
  assert.deepEqual(f.runtime.current, before)
  // 内核恢复后即使磁盘生成文件还留有旧标记，也不能继续误报历史规则正在运行。
  f.runtime.current = structuredClone(f.config)
  assert.equal((await f.service.status()).untrackedRuleCount, 0)
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

test('复用解析仍读取当前配置，外部修改及文件删除必须使缓存失效', async t => {
  const f = await fixture(t)
  const first = await f.service.party.snapshot()
  first.config.rules.push('MATCH,REJECT')
  assert.deepEqual((await f.service.party.snapshot()).config.rules, f.config.rules)
  const stamp = await fileStamp([first.workPath])
  await atomicWrite(first.workPath, YAML.stringify({ ...f.config, rules: ['MATCH,DIRECT'] }))
  assert.notEqual(await fileStamp([first.workPath]), stamp)
  assert.deepEqual((await f.service.party.snapshot()).config.rules, ['MATCH,DIRECT'])
  await assert.rejects(f.service.party.assertSnapshot(first), /发生变化/)
  await fs.rm(first.workPath)
  assert.equal(await fileStamp([first.workPath]), undefined)
})

test('批量队列按路径区分同名程序；网络检查失败仍回退整批', async t => {
  const f = await fixture(t, { resolveFamily: async application => identifyProcessFamily(application, []), probe: async () => true })
  const second = { ...pathApp, id: 'second', path: 'C:\\Second\\Example.exe' }
  const result = await f.service.applyAutomatically({ applications: [pathApp, second], revision: 'initial' })
  assert.equal(result.outcome, 'applied')
  assert.equal(result.status.managed.length, 2)
  assert.equal(f.runtime.current.rules[1], 'PROCESS-PATH,C:\\Second\\Example.exe,DIRECT')
  let checks = 0
  f.service.options.probe = async () => ++checks <= 3
  const failed = await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }, { ...second, mode: 'proxy' }], target: 'Group', revision: result.status.revision })
  assert.equal(failed.outcome, 'restored')
  assert.ok(failed.status.managed.every(app => app.mode === 'direct'))
  assert.deepEqual(f.runtime.current.rules.slice(2), f.config.rules)
})

test('系统共享目录的新连接不会被当成应用辅助进程反复触发应用', async t => {
  const f = await fixture(t, { resolveFamily: async application => identifyProcessFamily(application, []), probe: async () => true })
  await f.service.applyAutomatically({ applications: [{ ...pathApp, path: 'C:\\Windows\\System32\\Example.exe' }], revision: 'initial' })
  f.runtime.activeConnections = [{ metadata: { process: 'system-host.exe', processPath: 'C:\\Windows\\System32\\system-host.exe' }, chains: ['DIRECT'], start: new Date().toISOString(), rule: 'Match', rulePayload: '' }]
  assert.deepEqual((await f.service.status()).uncoveredProcesses, [])
})

async function groupFixture(t: TestContext) {
  const f = await fixture(t, { resolveFamily: async application => identifyProcessFamily(application, []), probe: async () => true })
  f.config.proxies.push({ name: 'NodeTwo', type: 'ss' })
  f.config['proxy-groups'][0].proxies.push('NodeTwo', 'DIRECT')
  f.runtime.current = structuredClone(f.config)
  f.runtime.proxyEntries.NodeTwo = { name: 'NodeTwo', type: 'Shadowsocks' }
  f.runtime.proxyEntries.Group.all = ['Node', 'NodeTwo', 'DIRECT']
  await atomicWrite(path.join(f.party, 'work/config.yaml'), YAML.stringify(f.config))
  return f
}

test('统一绑定组，保留直连应用；成员切换无需重写规则，显示真实连接与当前选择', async t => {
  const f = await groupFixture(t)
  const direct = await f.service.applyAutomatically({ applications: [pathApp], revision: 'initial' })
  const proxyApp = { ...pathApp, id: 'proxy', path: 'C:\\ProxyApp\\Example.exe', mode: 'proxy' as const }
  const fixed = await f.service.applyAutomatically({ applications: [proxyApp], target: 'Node', revision: direct.status.revision })
  const result = await f.service.setProxyGroup({ target: 'Group', revision: fixed.status.revision })
  assert.equal(result.outcome, 'applied')
  assert.equal(result.status.proxyGroup, 'Group')
  assert.equal(result.status.groupChoices?.some(p => p.name === 'Group'), true, '包含 DIRECT 的手动组仍可跟随')
  assert.deepEqual(result.status.managed.find(a => a.id === app.id), direct.status.managed[0])
  assert.equal(result.status.managed.find(a => a.id === proxyApp.id)?.target, 'Group')
  const state = await f.service.state(), reloads = f.runtime.reloadCount, rules = structuredClone(f.runtime.current.rules)
  const start = new Date(Date.parse(state.appliedAt!) + 1000).toISOString()
  f.runtime.activeConnections = [{ metadata: { processPath: proxyApp.path, process: 'Example.exe' }, start, chains: ['Node', 'Group'], rule: 'ProcessPath', rulePayload: proxyApp.path }]
  f.runtime.proxyEntries.Group.now = 'NodeTwo'
  let status = await f.service.status()
  assert.equal(status.outlets?.Group.node, 'NodeTwo')
  assert.equal(status.evidence[0].matched, true)
  assert.equal(status.evidence[0].node, 'Node')
  assert.equal(status.evidence[0].usesCurrentNode, false)
  assert.equal(routingPresentation(proxyApp, status).label, '等待新节点连接')
  f.runtime.activeConnections.unshift({ ...f.runtime.activeConnections[0], chains: ['NodeTwo', 'Group'] })
  status = await f.service.status()
  assert.equal(status.evidence[0].usesCurrentNode, true)
  assert.equal(routingPresentation(proxyApp, status).label, '已验证新连接')
  assert.equal(f.runtime.reloadCount, reloads)
  assert.deepEqual(await f.service.state(), state)
  assert.deepEqual(f.runtime.current.rules, rules)
  // 重建客户端配置和服务实例仍保存组名，不把运行时 now 写成固定节点。
  const generated = vm.runInNewContext((await fs.readFile(f.service.party.scriptPath, 'utf8')) + '\nmain(config)', { config: structuredClone(f.config) })
  assert.ok(generated.rules.includes('PROCESS-PATH,C:\\ProxyApp\\Example.exe,Group'))
  assert.equal((await new RoutingService(f.service.options).status()).proxyGroup, 'Group')
  f.runtime.proxyEntries.Group.now = 'DIRECT'
  status = await f.service.status()
  assert.equal(routingPresentation(proxyApp, status).label, '代理组当前直连')
  delete f.runtime.proxyEntries.Group
  assert.equal((await f.service.status()).outlets?.Group.kind, 'missing')
})

test('首次绑定可保存默认组；断开后不展示缓存节点，过期操作不能换组', async t => {
  const f = await groupFixture(t)
  const result = await f.service.setProxyGroup({ target: 'Group', revision: 'initial' })
  assert.equal(result.outcome, 'applied')
  assert.equal(result.status.managed.length, 0)
  assert.deepEqual(f.runtime.current.rules, f.config.rules)
  assert.equal((await f.service.setProxyGroup({ target: 'Group', revision: 'initial' })).outcome, 'unchanged')
  f.runtime.available = false
  const offline = await f.service.status()
  assert.equal(offline.connected, false)
  assert.equal(offline.proxyGroup, 'Group')
  assert.equal(offline.outlets, undefined)
})

test('跟随组迁移网络检查失败，恢复旧固定出口和默认组；不修改组内选择', async t => {
  const f = await groupFixture(t)
  const fixed = await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }], target: 'Node', revision: 'initial' })
  let probes = 0
  f.service.options.probe = async () => ++probes <= 3
  const failed = await f.service.setProxyGroup({ target: 'Group', revision: fixed.status.revision })
  assert.equal(failed.outcome, 'restored')
  assert.equal(failed.status.proxyGroup, undefined)
  assert.deepEqual(failed.status.managed, fixed.status.managed)
  assert.equal(f.runtime.proxyEntries.Group.now, 'Node')
})

test('统一跟随不能只更新默认组而遗漏旧代理应用，也不能把节点当作组', async t => {
  const f = await groupFixture(t)
  const fixed = await f.service.applyAutomatically({ applications: [{ ...pathApp, mode: 'proxy' }], target: 'Node', revision: 'initial' })
  await assert.rejects(f.service.apply({ applications: [], target: 'Group', proxyGroup: 'Group', revision: fixed.status.revision }), /统一更新/)
  await assert.rejects(f.service.apply({ applications: [], target: 'Node', proxyGroup: 'Node', revision: fixed.status.revision }), /有效代理组/)
  assert.deepEqual((await f.service.state()).managed, fixed.status.managed)
})

const automaticStrategy: ProxyStrategy = { mode: 'fallback', nodes: ['Node', 'NodeTwo'], interval: 60, timeout: 5000, tolerance: 100 }

test('策略切换统一迁移代理应用，保留直连和原组；重建与独立恢复完整撤销', async t => {
  const f = await groupFixture(t)
  await f.service.applyAutomatically({ applications: [pathApp], revision: 'initial' })
  const proxy = { ...pathApp, id: 'proxy', path: 'C:\\ProxyApp\\Example.exe', mode: 'proxy' as const }
  await f.service.applyAutomatically({ applications: [proxy], target: 'Group', revision: (await f.service.state()).revision })
  const before = await f.service.state()
  for (const mode of ['fallback', 'url-test'] as const) {
    const result = await f.service.setProxyStrategy({ revision: (await f.service.state()).revision, strategy: { ...automaticStrategy, mode } })
    assert.equal(result.outcome, 'applied', result.message)
    assert.equal(result.status.strategyLoaded, true)
    assert.equal(result.status.proxyGroup, strategyOwnership.name)
    assert.deepEqual(result.status.managed.find(item => item.id === pathApp.id), before.managed.find(item => item.id === pathApp.id))
    assert.equal(result.status.managed.find(item => item.id === proxy.id)?.target, strategyOwnership.name)
    assert.deepEqual(f.runtime.current['proxy-groups'][0], f.config['proxy-groups'][0])
    const generated = vm.runInNewContext((await fs.readFile(f.service.party.scriptPath, 'utf8')) + '\nmain(config)', { config: structuredClone(f.config) })
    assert.equal(generated['proxy-groups'][1].type, mode)
    assert.ok(generated.rules.some((rule: string) => rule.endsWith(',' + strategyOwnership.name)))
  }
  const independent = new RoutingService(f.service.options)
  assert.equal((await independent.state()).proxyStrategy?.mode, 'url-test')
  const existing = await independent.setProxyStrategy({ revision: (await independent.state()).revision, strategy: { mode: 'existing', group: 'Group' } })
  assert.equal(existing.outcome, 'applied', existing.message)
  assert.deepEqual(f.runtime.current['proxy-groups'], f.config['proxy-groups'])
  assert.equal(existing.status.managed.find(item => item.id === proxy.id)?.target, 'Group')
  await independent.setProxyStrategy({ revision: existing.status.revision, strategy: automaticStrategy })
  // 模拟客户端用当前脚本重新生成工作配置，再执行独立恢复。
  const generated = vm.runInNewContext((await fs.readFile(independent.party.scriptPath, 'utf8')) + '\nmain(config)', { config: structuredClone(f.config) })
  await atomicWrite(path.join(f.party, 'work/config.yaml'), YAML.stringify(generated))
  assert.equal((await independent.recoverAll()).restored, true)
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal((await independent.state()).proxyStrategy, undefined)
})

test('新策略出口失败回退旧策略，过期提交与无效节点不修改配置', async t => {
  const f = await groupFixture(t)
  const first = await f.service.setProxyGroup({ target: 'Group', revision: 'initial' })
  const before = await f.service.state()
  const script = await readOptional(f.service.party.scriptPath)
  f.service.options.probe = async (_runtime, target) => target !== strategyOwnership.name
  const failed = await f.service.setProxyStrategy({ revision: before.revision, strategy: automaticStrategy })
  assert.equal(failed.outcome, 'restored', failed.message)
  assert.equal(failed.status.proxyGroup, 'Group')
  assert.deepEqual(failed.status.proxyStrategy, before.proxyStrategy)
  assert.equal(await readOptional(f.service.party.scriptPath), script)
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal((await f.service.setProxyStrategy({ revision: first.status.revision, strategy: automaticStrategy })).outcome, 'unchanged')
  f.service.options.probe = async () => true
  const invalid = await f.service.setProxyStrategy({ revision: (await f.service.state()).revision, strategy: { ...automaticStrategy, nodes: ['Node', 'DIRECT'] } })
  assert.equal(invalid.outcome, 'unchanged')
  assert.equal(await readOptional(f.service.party.scriptPath), script)
  assert.equal(f.runtime.proxyEntries.Group.now, 'Node')
})

test('专用组被同名配置占用或重载失败时保留原配置；守护到期恢复策略', async t => {
  const f = await groupFixture(t)
  f.runtime.failNextReload = true
  const failed = await f.service.setProxyStrategy({ revision: 'initial', strategy: automaticStrategy })
  assert.equal(failed.outcome, 'restored')
  assert.deepEqual(f.runtime.current, f.config)
  const pending = await f.service.apply({ revision: failed.status.revision, applications: [], target: strategyOwnership.name, proxyGroup: strategyOwnership.name, proxyStrategy: automaticStrategy })
  assert.ok(pending.pending)
  const independent = new RoutingService(f.service.options)
  await independent.rollback(pending.pending!.id)
  assert.deepEqual(f.runtime.current, f.config)
  assert.equal((await independent.state()).proxyStrategy, undefined)
  f.config['proxy-groups'].push({ name: strategyOwnership.name, type: 'select', proxies: ['Node'] })
  f.runtime.current = structuredClone(f.config)
  await atomicWrite(path.join(f.party, 'work/config.yaml'), YAML.stringify(f.config))
  const collision = await f.service.setProxyStrategy({ revision: (await f.service.state()).revision, strategy: automaticStrategy })
  assert.equal(collision.outcome, 'unchanged')
  assert.deepEqual(f.runtime.current, f.config)
})

test('运行中的原有组已漂移或校验期间外部改组时不重载覆盖', async t => {
  const f = await groupFixture(t)
  f.runtime.proxyEntries.Group.all = ['NodeTwo', 'Node']
  const drifted = await f.service.setProxyStrategy({ revision: 'initial', strategy: automaticStrategy })
  assert.equal(drifted.outcome, 'unchanged')
  assert.match(drifted.message, /代理组不一致/)
  assert.equal(f.runtime.reloadCount, 0)
  f.runtime.proxyEntries.Group.all = ['Node', 'NodeTwo', 'DIRECT']
  f.service.options.validate = async () => { f.runtime.proxyEntries.Group.all = ['NodeTwo', 'Node'] }
  const concurrent = await f.service.setProxyStrategy({ revision: 'initial', strategy: automaticStrategy })
  assert.equal(concurrent.outcome, 'unchanged')
  assert.match(concurrent.message, /配置发生变化/)
  assert.equal(f.runtime.reloadCount, 0)
})

test('旧出口已故障但候选节点可用时，仍可应用备用策略', async t => {
  const f = await groupFixture(t)
  f.service.options.probe = async (_runtime, target) => target === 'NodeTwo' || target === strategyOwnership.name
  const result = await f.service.setProxyStrategy({ revision: 'initial', strategy: automaticStrategy })
  assert.equal(result.outcome, 'applied', result.message)
  assert.equal(result.status.strategyLoaded, true)
})
