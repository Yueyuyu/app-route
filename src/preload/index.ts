import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge } from '../shared/desktop.ts'

const bridge: DesktopBridge = {
  platform: process.platform,
  onUpdateDownload: callback => { const listener = (_event: unknown, state: Parameters<typeof callback>[0]) => callback(state); ipcRenderer.on('approute:update-download', listener); return () => ipcRenderer.removeListener('approute:update-download', listener) },
  request: (action, body) => ipcRenderer.invoke('approute:request', action, body),
  onRefresh: callback => { const listener = () => callback(); ipcRenderer.on('approute:refresh', listener); return () => ipcRenderer.removeListener('approute:refresh', listener) },
  onResume: callback => { const listener = () => callback(); ipcRenderer.on('approute:resume', listener); return () => ipcRenderer.removeListener('approute:resume', listener) },
  onNavigate: callback => { const listener = (_event: unknown, destination: unknown) => { if (destination === 'configured' || destination === 'running' || destination === 'connection') callback(destination) }; ipcRenderer.on('approute:navigate', listener); return () => ipcRenderer.removeListener('approute:navigate', listener) },
}
contextBridge.exposeInMainWorld('appRoute', bridge)
