import type { NetworkDiagnostics } from '../hooks/useNetworkDiagnostics'
import { formatDateTime, t } from '../i18n'

export function DiagnosticReportTime({ diagnostics }: { diagnostics: NetworkDiagnostics }) {
  if (!diagnostics.checkedAt) return null
  return <div className={`diagnostic-report-time${diagnostics.staleReason ? ' is-stale' : ''}`}>
    <span>{t('上次自检 · {0}', [formatDateTime(diagnostics.checkedAt)])}</span>
    {diagnostics.staleReason && <span role="status">{t(diagnostics.staleReason === 'changed' ? '连接或配置已变化，请重新检查' : '结果已过期，请重新检查')}</span>}
  </div>
}
