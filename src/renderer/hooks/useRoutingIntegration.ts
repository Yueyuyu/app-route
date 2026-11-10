import { useCallback, useEffect, useRef, useState } from 'react'
import type { AutomaticApplyResult, IntegrationStatus } from '../../shared/integration.ts'
import type { Application, RouteMode } from '../../shared/application.ts'

let token: string | undefined
export async function integrationRequest<T>(action: string, body?: unknown): Promise<T> {
  if (body !== undefined && !token) {
    const result = await fetch('/api/integration/session', { headers: { 'X-AppRoute-UI': '1' } }).then(res => res.json())
    token = result.session
  }
  const response = await fetch(`/api/integration/${action}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'X-AppRoute-UI': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-AppRoute-Session': token ?? '' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = await response.json()
  if (response.status === 403) token = undefined
  if (!response.ok) throw new Error(result.error ?? '操作失败')
  return result as T
}

export function useRoutingIntegration() {
  const [status, setStatus] = useState<IntegrationStatus>()
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [failures, setFailures] = useState<Record<string, string>>({})
  const busy = useRef(false)
  const familyAttempts = useRef(new Set<string>())
  const requestSequence = useRef(0)
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const next = await integrationRequest<IntegrationStatus>('status')
      if (sequence === requestSequence.current) { setStatus(next); setError('') }
      return next
    } catch (error) { if (sequence === requestSequence.current) setError(error instanceof Error ? error.message : '连接失败') }
  }, [])
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => { window.clearInterval(timer); requestSequence.current++ } }, [refresh])
  async function apply(applications: Application[], mode: RouteMode, target?: string) {
    if (busy.current) throw new Error('正在检查上一项设置，请稍后重试。')
    busy.current = true; setBusyIds(applications.map(app => app.id))
    setFailures(current => Object.fromEntries(Object.entries(current).filter(([id]) => !applications.some(app => app.id === id))))
    try {
      const current = await refresh()
      if (!current?.connected) throw new Error('尚未连接 Clash Party，设置未修改。')
      const result = await integrationRequest<AutomaticApplyResult>('apply-automatic', { revision: current.revision, target,
        applications: applications.map(({ icon: _icon, processPaths: _paths, processWarnings: _warnings, ...app }) => ({ ...app, mode })) })
      requestSequence.current++; setStatus(result.status)
      if (result.outcome !== 'applied') throw new Error(result.message)
      return result
    } catch (e) {
      const text = e instanceof Error ? e.message : '请求中断，请等待独立恢复并检查状态。'
      setFailures(current => ({ ...current, ...Object.fromEntries(applications.map(app => [app.id, text])) }))
      throw e
    } finally { busy.current = false; setBusyIds([]); await refresh() }
  }
  useEffect(() => {
    if (!status?.connected || status.pending || busy.current) return
    const missing = status.uncoveredProcesses ?? []
    const attemptKey = (id: string) => JSON.stringify([id, missing.filter(item => item.applicationId === id).map(item => item.process).sort()])
    const managed = status.managed.find(app => app.processPaths?.length && missing.some(item => item.applicationId === app.id) && !familyAttempts.current.has(attemptKey(app.id)))
    if (!managed) return
    familyAttempts.current.add(attemptKey(managed.id))
    // 只为已经选择了专属模式的应用补充身份；仍经同一后端校验、网络检查和恢复事务。
    void apply([{ ...managed, path: managed.processPaths![0], source: 'scan', category: '已管理应用' }], managed.mode, managed.target).catch(() => {})
  }, [status])
  return { status, error, refresh, apply, busyIds, failures }
}
