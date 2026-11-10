import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationIconState } from '../../shared/applicationIcon'
import type { Application, ApplicationScanResult } from '../../shared/application'
import { inferCategory } from '../types'
import { migrateInventory } from '../../core/applicationInventory'

const storageKey = 'approute.inventory.v1'
function readInventory() {
  try { return migrateInventory(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem('approute.draft.v1') ?? 'null')) } catch { return [] }
}
export function useApplicationInventory() {
  const [applications, setApplications] = useState<Application[]>(readInventory)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState(false)
  const pending = useRef<Promise<void> | undefined>(undefined)
  const scan = useCallback(() => {
    if (pending.current) return pending.current
    setLoading(true); setError('')
    pending.current = (async () => {
      try {
        const response = await fetch('/api/applications', { headers: { 'X-AppRoute-UI': '1' } })
        const result = await response.json() as ApplicationScanResult & { error?: string }
        if (!response.ok) throw new Error(result.error ?? '读取本机应用失败')
        setApplications(current => {
          const scanned = result.applications.map(app => ({ ...app, category: inferCategory(app.name), mode: 'rule' as const }))
          return [...scanned, ...current.filter(app => app.source === 'manual' && !scanned.some(item => item.id === app.id || (item.path && item.path.toLowerCase() === app.path?.toLowerCase())))]
        })
      } catch (e) { setError(e instanceof Error ? e.message : '读取本机应用失败，已保留缓存列表') }
      finally { setLoading(false); pending.current = undefined }
    })()
    return pending.current
  }, [])
  useEffect(() => { void scan() }, [scan])
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, applications })); setSaveError(false) } catch { setSaveError(true) }
  }, [applications])
  const syncIcons = useCallback((state: ApplicationIconState) => {
    const urls = new Map(state.applications.map(app => [app.applicationId, app.icon]))
    setApplications(current => {
      let changed = false
      const next = current.map(app => { const icon = urls.get(app.id); if (!icon || icon === app.icon) return app; changed = true; return { ...app, icon } })
      return changed ? next : current
    })
  }, [])
  return { applications, loading, error, saveError, scan, syncIcons,
    saveApplication: (app: Application) => setApplications(current => [...current.filter(item => item.id !== app.id), { ...app, mode: 'rule' }]),
    removeApplication: (id: string) => setApplications(current => current.filter(app => app.id !== id)) }
}
