// 仅供文档截图与界面验收。无系统扫描、代理控制或网络请求，禁止加载真实分流服务。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'))
const ids = ['chrome', 'firefox', 'telegram', 'discord', 'slack', 'spotify', 'steam', 'vscode']
const applications = ids.map((id, index) => {
  const item = catalog.applications.find(app => app.id === id)
  if (!item) throw new Error('Missing documentation icon: ' + id)
  return { id, name: item.name, processes: [item.processes[0]], path: `C:\\DemoApps\\${id}\\${item.processes[0]}`, category: item.category, mode: index === 0 ? 'rule' : index % 2 ? 'direct' : 'proxy', source: 'scan', icon: `/icons/apps/${id}.svg` }
})
const managed = applications.filter(app => app.mode !== 'rule').map(app => ({ ...app, processPaths: [app.path], target: app.mode === 'direct' ? 'DIRECT' : 'Demo group', appliedAt: '2026-11-11T04:00:00Z' }))
const status = { connected: true, version: 'v1.19.32', mode: 'rule', tun: false, revision: 'documentation-only', configurationFingerprint: 'demo-config-a',
  choices: [], groupChoices: [{ name: 'Demo group', type: 'Selector', current: 'Demo node A', udp: true }],
  proxyGroup: 'Demo group', proxyStrategy: { mode: 'existing', group: 'Demo group' }, strategyLoaded: true,
  strategyNodes: ['A', 'B', 'C'].map((letter, i) => ({ name: 'Demo node ' + letter, type: 'Shadowsocks', health: 'healthy', delay: 48 + i * 30 })),
  outlets: { 'Demo group': { target: 'Demo group', type: 'Selector', chain: ['Demo group', 'Demo node A'], node: 'Demo node A', kind: 'proxy', health: 'healthy', checkedAt: new Date().toISOString(), delay: 48 } },
  managed, rulesLoaded: true, evidence: [{ applicationId: 'telegram', process: applications[2].processes[0], destination: 'example.com', outbound: 'Demo group', matched: true, node: 'Demo node A', usesCurrentNode: true, startedAt: '2026-11-11T04:01:00Z' }],
  recoveryReady: true, recoveryPath: 'C:\\Demo\\AppRoute\\recovery\\Restore-Network.cmd', persistenceObserved: false,
  warning: '当前规则已加载，持久化尚未验证。首次登记后请正常退出并重新打开 Clash Party，再检查规则是否仍已加载。' }
const icons = { applications: applications.map(app => ({ key: app.id, applicationId: app.id, name: app.name, processes: app.processes, category: app.category, origin: 'scan', available: true, source: 'builtin', icon: app.icon, hasCustom: false, needsAttention: false, detail: '使用随软件附带的公共图标' })), scannedAt: '2026-11-11T04:00:00Z', scanWarnings: [] }
let inventory = { version: 1, applications, favorites: [applications[0].path.toLowerCase()] }
// 设置验收可注入真实资料/备份服务；注入模块只使用内存路由替身，禁止连接用户内核。
const settingsFixture = fs.existsSync(path.join(root, 'settings-fixture.mjs'))
  ? await import('./settings-fixture.mjs').then(module => module.createSettingsFixture(root, applications, status)) : undefined
process.on('message', async ({ id, action, body }) => {
  fs.appendFileSync(path.join(root, 'requests.jsonl'), JSON.stringify({ action }) + '\n')
  if (settingsFixture && (action.startsWith('settings.') || action.startsWith('inventory.'))) {
    try { process.send?.({ id, value: await settingsFixture(action, body) }) }
    catch (error) { process.send?.({ id, error: error.message }) }
    return
  }
  let value
  if (action === 'integration.status') {
    value = structuredClone(status)
    const scenarioPath = path.join(root, 'scenario.json')
    const scenario = fs.existsSync(scenarioPath) ? JSON.parse(fs.readFileSync(scenarioPath, 'utf8')) : {}
    if (scenario.offline) { value.connected = false; value.rulesLoaded = false }
    if (scenario.configuration) value.configurationFingerprint = scenario.configuration
    if (scenario.node) { value.outlets['Demo group'].node = scenario.node; value.outlets['Demo group'].chain = ['Demo group', scenario.node] }
  }
  else if (action === 'applications.scan') value = { applications, scannedAt: '2026-11-11T04:00:00Z' }
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
