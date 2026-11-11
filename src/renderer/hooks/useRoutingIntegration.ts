import { useCallback, useEffect, useRef, useState } from 'react'
import type { AutomaticApplyResult, IntegrationStatus } from '../../shared/integration.ts'
import type { Application, RouteMode } from '../../shared/application.ts'
import { RoutingQueue, type PendingRoute } from '../../core/routingQueue.ts'
import type { ProxyStrategy } from '../../shared/proxyStrategy.ts'

let token: string | undefined
export async function integrationRequest<T>(action: string, body?: unknown): Promise<T> {
  if (window.appRoute) return window.appRoute.request<T>(`integration.${action}` as import('../../shared/desktop').DesktopAction, body)
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
  const currentStatus = useRef<IntegrationStatus>(undefined)
  const [error, setError] = useState('')
  const [groupBusy, setGroupBusy] = useState(false)
  const strategyBusy = useRef(false)
  const [pendingRoutes, setPendingRoutes] = useState<Record<string, PendingRoute>>({})
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ sequence: number; type: 'success' | 'error'; text: string }>()
  const noticeSequence = useRef(0)
  const familyAttempts = useRef(new Set<string>())
  const requestSequence = useRef(0)
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const next = await integrationRequest<IntegrationStatus>('status')
      if (sequence === requestSequence.current) { currentStatus.current = next; setStatus(next); setError('') }
      return next
    } catch (error) {
      if (sequence === requestSequence.current) {
        setError(error instanceof Error ? error.message : '连接失败')
        currentStatus.current = undefined
        // 保留最后一次设置记录，但接口失联后不能继续显示绿色连接或允许应用。
        setStatus(previous => previous ? { ...previous, connected: false } : undefined)
      }
    }
  }, [])
  const queue = useRef<RoutingQueue>(undefined)
  queue.current ??= new RoutingQueue({
    onChange: setPendingRoutes,
    execute: async (applications, target) => {
      const current = currentStatus.current ?? await refresh()
      if (!current?.connected || current.pending) throw new Error('尚未连接或上一轮操作未确认，请检查恢复状态后重试。')
      setFailures(values => Object.fromEntries(Object.entries(values).filter(([id]) => !applications.some(app => app.id === id))))
      try {
        return await integrationRequest<AutomaticApplyResult>('apply-automatic', { revision: current.revision, target,
          applications: applications.map(({ icon: _icon, processPaths: _paths, processWarnings: _warnings, ...app }) => app) })
      } catch (error) { await refresh(); throw error }
    },
    onResult: result => {
      requestSequence.current++; currentStatus.current = result.status; setStatus(result.status)
      if (result.outcome === 'applied') setNotice({ sequence: ++noticeSequence.current, type: 'success', text: result.message })
    },
    onFailure: (text, intents) => {
      setFailures(current => ({ ...current, ...Object.fromEntries(intents.map(item => [item.application.id, text])) }))
      setNotice({ sequence: ++noticeSequence.current, type: 'error', text })
    },
  })
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => { window.clearInterval(timer); requestSequence.current++; queue.current?.cancelWaiting() } }, [refresh])
  function apply(applications: Application[], mode: RouteMode, target?: string) {
    if (strategyBusy.current) return
    setFailures(current => Object.fromEntries(Object.entries(current).filter(([id]) => !applications.some(app => app.id === id))))
    queue.current!.enqueue(applications, mode, target)
  }
  async function setProxyGroup(target: string) {
    return setProxyStrategy({ mode: 'existing', group: target })
  }
  async function setProxyStrategy(strategy: ProxyStrategy, expectedRevision?: string) {
    if (strategyBusy.current || Object.keys(queue.current!.snapshot()).length) throw new Error('请等待当前应用操作结束。')
    strategyBusy.current = true
    setGroupBusy(true)
    try {
      const current = await refresh()
      if (!current?.connected || current.pending) throw new Error('尚未连接或上一轮操作未确认，请检查恢复状态。')
      if (expectedRevision !== undefined && expectedRevision !== current.revision) throw new Error('设置已经变化，请关闭后重新打开代理策略。')
      const result = await integrationRequest<AutomaticApplyResult>('proxy-strategy', { strategy, revision: current.revision })
      requestSequence.current++; currentStatus.current = result.status; setStatus(result.status)
      if (result.outcome !== 'applied') throw new Error(result.message)
    } finally { await refresh(); strategyBusy.current = false; setGroupBusy(false) }
  }
  useEffect(() => {
    if (window.appRoute || groupBusy || !status?.connected || status.pending || Object.keys(queue.current!.snapshot()).length) return
    const missing = status.uncoveredProcesses ?? []
    const attemptKey = (id: string) => JSON.stringify([id, missing.filter(item => item.applicationId === id).map(item => item.process).sort()])
    const managed = status.managed.find(app => app.processPaths?.length && missing.some(item => item.applicationId === app.id) && !familyAttempts.current.has(attemptKey(app.id)))
    if (!managed) return
    familyAttempts.current.add(attemptKey(managed.id))
    // 只为已经选择了专属模式的应用补充身份；仍经同一后端校验、网络检查和恢复事务。
    apply([{ ...managed, path: managed.processPaths![0], source: 'scan', category: '已管理应用' }], managed.mode, managed.target)
  }, [status, groupBusy])
  return { status, error, refresh, apply, setProxyGroup, setProxyStrategy, groupBusy, busyIds: Object.keys(pendingRoutes), pendingRoutes, failures, notice }
}
