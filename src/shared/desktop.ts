import type { Application } from './application.ts'

export const desktopActions = ['applications.scan', 'applications.running', 'inventory.read', 'inventory.write',
  'settings.pick-import', 'settings.export', 'settings.snapshot', 'settings.preview', 'settings.path-preview', 'settings.bind', 'settings.import',
  'settings.scenarios', 'settings.scenario-prepare', 'settings.scenario-save', 'settings.scenario-preview', 'settings.scenario-delete',
  'settings.backups', 'settings.backup-create', 'settings.backup-preview', 'settings.backup-delete', 'settings.backup-export',
  'integration.status', 'integration.history', 'integration.undo', 'integration.temporary', 'integration.temporary-end', 'integration.reconcile', 'integration.repair-preview', 'integration.repair-records', 'integration.diagnostics-export', 'integration.apply-automatic', 'integration.proxy-group', 'integration.proxy-strategy', 'integration.apply', 'integration.confirm', 'integration.rollback', 'integration.recover', 'integration.diagnose',
  'icons.state', 'icons.scan', 'icons.register', 'icons.replace', 'icons.reset', 'icons.image', 'application.choose', 'language.read', 'language.write', 'app.open-link', 'app.copy-version',
  'updates.check', 'updates.prepare', 'updates.status'] as const
export type DesktopAction = typeof desktopActions[number]
export interface InventoryPreferences { version: 1; applications: Application[]; favorites: string[]; revision?: string }
export interface RunningApplicationProcess { path: string; pid: number; parentPid: number }
export type DesktopDestination = 'configured' | 'running' | 'connection'
export interface DesktopBridge {
  platform?: string
  request<T>(action: DesktopAction, body?: unknown): Promise<T>
  onRefresh(callback: () => void): () => void
  onResume?(callback: () => void): () => void
  onNavigate?(callback: (destination: DesktopDestination) => void): () => void
}
declare global { interface Window { appRoute?: DesktopBridge } }
