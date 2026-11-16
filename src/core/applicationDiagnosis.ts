import type { Application } from '../shared/application.ts'
import type { RunningApplicationProcess } from '../shared/desktop.ts'
import type { ConnectionEvidence, IntegrationStatus } from '../shared/integration.ts'
import { managedFor, routingPresentation } from './applicationInventory.ts'
import { isRunningApplication } from './applicationViews.ts'

export interface ApplicationDiagnosis {
  checkedAt: string
  fingerprint: string
  checks: { name: string; state: 'pass' | 'wait' | 'fail'; detail: string }[]
  next: string
}
export function diagnosisFingerprint(status?: IntegrationStatus, applicationId?: string) {
  const observed = applicationId ? status?.observations?.[applicationId] : undefined
  const samples = status?.evidence.filter(item => item.applicationId === applicationId) ?? []
  const count = observed?.connectionCount ?? samples.length
  const connectionState = [count > 0, observed ? observed.matchedCount < count : samples.some(item => !item.matched), observed?.allUseOldNode ?? (count > 0 && samples.every(item => item.usesCurrentNode === false))]
  return JSON.stringify([status?.connected, status?.revision, status?.configurationFingerprint, status?.rulesLoaded, status?.dataIssue, status?.untrackedRuleCount, status?.pending?.id,
    connectionState, Object.values(status?.outlets ?? {}).map(item => [item.target, item.node, item.kind, item.health]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))])
}
/** 只解释已读取的数据，不发起探测流量、不启动应用、不重放规则。 */
export function diagnoseApplication(app: Application, status?: IntegrationStatus, running?: RunningApplicationProcess[]): ApplicationDiagnosis {
  const managed = managedFor(app, status?.managed)
  const evidence = status?.evidence.filter(item => item.applicationId === managed?.id) ?? []
  const observation = status?.observations?.[managed?.id ?? '']
  const count = observation?.connectionCount ?? evidence.length
  const mismatch = observation ? observation.matchedCount < count : evidence.some(item => !item.matched)
  const old = observation?.allUseOldNode ?? (count > 0 && evidence.every(item => item.usesCurrentNode === false))
  const active = running === undefined ? undefined : isRunningApplication(app, running)
  const integrityIssue = Boolean(status?.dataIssue || status?.untrackedRuleCount)
  const presentation = routingPresentation(app, status)
  const outlet = managed?.mode === 'proxy' ? status?.outlets?.[managed.target ?? ''] : undefined
  const outletUnconfirmed = managed?.mode === 'proxy' && (!outlet || ['direct', 'reject', 'missing', 'unknown'].includes(outlet.kind) || outlet.health === 'unhealthy')
  const outletDetail = outlet ? presentation.detail : '当前出口不可用或尚未确认，请检查 Clash Party 的组内选择或网络自检。'
  const ruleState = !status?.connected || status.pending ? 'wait' : integrityIssue || (managed && !status.rulesLoaded) ? 'fail' : 'pass'
  const ruleDetail = !status?.connected ? '规则尚未确认，请查看连接详情。' : integrityIssue ? presentation.detail : status.pending ? '当前修改仍在检查，请等待确认或恢复。' : !managed ? '当前沿用 Clash Party 原有规则。' : status.rulesLoaded ? '已确认 AppRoute 专属规则加载。' : '规则尚未确认，请查看连接详情。'
  const contextUnconfirmed = !status?.connected || integrityIssue || status.pending || (managed && !status.rulesLoaded)
  const routeState = contextUnconfirmed ? 'wait' : outlet?.kind === 'missing' || outlet?.kind === 'reject' || mismatch ? 'fail' : outletUnconfirmed || !count || old ? 'wait' : 'pass'
  const routeDetail = contextUnconfirmed ? '等待新连接后再核对出口。' : outletUnconfirmed ? outletDetail : mismatch ? '存在不符合当前设置的连接，请核对规则。' : !count ? '等待新连接后再核对出口。' : old ? '仍有旧节点连接，请在应用内重新连接后检查。' : '已观察连接符合设置，其余组件仍待观察。'
  const checks: ApplicationDiagnosis['checks'] = [
    { name: '内核连接', state: status?.connected ? 'pass' : 'fail', detail: status?.connected ? '控制接口可读取，不代表所有节点可用。' : '请启动 Clash Party，并检查控制接口连接。' },
    { name: '应用运行', state: active ? 'pass' : 'wait', detail: active === undefined ? '暂时无法读取运行状态，请重试。' : active ? '已找到主程序或已识别的辅助进程。' : '请打开该应用，并让它建立新连接。' },
    { name: '应用规则', state: ruleState, detail: ruleDetail },
    { name: '连接观察', state: status?.connected && count ? 'pass' : 'wait', detail: status?.connected && count ? '已观察到进入内核的新连接。' : '尚未观察到新连接；未进入 Clash 的流量无法在此验证。' },
    { name: '实际出口', state: routeState, detail: routeDetail },
  ]
  const next = !status?.connected ? checks[0].detail : integrityIssue || status.pending || !managed || !status.rulesLoaded ? ruleDetail : outletUnconfirmed || mismatch ? routeDetail : active === undefined || !active ? checks[1].detail : !count ? '请在应用内重新播放或刷新，再检查；无需先恢复全部分流。' : routeDetail
  return { checkedAt: new Date().toISOString(), fingerprint: diagnosisFingerprint(status, managed?.id), checks, next }
}

export function groupConnectionSamples(evidence: ConnectionEvidence[]) {
  const groups = new Map<string, { key: string; sample: ConnectionEvidence; count: number; latestStartedAt: string }>()
  for (const item of evidence) {
    const key = JSON.stringify([item.process, item.destination, item.outbound, item.routeChain, item.matched, item.currentRuleMatched, item.usesCurrentNode])
    const previous = groups.get(key)
    if (previous) { previous.count++; if (Date.parse(item.startedAt) > Date.parse(previous.latestStartedAt)) previous.latestStartedAt = item.startedAt }
    else groups.set(key, { key, sample: item, count: 1, latestStartedAt: item.startedAt })
  }
  return [...groups.values()].sort((a, b) => Number(a.sample.matched) - Number(b.sample.matched) || Date.parse(b.latestStartedAt) - Date.parse(a.latestStartedAt))
}
