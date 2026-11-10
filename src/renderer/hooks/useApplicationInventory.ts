import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationIconState } from '../../shared/applicationIcon'
import type { Application, ApplicationScanResult } from '../../shared/application'
import type { InventoryPreferences, RunningApplicationProcess } from '../../shared/desktop'
import { inferCategory } from '../types'
import { migrateInventory } from '../../core/applicationInventory'
import { applicationKey, mergeScannedApplications } from '../../core/applicationViews'

const storageKey = 'approute.inventory.v1'
function readInventory() {
  try { return migrateInventory(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem('approute.draft.v1') ?? 'null')) } catch { return [] }
}
function readFavorites(): string[] {
  try { const value = JSON.parse(localStorage.getItem('approute.favorites.v1') ?? '[]'); return Array.isArray(value) ? value.filter(v => typeof v === 'string') : [] } catch { return [] }
}
export function useApplicationInventory() {
  const [applications, setApplications] = useState<Application[]>(() => window.appRoute ? [] : readInventory())
  const [favorites, setFavorites] = useState<string[]>(() => window.appRoute ? [] : readFavorites())
  const [ready, setReady] = useState(!window.appRoute)
  const [writable, setWritable] = useState(!window.appRoute)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [running, setRunning] = useState<RunningApplicationProcess[]>([])
  const [runningError, setRunningError] = useState('')
  const [scannedAt, setScannedAt] = useState('')
  const [newCount, setNewCount] = useState(0)
  const pending = useRef<Promise<void> | undefined>(undefined)
  const lastScan = useRef(0), saveChain = useRef(Promise.resolve())
  useEffect(() => {
    if (!window.appRoute) return
    let active = true
    void window.appRoute.request<InventoryPreferences>('inventory.read').then(value => {
      if (active) { setApplications(migrateInventory(value)); setFavorites(value.favorites); setWritable(true) }
    }).catch(() => { if (active) { setError('本机应用资料无法读取，已保留原文件；本次收藏暂时不能保存。'); setSaveError(true) } })
      .finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])
  const scan = useCallback((force = true) => {
    if (pending.current) return pending.current
    if (!force && Date.now() - lastScan.current < 60000) return Promise.resolve()
    lastScan.current = Date.now(); setLoading(true); setError('')
    pending.current = (async () => {
      try {
        let result: ApplicationScanResult
        if (window.appRoute) result = await window.appRoute.request('applications.scan', { force })
        else {
          const response = await fetch('/api/applications', { headers: { 'X-AppRoute-UI': '1' } })
          const value = await response.json()
          if (!response.ok) throw new Error(value.error ?? '读取本机应用失败')
          result = value
        }
        setApplications(current => {
          const scanned = result.applications.map(app => ({ ...app, category: inferCategory(app.name), mode: 'rule' as const }))
          const added = scanned.filter(app => !current.some(old => applicationKey(old) === applicationKey(app))).length
          setNewCount(current.length ? added : 0)
          return mergeScannedApplications(current, scanned)
        })
        setScannedAt(result.scannedAt)
      } catch (e) { setError(e instanceof Error ? e.message : '读取本机应用失败，已保留缓存列表') }
      finally { setLoading(false); pending.current = undefined }
    })()
    return pending.current
  }, [])
  const refreshRunning = useCallback(async () => {
    try {
      const result = window.appRoute ? await window.appRoute.request<RunningApplicationProcess[]>('applications.running') : await fetch('/api/applications/running', { headers: { 'X-AppRoute-UI': '1' } }).then(async response => { if (!response.ok) throw new Error(); return response.json() })
      setRunning(result); setRunningError('')
    } catch { setRunning([]); setRunningError('暂时无法读取运行中的应用，请稍后重试。') }
  }, [])
  useEffect(() => {
    if (!ready) return
    const refresh = () => { void scan(false); void refreshRunning() }
    refresh()
    const unsubscribe = window.appRoute?.onRefresh(refresh)
    window.addEventListener('focus', refresh)
    const scanTimer = window.setInterval(() => { if (document.visibilityState === 'visible') void scan(false) }, 300000)
    const runningTimer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshRunning() }, 15000)
    return () => { unsubscribe?.(); window.removeEventListener('focus', refresh); window.clearInterval(scanTimer); window.clearInterval(runningTimer) }
  }, [ready, scan, refreshRunning])
  useEffect(() => {
    if (!ready || !writable) return
    const preferences: InventoryPreferences = { version: 1, applications, favorites }
    const timer = window.setTimeout(() => {
      saveChain.current = saveChain.current.then(async () => {
        try {
          if (window.appRoute) await window.appRoute.request('inventory.write', preferences)
          else { localStorage.setItem(storageKey, JSON.stringify(preferences)); localStorage.setItem('approute.favorites.v1', JSON.stringify(favorites)) }
          setSaveError(false)
        } catch { setSaveError(true) }
      })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [applications, favorites, ready, writable])
  const syncIcons = useCallback((state: ApplicationIconState) => {
    const urls = new Map(state.applications.map(app => [app.applicationId, app.icon]))
    setApplications(current => {
      let changed = false
      const next = current.map(app => { const icon = urls.get(app.id); if (!icon || icon === app.icon) return app; changed = true; return { ...app, icon } })
      return changed ? next : current
    })
  }, [])
  return { applications, favorites, running, runningError, loading, ready, error, saveError, scannedAt, newCount, scan, refreshRunning, syncIcons,
    toggleFavorite: (app: Application) => setFavorites(current => current.includes(applicationKey(app)) ? current.filter(key => key !== applicationKey(app)) : [...current, applicationKey(app)]),
    addFavorites: (apps: Application[]) => setFavorites(current => [...new Set([...current, ...apps.map(applicationKey)])]),
    saveApplication: (app: Application) => setApplications(current => [...current.filter(item => item.id !== app.id), { ...app, mode: 'rule' }]),
    removeApplication: (id: string) => setApplications(current => current.filter(app => app.id !== id)) }
}
