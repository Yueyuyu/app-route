import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge } from '../shared/desktop.ts'

const bridge: DesktopBridge = {
  platform: process.platform,
  request: (action, body) => ipcRenderer.invoke('approute:request', action, body),
  onRefresh: callback => { const listener = () => callback(); ipcRenderer.on('approute:refresh', listener); return () => ipcRenderer.removeListener('approute:refresh', listener) },
  onResume: callback => { const listener = () => callback(); ipcRenderer.on('approute:resume', listener); return () => ipcRenderer.removeListener('approute:resume', listener) },
  onNavigate: callback => { const listener = (_event: unknown, destination: unknown) => { if (destination === 'configured' || destination === 'running' || destination === 'connection') callback(destination) }; ipcRenderer.on('approute:navigate', listener); return () => ipcRenderer.removeListener('approute:navigate', listener) },
}
contextBridge.exposeInMainWorld('appRoute', bridge)
