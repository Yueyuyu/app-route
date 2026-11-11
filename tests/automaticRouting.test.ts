import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { identifyProcessFamily, validProcessPath } from '../src/core/processFamily.ts'
import { addManagedRules, assertNoProcessOverlap, configuredProxySelections, managedApplications, managedProcessMatches, overrideScript } from '../src/core/managedRouting.ts'
import { inventoryWithRouting, migrateInventory, routingPresentation } from '../src/core/applicationInventory.ts'
import type { Application } from '../src/shared/application.ts'
import type { IntegrationStatus } from '../src/shared/integration.ts'
import { isDedicatedApplicationDirectory } from '../src/main/platform/windows/processFamily.ts'

const app: Application = { id: 'music', name: '音乐应用', path: 'C:\\Apps\\Music\\Music.exe', processes: ['Music.exe'], mode: 'direct', category: '音乐娱乐', source: 'scan' }
test('主程序与辅助程序扫描入口合并为同一分流行，保留主程序资料和全部匹配路径', () => {
  const helper = { ...app, id: 'helper', name: '辅助入口', path: 'C:\\Apps\\Music\\Helper.exe', processes: ['Helper.exe'] }
  const other = { ...app, id: 'other', name: '另一安装', path: 'D:\\Apps\\Music\\Music.exe' }
  const managed = { ...app, processes: ['Music.exe', 'Helper.exe'], processPaths: [app.path!, helper.path!] }
  const status: IntegrationStatus = { connected: true, revision: 'one', managed: [managed], choices: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: '' }
  for (const entries of [[helper, app, other], [app, helper, other]]) {
    const result = inventoryWithRouting(entries, status)
    assert.equal(result.length, 2)
    assert.equal(result[0].id, app.id)
    assert.equal(result[0].name, app.name)
    assert.equal(result[0].path, app.path)
    assert.deepEqual(result[0].processPaths, managed.processPaths)
    assert.equal(result[1].mode, 'rule')
  }
})
test('仅预识别应用独立目录，拒绝共享工具和用户文件目录', () => {
  assert.equal(isDedicatedApplicationDirectory('C:\\Apps\\QQMusic123\\QQMusic.exe'), true)
  assert.equal(isDedicatedApplicationDirectory('C:\\Tools\\QQMusic.exe'), false)
  assert.equal(isDedicatedApplicationDirectory('C:\\Users\\Example\\Desktop\\Music.exe'), false)
  assert.equal(isDedicatedApplicationDirectory('C:\\Windows\\System32\\cmd.exe'), false)
})
test('自动故障转移不误报出口变更，仍核对手动和固定选择', () => {
  const proxies = { Manual: { name: 'Manual', type: 'Selector', now: 'A' }, Auto: { name: 'Auto', type: 'Fallback', now: 'A' } }
  assert.equal(configuredProxySelections(proxies), configuredProxySelections({ ...proxies, Auto: { ...proxies.Auto, now: 'B' } }))
  assert.notEqual(configuredProxySelections(proxies), configuredProxySelections({ ...proxies, Manual: { ...proxies.Manual, now: 'B' } }))
  assert.notEqual(configuredProxySelections(proxies), configuredProxySelections({ ...proxies, Auto: { ...proxies.Auto, fixed: 'B' } }))
})
test('按父子关系和安装路径识别辅助进程，不接管同名或目录外程序', () => {
  const result = identifyProcessFamily(app, [
    { pid: 1, parentPid: 0, path: app.path! },
    { pid: 2, parentPid: 1, path: 'C:\\Apps\\Music\\Web\\browser.exe' },
    { pid: 3, parentPid: 2, path: 'C:\\Apps\\Music\\Web\\worker.exe' },
    { pid: 4, parentPid: 1, path: 'C:\\Apps\\Other\\browser.exe' },
    { pid: 5, parentPid: 0, path: 'C:\\Apps\\Music\\unrelated.exe' },
    { pid: 6, parentPid: 1, path: 'C:\\Apps\\MusicOther\\helper.exe' },
  ])
  assert.deepEqual(result.processes, ['Music.exe', 'browser.exe', 'worker.exe'])
  assert.equal(result.processPaths?.length, 3)
  assert.ok(result.processWarnings?.some(value => value.includes('目录外')))
  assert.equal(validProcessPath('C:\\Apps\\Music\\..\\Other\\browser.exe'), false)
  assert.equal(validProcessPath('C:\\Apps\\Music\\x.exe,DIRECT'), false)
})
test('路径规则与客户端覆写一致；区分同名程序、拒绝保护通道和交叉匹配', () => {
  const resolved = identifyProcessFamily(app, [])
  const managed = managedApplications([resolved])
  const config = { rules: ['MATCH,DIRECT'] }
  assert.equal(addManagedRules(config, managed).rules[0], 'PROCESS-PATH,C:\\Apps\\Music\\Music.exe,DIRECT')
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(overrideScript(managed) + '\nmain(config)', { config }))), addManagedRules(config, managed))
  assert.equal(managedProcessMatches(managed[0], { process: 'Music.exe', processPath: 'C:\\Other\\Music.exe' }), false)
  assert.equal(managedProcessMatches(managed[0], { processPath: 'c:\\apps\\music\\music.exe' }), true)
  assert.throws(() => managedApplications([{ ...resolved, processes: ['node.exe'], processPaths: ['C:\\Apps\\Music\\node.exe'] }]), /保护|修复/)
  assert.doesNotThrow(() => assertNoProcessOverlap([...managed, { ...managed[0], id: 'other', processPaths: ['C:\\Other\\Music.exe'] }]))
  assert.throws(() => assertNoProcessOverlap([...managed, { ...managed[0], id: 'manual', processPaths: undefined }]), /其他/)
})
test('不重放旧示例和草稿；加载成功与连接验证分开，刷新跟随后台恢复结果', () => {
  const inventory = migrateInventory({ applications: [{ ...app, source: 'example' }, { ...app, id: 'real', mode: 'proxy' }] })
  assert.equal(inventory.length, 1)
  assert.equal(inventory[0].mode, 'rule')
  const status: IntegrationStatus = { connected: true, revision: 'one', managed: [{ ...app, id: 'real' }], choices: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: '' }
  const view = inventoryWithRouting(inventory, status)
  assert.equal(view[0].mode, 'direct')
  assert.equal(routingPresentation(view[0], status).label, '等待应用联网')
  assert.equal(routingPresentation(view[0], status).color, 'blue')
  assert.equal(routingPresentation(view[0], { ...status, connected: false }).color, 'default')
  status.evidence = [{ applicationId: 'real', process: 'Music.exe', destination: 'music.example', outbound: 'DIRECT', matched: true, startedAt: new Date().toISOString() }]
  assert.equal(routingPresentation(view[0], status).label, '已验证新连接')
  assert.equal(routingPresentation(view[0], status).color, 'success')
  status.evidence[0].matched = false
  assert.equal(routingPresentation(view[0], status).label, '连接不符合设置')
  assert.equal(routingPresentation(view[0], status).color, 'error')
  status.managed = []
  assert.equal(inventoryWithRouting(inventory, status)[0].mode, 'rule')
})
