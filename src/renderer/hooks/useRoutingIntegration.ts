import { useCallback, useEffect, useRef, useState } from 'react'
import type { IntegrationStatus } from '../../shared/integration.ts'

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
  const requestSequence = useRef(0)
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const next = await integrationRequest<IntegrationStatus>('status')
      if (sequence === requestSequence.current) { setStatus(next); setError('') }
    } catch (error) { if (sequence === requestSequence.current) setError(error instanceof Error ? error.message : '连接失败') }
  }, [])
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => { window.clearInterval(timer); requestSequence.current++ } }, [refresh])
  return { status, error, refresh }
}
