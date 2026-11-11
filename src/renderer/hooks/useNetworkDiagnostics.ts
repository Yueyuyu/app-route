import { App } from 'antd'
import { useRef, useState } from 'react'
import type { DiagnosticCheck } from '../../shared/integration'
import { integrationRequest } from './useRoutingIntegration'
import { t } from '../i18n'

/** 侧栏与详情共用同一份只读自检结果，避免重复请求或展示两份不同报告。 */
export function useNetworkDiagnostics(refresh: () => Promise<unknown>) {
  const { message } = App.useApp()
  const [checks, setChecks] = useState<DiagnosticCheck[]>([])
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  async function run() {
    if (running.current) return false
    running.current = true; setBusy(true); setChecks([])
    try {
      setChecks(await integrationRequest<DiagnosticCheck[]>('diagnose', {}))
      return true
    } catch (error) {
      void message.error(t(error instanceof Error ? error.message : '操作失败'))
      return false
    } finally {
      await refresh(); running.current = false; setBusy(false)
    }
  }
  return { checks, busy, run }
}
export type NetworkDiagnostics = ReturnType<typeof useNetworkDiagnostics>
