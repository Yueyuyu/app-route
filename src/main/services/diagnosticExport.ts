import type { IntegrationStatus } from '../../shared/integration.ts'
/** 白名单组装，不能把原始状态/错误直接序列化给导出文件。 */
export function diagnosticExport(status: IntegrationStatus) {
  return { format: 'approute-diagnostics-v1', generatedAt: new Date().toISOString(),
    connection: { connected: status.connected, mode: ['rule', 'global', 'direct'].includes(status.mode ?? '') ? status.mode : 'unknown', tun: status.tun === true },
    routing: { managedCount: status.managed.length, directCount: status.managed.filter(a => a.mode === 'direct').length, proxyCount: status.managed.filter(a => a.mode === 'proxy').length,
      rulesLoaded: status.rulesLoaded, persistenceObserved: status.persistenceObserved === true, untrackedRuleCount: status.untrackedRuleCount ?? 0,
      evidenceCount: status.evidence.length, mismatchCount: status.evidence.filter(item => !item.matched).length, dataIssue: status.dataIssue === true },
    recovery: { ready: status.recoveryReady, pending: Boolean(status.pending), recoveryRequired: status.pending?.recoveryRequired === true },
    timings: (status.timings ?? []).filter(entry => ['应用扫描', '进程识别', '网络基线', '配置校验', '恢复工具', '规则写入', '内核重载', '网络复查'].includes(entry.phase)).map(({ phase, durationMs, ok }) => ({ phase, durationMs, ok })) }
}
