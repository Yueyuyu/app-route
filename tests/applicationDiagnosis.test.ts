import assert from 'node:assert/strict'
import test from 'node:test'
import { diagnoseApplication, diagnosisFingerprint, groupConnectionSamples } from '../src/core/applicationDiagnosis.ts'
import type { Application } from '../src/shared/application.ts'
import type { IntegrationStatus } from '../src/shared/integration.ts'
import { translate } from '../src/shared/i18n/index.ts'

const app: Application = { id: 'fixture', name: 'Fixture', path: 'C:\\Demo\\Fixture.exe', processes: ['Fixture.exe'], mode: 'direct', source: 'manual', category: '其他应用' }
const running = [{ path: app.path!, pid: 1, parentPid: 0 }]
const status: IntegrationStatus = { connected: true, revision: 'v1', managed: [{ ...app, processPaths: [app.path!] }], choices: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: 'fixture' }
test('单应用诊断区分离线、未运行、未观测、规则冲突和符合设置，不改传入设置', () => {
  const original = JSON.stringify(status)
  assert.equal(diagnoseApplication(app, undefined, running).checks[0].state, 'fail')
  assert.match(diagnoseApplication(app, status, []).next, /打开该应用/)
  assert.match(diagnoseApplication(app, status, undefined).next, /读取运行状态/)
  assert.equal(diagnoseApplication(app, status, running).checks[3].state, 'wait')
  const evidence = [{ applicationId: app.id, process: 'Fixture.exe', destination: 'example.invalid', outbound: 'DIRECT', matched: false, startedAt: new Date().toISOString() }]
  assert.equal(diagnoseApplication(app, { ...status, evidence }, running).checks[4].state, 'fail')
  assert.equal(diagnoseApplication(app, { ...status, evidence: [{ ...evidence[0], matched: true }] }, running).checks[4].state, 'pass')
  assert.equal(diagnoseApplication(app, { ...status, connected: false, evidence }, running).checks[4].state, 'wait')
  assert.equal(diagnoseApplication(app, { ...status, evidence: [{ ...evidence[0], matched: true, usesCurrentNode: false }] }, running).checks[4].state, 'wait')
  assert.equal(JSON.stringify(status), original)
  assert.notEqual(diagnosisFingerprint(status), diagnosisFingerprint({ ...status, revision: 'v2' }))
})
test('连接聚合只合并同一组件目标出口与匹配状态，不能合并掉异常', () => {
  const row = { applicationId: app.id, process: 'Fixture.exe', destination: 'example.invalid', outbound: 'DIRECT', matched: true, startedAt: '2026-01-01T00:00:00Z' }
  const grouped = groupConnectionSamples([row, { ...row, startedAt: '2026-01-01T00:01:00Z' }, { ...row, matched: false }, { ...row, outbound: 'Node' }])
  assert.equal(grouped.length, 3)
  assert.equal(grouped[0].sample.matched, false)
  assert.equal(grouped.find(item => item.count === 2)?.latestStartedAt, '2026-01-01T00:01:00Z')
  assert.equal(groupConnectionSamples([{ ...row, currentRuleMatched: true }, { ...row, currentRuleMatched: false }]).length, 2)
})

test('临时期限到达后诊断不能把旧连接通过解释成已恢复，旧报告随期限变为过期', () => {
  const future = { ...status, managed: [{ ...status.managed[0], temporary: { id: 'test-lease', expiresAt: new Date(Date.now() + 60000).toISOString(), previous: { mode: 'rule' as const } } }], evidence: [{ applicationId: app.id, process: 'Fixture.exe', destination: 'example.invalid', outbound: 'DIRECT', matched: true, startedAt: new Date().toISOString() }] }
  const expired = { ...future, managed: [{ ...future.managed[0], temporary: { ...future.managed[0].temporary, expiresAt: new Date(Date.now() - 1000).toISOString() } }] }
  const report = diagnoseApplication(app, expired, running)
  assert.equal(report.checks[2].state, 'wait'); assert.equal(report.checks[4].state, 'wait')
  assert.match(report.next, /临时期限已到/)
  assert.notEqual(diagnosisFingerprint(future, app.id), diagnosisFingerprint(expired, app.id))
  for (const locale of ['en', 'ja', 'fr'] as const) assert.notEqual(translate(locale, report.next), report.next)
})
test('管理记录缺失或损坏不能被单应用诊断解释成沿用原规则', () => {
  for (const problem of [{ dataIssue: true }, { untrackedRuleCount: 121 }]) {
    const broken = { ...status, managed: [], ...problem }
    const result = diagnoseApplication(app, broken, running)
    assert.equal(result.checks[2].state, 'fail')
    assert.equal(result.checks[4].state, 'wait')
    assert.match(result.next, /缺少管理记录/)
    assert.notEqual(result.fingerprint, diagnosisFingerprint({ ...status, managed: [] }))
  }
})
test('单应用诊断按全量统计发现样本外异常，并区分代理组的真实出口', () => {
  const evidence = [{ applicationId: app.id, process: 'Fixture.exe', destination: 'example.invalid', outbound: 'Node ← Group', matched: true, startedAt: '2026-01-01T00:00:00Z' }]
  const observations = { [app.id]: { observedAt: '2026-01-01T00:01:00Z', latestStartedAt: evidence[0].startedAt, connectionCount: 129, matchedCount: 128, processes: ['Fixture.exe'], allUseOldNode: false } }
  assert.equal(diagnoseApplication(app, { ...status, evidence, observations }, running).checks[4].state, 'fail')
  assert.notEqual(diagnosisFingerprint({ ...status, evidence }, app.id), diagnosisFingerprint({ ...status, evidence, observations }, app.id), 'a previously passing report becomes stale when a mismatched connection appears')
  const proxy = { ...status, evidence, managed: [{ ...status.managed[0], mode: 'proxy' as const, target: 'Group' }] }
  assert.equal(diagnoseApplication(app, proxy, running).checks[4].state, 'wait', 'unknown outlet is never verified')
  for (const [kind, health, expected] of [['direct', 'unknown', 'wait'], ['reject', 'unknown', 'fail'], ['missing', 'unknown', 'fail'], ['unknown', 'unknown', 'wait'], ['proxy', 'unhealthy', 'wait'], ['proxy', 'unknown', 'pass']] as const) {
    const result = diagnoseApplication(app, { ...proxy, outlets: { Group: { target: 'Group', kind, health, chain: [], node: 'Node' } } }, running)
    assert.equal(result.checks[4].state, expected, kind + '/' + health)
    if (kind === 'direct') assert.match(result.next, /DIRECT/)
  }
  const pending = diagnoseApplication(app, { ...status, evidence, pending: { id: 'trial', deadline: 1 } }, running)
  assert.equal(pending.checks[2].state, 'wait')
  assert.equal(pending.checks[4].state, 'wait')
  assert.equal(diagnoseApplication(app, { ...status, evidence, rulesLoaded: false }, running).checks[4].state, 'wait')
})
test('动态诊断步骤、解释和建议在三种外语中均有译文', () => {
  const situations = [undefined, status, { ...status, dataIssue: true, managed: [] }, { ...status, pending: { id: 'trial', deadline: 1 } }, { ...status, rulesLoaded: false }]
  for (const situation of situations) for (const locale of ['en', 'ja', 'fr'] as const) {
    const report = diagnoseApplication(app, situation, running)
    for (const text of [report.next, ...report.checks.flatMap(item => [item.name, item.detail])]) assert.notEqual(translate(locale, text), text, locale + ': ' + text)
  }
})
