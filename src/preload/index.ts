import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge } from '../shared/desktop.ts'

const bridge: DesktopBridge = {
  request: (action, body) => ipcRenderer.invoke('approute:request', action, body),
  onRefresh: callback => { const listener = () => callback(); ipcRenderer.on('approute:refresh', listener); return () => ipcRenderer.removeListener('approute:refresh', listener) },
  onResume: callback => { const listener = () => callback(); ipcRenderer.on('approute:resume', listener); return () => ipcRenderer.removeListener('approute:resume', listener) },
}
contextBridge.exposeInMainWorld('appRoute', bridge)
