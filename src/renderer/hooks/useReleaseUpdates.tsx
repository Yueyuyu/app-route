import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { UpdateChannel, UpdateCheck } from '../../shared/updates'
import { buildInfo } from '../buildInfo'

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
  return { channel, setChannel, automatic, setAutomatic, result, checking, check, preferenceError }
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
