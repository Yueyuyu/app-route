// 仅供文档截图与界面验收。无系统扫描、代理控制或网络请求，禁止加载真实分流服务。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installFixtureBoundary } from './fixtureBoundary.mjs'
const root = path.dirname(fileURLToPath(import.meta.url))
if (process.env.APPROUTE_TEST_SANDBOX !== root) throw new Error('演示后台必须运行在独立夹具中')
installFixtureBoundary(root)
fs.appendFileSync(path.join(root, 'backend-started'), process.pid + '\n')
process.on('exit', () => fs.writeFileSync(path.join(root, `backend-exited-${process.pid}`), 'true'))
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'))
const ids = ['chrome', 'firefox', 'telegram', 'discord', 'slack', 'spotify', 'steam', 'vscode']
const applications = ids.map((id, index) => {
  const item = catalog.applications.find(app => app.id === id)
  if (!item) throw new Error('Missing documentation icon: ' + id)
  return { id, name: item.name, processes: [item.processes[0]], path: `C:\\DemoApps\\${id}\\${item.processes[0]}`, category: item.category, mode: index === 0 ? 'rule' : index % 2 ? 'direct' : 'proxy', source: 'scan', icon: `/icons/apps/${id}.svg` }
})
// 发现时间仅用于隔离 UI；首次扫描数据与用户数据完全无关。
applications[0].discoveredAt = new Date(Date.now() - 3600000).toISOString()
applications[3].discoveredAt = new Date(Date.now() - 86400000).toISOString()
applications[1].discoveredAt = new Date(Date.now() - 8 * 86400000).toISOString()
const managed = applications.filter(app => app.mode !== 'rule').map(app => ({ ...app, processPaths: [app.path], target: app.mode === 'direct' ? 'DIRECT' : 'Demo group', appliedAt: '2026-11-11T04:00:00Z' }))
const status = { connected: true, version: 'v1.19.32', mode: 'rule', tun: false, revision: 'documentation-only', configurationFingerprint: 'demo-config-a',
  choices: [], groupChoices: [{ name: 'Demo group', type: 'Selector', current: 'Demo node A', udp: true }],
  proxyGroup: 'Demo group', proxyStrategy: { mode: 'existing', group: 'Demo group' }, strategyLoaded: true,
  strategyNodes: ['A', 'B', 'C'].map((letter, i) => ({ name: 'Demo node ' + letter, type: 'Shadowsocks', health: 'healthy', delay: 48 + i * 30 })),
  outlets: { 'Demo group': { target: 'Demo group', type: 'Selector', chain: ['Demo group', 'Demo node A'], node: 'Demo node A', kind: 'proxy', health: 'healthy', checkedAt: new Date().toISOString(), delay: 48 } },
  managed, rulesLoaded: true, evidence: Array.from({ length: 3 }, () => ({ applicationId: 'telegram', process: applications[2].processes[0], destination: 'example.com', outbound: 'Demo node A ← Demo group', routeChain: ['Demo group', 'Demo node A'], matched: true, currentRuleMatched: true, node: 'Demo node A', usesCurrentNode: true, startedAt: '2026-11-11T04:01:00Z' })),
  recoveryReady: true, recoveryPath: 'C:\\Demo\\AppRoute\\recovery\\Restore-Network.cmd', persistenceObserved: false,
  warning: '当前规则已加载，持久化尚未验证。首次登记后请正常退出并重新打开 Clash Party，再检查规则是否仍已加载。' }
const icons = { applications: applications.map(app => ({ key: app.id, applicationId: app.id, name: app.name, processes: app.processes, category: app.category, origin: 'scan', available: true, source: 'builtin', icon: app.icon, hasCustom: false, needsAttention: false, detail: '使用随软件附带的公共图标' })), scannedAt: '2026-11-11T04:00:00Z', scanWarnings: [] }
icons.applications.push({ ...icons.applications[0], key: 'manual', applicationId: 'manual', name: 'Demo portable tool', origin: 'manual', needsAttention: true })
icons.applications.push({ ...icons.applications[0], key: 'removed', applicationId: 'removed', name: 'Demo removed tool', available: false })
let inventory = { version: 1, applications, favorites: [applications[0].path.toLowerCase()] }
const temporaryOriginals = new Map()
let temporarySequence = 0
// 设置验收可注入真实资料/备份服务；注入模块只使用内存路由替身，禁止连接用户内核。
const settingsFixture = fs.existsSync(path.join(root, 'settings-fixture.mjs'))
  ? await import('./settings-fixture.mjs').then(module => module.createSettingsFixture(root, applications, status)) : undefined
process.on('message', async ({ id, action, body }) => {
  fs.appendFileSync(path.join(root, 'requests.jsonl'), JSON.stringify({ action }) + '\n')
  if (settingsFixture && (action.startsWith('settings.') || action.startsWith('inventory.') || action.startsWith('updates.'))) {
    try { process.send?.({ id, value: await settingsFixture(action, body) }) }
    catch (error) { process.send?.({ id, error: error.message }) }
    return
  }
  let value
  if (action === 'updates.status') value = { state: 'none' }
  else if (action === 'integration.temporary') {
    const app = status.managed.find(item => item.id === body.application.id)
    if (!app || body.revision !== status.revision) { process.send?.({ id, error: '临时设置已变化，请刷新后重试。' }); return }
    temporaryOriginals.set(app.id, { app: structuredClone(app), evidence: status.evidence.filter(item => item.applicationId === app.id) })
    const previous = { mode: app.mode, target: app.target }
    app.mode = body.application.mode; app.target = app.mode === 'direct' ? 'DIRECT' : status.proxyGroup
    app.temporary = { id: 'demo-temporary-' + ++temporarySequence, expiresAt: new Date(Date.now() + body.minutes * 60000).toISOString(), previous }
    status.evidence = status.evidence.filter(item => item.applicationId !== app.id)
    status.revision = app.temporary.id
    value = { outcome: 'applied', message: '临时分流已应用，新连接仍需验证。', status }
  }
  else if (action === 'integration.temporary-end') {
    const index = status.managed.findIndex(item => item.id === body.applicationId && item.temporary?.id === body.id)
    if (index < 0 || body.revision !== status.revision) { process.send?.({ id, error: '临时设置已变化，请刷新后重试。' }); return }
    const original = temporaryOriginals.get(body.applicationId)
    status.managed[index] = original.app
    status.evidence.push(...original.evidence.map(item => ({ ...item, startedAt: new Date().toISOString() })))
    temporaryOriginals.delete(body.applicationId)
    status.revision = 'demo-ended-' + ++temporarySequence
    value = { outcome: 'applied', message: '已结束临时分流，新连接仍需验证。', status }
  }
  else if (action === 'integration.history') value = { revision: status.revision, unreadable: 0, items: [
    { id: 'demo-latest', at: '2026-11-16T04:05:00Z', source: 'application', phase: 'confirmed', strategyChanged: false, changes: [{ id: 'telegram', name: 'Telegram', before: { mode: 'direct', processes: 1 }, after: { mode: 'proxy', target: 'Demo group', processes: 2 } }] },
    { id: 'demo-previous', at: '2026-11-16T03:00:00Z', source: 'import', phase: 'confirmed', strategyChanged: false, undoReason: '此后已有新修改，不能覆盖当前选择。', changes: [{ id: 'firefox', name: 'Mozilla Firefox', before: { mode: 'rule', processes: 0 }, after: { mode: 'direct', processes: 1 } }] },
  ] }
  else if (action === 'integration.undo') { process.send?.({ id, error: '设置已变化，请刷新操作记录。' }); return }
  else if (action === 'integration.status') {
    value = structuredClone(status)
    const scenarioPath = path.join(root, 'scenario.json')
    const scenario = fs.existsSync(scenarioPath) ? JSON.parse(fs.readFileSync(scenarioPath, 'utf8')) : {}
    if (scenario.offline) { value.connected = false; value.rulesLoaded = false }
    if (scenario.configuration) value.configurationFingerprint = scenario.configuration
    if (scenario.node) { value.outlets['Demo group'].node = scenario.node; value.outlets['Demo group'].chain = ['Demo group', scenario.node] }
    if (scenario.mismatch) value.evidence[0].matched = false
    if (scenario.untracked) { value.managed = []; value.untrackedRuleCount = 121; value.rulesLoaded = false }
    if (scenario.expired) for (const app of value.managed) if (app.temporary) app.temporary.expiresAt = new Date(Date.now() - 1000).toISOString()
    const observedAt = new Date().toISOString()
    value.observedAt = observedAt
    value.observations = { telegram: { observedAt, latestStartedAt: value.evidence[0]?.startedAt ?? observedAt, connectionCount: value.evidence.length, matchedCount: value.evidence.filter(item => item.matched).length, processes: value.evidence.length ? [applications[2].processes[0]] : [], allUseOldNode: false } }
  }
  else if (action === 'applications.scan') {
    // 首屏验收人为延迟扫描，核对缓存列表是否仍可使用；不会延迟其他 IPC。
    while (fs.existsSync(path.join(root, 'hold-scan'))) await new Promise(resolve => setTimeout(resolve, 20))
    value = { applications, scannedAt: '2026-11-11T04:00:00Z' }
    fs.writeFileSync(path.join(root, 'scan-completed'), 'true')
  }
  else if (action === 'integration.reconcile') value = undefined
  else if (action === 'applications.running') value = applications.slice(0, 4).map((app, i) => ({ path: app.path, pid: 100 + i, parentPid: 1 }))
  else if (action === 'inventory.read') value = inventory
  else if (action === 'inventory.write') { inventory = body; value = body }
  else if (['icons.state', 'icons.scan', 'icons.register'].includes(action)) value = icons
  else if (action === 'integration.diagnose') value = [{ name: 'Clash Party 控制连接', ok: true, detail: '已连接，当前模式 rule' }, { name: '独立离线恢复入口', ok: true, detail: '双击桌面的 AppRoute - Restore Network，无需联网即可恢复。' }]
  else { process.send?.({ id, error: '文档演示不执行网络操作。' }); return }
  process.send?.({ id, value })
})
process.on('disconnect', () => process.exit(0))
