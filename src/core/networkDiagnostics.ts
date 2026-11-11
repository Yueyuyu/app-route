import type { IntegrationStatus } from '../shared/integration.ts'

/** 自检只代表检测时刻；五分钟后或连接上下文变化后，报告只能作为历史记录。 */
export const diagnosticFreshnessMs = 5 * 60 * 1000
export function diagnosticContextKey(status?: IntegrationStatus, error = ''): string {
  return JSON.stringify({ connected: status?.connected ?? false, error: Boolean(error), version: status?.version,
    mode: status?.mode, tun: status?.tun, revision: status?.revision, configuration: status?.configurationFingerprint, group: status?.proxyGroup,
    rulesLoaded: status?.rulesLoaded, pending: status?.pending?.id, recoveryRequired: status?.pending?.recoveryRequired,
    recoveryReady: status?.recoveryReady, dataIssue: status?.dataIssue,
    outlets: Object.entries(status?.outlets ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, outlet]) => [name, outlet.kind, outlet.node, outlet.chain]) })
}
export function diagnosticStaleReason(checkedAt: string, sameContext: boolean, now: number): 'changed' | 'expired' | undefined {
  if (!sameContext) return 'changed'
  const age = now - Date.parse(checkedAt)
  if (!Number.isFinite(age) || age < 0 || age >= diagnosticFreshnessMs) return 'expired'
}
