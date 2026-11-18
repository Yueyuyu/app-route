import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { UpdateChannel, UpdateCheck, UpdateDownload } from '../../shared/updates'
import { buildInfo } from '../buildInfo'
import { settingsError } from '../settingsError'

const channelKey = 'approute.update-channel.v1'
const automaticKey = 'approute.update-check.v1'
const automaticInterval = 6 * 60 * 60 * 1000
function preferences() {
  let channel: UpdateChannel = buildInfo.version.includes('-preview.') ? 'preview' : 'stable'
  let automatic = true
  try {
    const saved = localStorage.getItem(channelKey)
    if (saved === 'stable' || saved === 'preview') channel = saved
    automatic = localStorage.getItem(automaticKey) !== 'off'
  } catch { /* 存储不可用时仍可手动检查。 */ }
  return { channel, automatic }
}
function useUpdateState() {
  const [saved] = useState(preferences)
  const [channel, updateChannel] = useState(saved.channel), [automatic, updateAutomatic] = useState(saved.automatic)
  const [result, setResult] = useState<UpdateCheck>(), [checking, setChecking] = useState(false)
  const [preferenceError, setPreferenceError] = useState(false)
  const [downloadState, setDownloadState] = useState<UpdateDownload>({ phase: 'idle', received: 0, total: 0, installation: 'manual' })
  const [actionError, setActionError] = useState(''), [manualOpened, setManualOpened] = useState(false), [installing, setInstalling] = useState(false)
  useEffect(() => {
    const bridge = window.appRoute
    if (!bridge) return
    let received = false, mounted = true
    const unsubscribe = bridge.onUpdateDownload?.(value => { received = true; setDownloadState(value) })
    void bridge.request<UpdateDownload>('updates.download-state').then(value => { if (mounted && !received) setDownloadState(value) }).catch(() => {})
    return () => { mounted = false; unsubscribe?.() }
  }, [])
  async function download() {
    if (!result?.release || result.state !== 'available' || !window.appRoute) return
    setActionError(''); setManualOpened(false)
    try { await window.appRoute.request('updates.download', { channel, version: result.release.version }) }
    catch (error) { setActionError(settingsError(error, '升级准备未完成，请重新检查；现有设置保持不变。')) }
  }
  async function install() {
    if (!window.appRoute || installing) return
    setInstalling(true); setActionError(''); setManualOpened(false)
    try {
      const value = await window.appRoute.request<{ started: boolean; manual: boolean }>('updates.install', { channel: downloadState.channel, version: downloadState.version })
      setManualOpened(value.manual)
      if (!value.started) setInstalling(false)
    } catch (error) { setActionError(settingsError(error, '安装器未能启动，请重试或打开下载目录。')); setInstalling(false) }
  }
  async function cancelDownload() {
    try { await window.appRoute?.request('updates.cancel') }
    catch { setActionError('下载取消失败，请稍后重试。') }
  }
  async function reveal() {
    try { await window.appRoute?.request('updates.reveal') }
    catch (error) { setActionError(settingsError(error, '安装包校验失败，请重新下载。')) }
  }
  const activeChannel = useRef(channel), flight = useRef<Promise<void> | undefined>(undefined), lastAutomatic = useRef(0), firstAutomaticAt = useRef(Date.now() + 15000)
  const check = useCallback(async () => {
    if (!window.appRoute) return
    if (flight.current) return flight.current
    const requested = activeChannel.current
    setChecking(true)
    const task = (async () => {
      try {
        const value = await window.appRoute!.request<UpdateCheck>('updates.check', { channel: requested })
        if (requested === activeChannel.current) setResult(value)
      } catch {
        if (requested === activeChannel.current) setResult({ channel: requested, currentVersion: buildInfo.version, checkedAt: new Date().toISOString(), state: 'unavailable', reason: 'network' })
      } finally { setChecking(false); flight.current = undefined }
    })()
    flight.current = task
    return task
  }, [])
  function setChannel(value: UpdateChannel) {
    activeChannel.current = value; updateChannel(value); setResult(undefined); lastAutomatic.current = 0
    try { localStorage.setItem(channelKey, value); setPreferenceError(false) } catch { setPreferenceError(true) }
  }
  function setAutomatic(value: boolean) {
    updateAutomatic(value)
    try { localStorage.setItem(automaticKey, value ? 'on' : 'off'); setPreferenceError(false) } catch { setPreferenceError(true) }
  }
  useEffect(() => {
    if (!automatic || !window.appRoute) return
    const inspect = () => {
      if (document.visibilityState === 'hidden' || flight.current || Date.now() < firstAutomaticAt.current || Date.now() - lastAutomatic.current < automaticInterval) return
      lastAutomatic.current = Date.now(); void check()
    }
    // 首屏先显示应用；后台只读取公开版本信息，失败不弹窗，也不自动下载或退出。
    const initial = setTimeout(inspect, 15000), timer = setInterval(inspect, automaticInterval)
    window.addEventListener('focus', inspect)
    return () => { clearTimeout(initial); clearInterval(timer); window.removeEventListener('focus', inspect) }
  }, [automatic, channel, check])
  return { channel, setChannel, automatic, setAutomatic, result, checking, check, preferenceError, downloadState, download, install, cancelDownload, reveal, actionError, manualOpened, installing }
}
const UpdatesContext = createContext<ReturnType<typeof useUpdateState> | null>(null)
export function ReleaseUpdatesProvider({ children }: { children: ReactNode }) {
  const updates = useUpdateState()
  return <UpdatesContext.Provider value={updates}>{children}</UpdatesContext.Provider>
}
export function useReleaseUpdates() {
  const value = useContext(UpdatesContext)
  if (!value) throw new Error('Missing ReleaseUpdatesProvider')
  return value
}
