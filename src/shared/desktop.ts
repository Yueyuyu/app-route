import type { Application } from './application.ts'

export const desktopActions = ['applications.scan', 'applications.running', 'inventory.read', 'inventory.write',
  'integration.status', 'integration.apply-automatic', 'integration.proxy-group', 'integration.proxy-strategy', 'integration.apply', 'integration.confirm', 'integration.rollback', 'integration.recover', 'integration.diagnose',
  'icons.state', 'icons.scan', 'icons.register', 'icons.replace', 'icons.reset', 'icons.image', 'application.choose'] as const
export type DesktopAction = typeof desktopActions[number]
export interface InventoryPreferences { version: 1; applications: Application[]; favorites: string[] }
export interface RunningApplicationProcess { path: string; pid: number; parentPid: number }
export interface DesktopBridge {
  request<T>(action: DesktopAction, body?: unknown): Promise<T>
  onRefresh(callback: () => void): () => void
}
declare global { interface Window { appRoute?: DesktopBridge } }
