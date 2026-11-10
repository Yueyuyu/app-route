import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Application } from '../../shared/application'
import type { ApplicationIconState } from '../../shared/applicationIcon'

let session: string | undefined
async function iconRequest(action: string, body?: unknown): Promise<ApplicationIconState> {
  if (window.appRoute) return window.appRoute.request(`icons.${action}` as import('../../shared/desktop').DesktopAction, body)
  if (body !== undefined && !session) {
    const response = await fetch('/api/icons/session', { headers: { 'X-AppRoute-UI': '1' } })
    if (!response.ok) throw new Error('无法建立图标管理会话，请刷新页面。')
    session = (await response.json()).session
  }
  const response = await fetch(`/api/icons/${action}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-AppRoute-UI': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-AppRoute-Session': session ?? '' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const result = await response.json()
  if (response.status === 403) session = undefined
  if (!response.ok) throw new Error(result.error ?? '图标操作失败')
  return result
}

interface IconContextValue {
  state?: ApplicationIconState; error: string; busy: boolean; failedImages: string[]
  refresh: () => Promise<void>; scan: () => Promise<void>
  replace: (key: string, data: string) => Promise<void>; reset: (key: string) => Promise<void>
  reportFailure: (url: string) => void
}
const IconContext = createContext<IconContextValue | undefined>(undefined)
export const useApplicationIcons = () => useContext(IconContext)

export function ApplicationIconsProvider({ applications, children, onResolved }: { applications: Application[]; children: ReactNode; onResolved: (state: ApplicationIconState) => void }) {
  const [state, setState] = useState<ApplicationIconState>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [failedImages, setFailedImages] = useState<string[]>([])
  const sequence = useRef(0)
  useEffect(() => { if (state) onResolved(state) }, [state, onResolved])
  const refresh = useCallback(async () => {
    const current = ++sequence.current
    try { const result = await iconRequest('state'); if (current === sequence.current) { setState(result); setError('') } }
    catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : '图标读取失败') }
  }, [])
  // 草稿中的模式变化不触发图标写入；旧 data URL 首次登记后可迁移到本机缓存。
  const identities = JSON.stringify(applications.map(({ id, name, processes, category, source, icon }) => ({ id, name, processes, category, source, ...(icon?.startsWith('data:image/png;base64,') ? { icon } : {}) })))
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const items = JSON.parse(identities) as Application[]
        for (let i = 0; i < items.length; i += 20) await iconRequest('register', { applications: items.slice(i, i + 20) })
        if (active) await refresh()
      } catch (e) { if (active) setError(e instanceof Error ? e.message : '图标登记失败') }
    })()
    return () => { active = false }
  }, [identities, refresh])
  async function mutate(action: string, body: unknown) {
    setBusy(true); setError(''); const current = ++sequence.current
    try { const result = await iconRequest(action, body); if (current === sequence.current) { setState(result); setFailedImages([]) } }
    catch (e) { setError(e instanceof Error ? e.message : '图标操作失败'); throw e }
    finally { setBusy(false) }
  }
  const reportFailure = useCallback((url: string) => setFailedImages(current => current.includes(url) ? current : [...current, url]), [])
  return <IconContext.Provider value={{ state, error, busy, failedImages, refresh, reportFailure,
    scan: () => mutate('scan', {}), replace: (key, data) => mutate('replace', { key, data }), reset: key => mutate('reset', { key }) }}>{children}</IconContext.Provider>
}
