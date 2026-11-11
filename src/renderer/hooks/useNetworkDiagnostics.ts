import { App } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DiagnosticCheck, IntegrationStatus } from '../../shared/integration'
import { diagnosticContextKey, diagnosticStaleReason } from '../../core/networkDiagnostics'
import { integrationRequest } from './useRoutingIntegration'
import { t } from '../i18n'

/** 侧栏与详情共用同一份只读自检结果，避免重复请求或展示两份不同报告。 */
export function useNetworkDiagnostics(status: IntegrationStatus | undefined, error: string, refresh: () => Promise<unknown>) {
  const { message } = App.useApp()
  const key = diagnosticContextKey(status, error)
  const [resumeCount, setResumeCount] = useState(0)
  // 上下文对象每次变化都更换身份；断开后重连到同一节点，也不能让旧报告重新变新。
  const context = useMemo(() => ({ key, resumeCount }), [key, resumeCount])
  const [report, setReport] = useState<{ checks: DiagnosticCheck[]; checkedAt: string; context: typeof context }>()
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 15000)
    window.addEventListener('focus', update)
    const unsubscribe = window.appRoute?.onResume?.(() => { setResumeCount(value => value + 1); update() })
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); unsubscribe?.() }
  }, [])
  async function run() {
    if (running.current) return false
    running.current = true; setBusy(true); setReport(undefined)
    try {
      const checks = await integrationRequest<DiagnosticCheck[]>('diagnose', {})
      const completed = Date.now()
      setNow(completed); setReport({ checks, checkedAt: new Date(completed).toISOString(), context })
      return true
    } catch (error) {
      void message.error(t(error instanceof Error ? error.message : '操作失败'))
      return false
    } finally {
      try { await refresh() } finally { running.current = false; setBusy(false) }
    }
  }
  return { checks: report?.checks ?? [], checkedAt: report?.checkedAt,
    staleReason: report ? diagnosticStaleReason(report.checkedAt, report.context === context, now) : undefined, busy, run }
}
export type NetworkDiagnostics = ReturnType<typeof useNetworkDiagnostics>
