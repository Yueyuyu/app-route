import type { RouteMode } from './application.ts'
import type { LanguagePreference } from './i18n/index.ts'
import type { ProxyStrategy } from './proxyStrategy.ts'

export interface SettingsApplication { name: string; path?: string; category: string; mode: RouteMode; favorite?: boolean }
export interface SettingsSnapshot {
  app: 'AppRoute'; kind: 'approute-settings'; version: 1; createdAt: string
  applications: SettingsApplication[]
  scope?: 'routing'
  language?: LanguagePreference
  proxyStrategy?: ProxyStrategy
  missingTargetAction?: 'block' | 'original'
}
export interface ImportRow extends SettingsApplication {
  key: string; currentMode: RouteMode; configured: boolean; available: boolean; reason?: string
  localPath?: string; manualBinding?: boolean; canBind?: boolean
  differences: SettingsDifference[]
}
export interface SettingsDifference { field: 'name' | 'category' | 'mode' | 'favorite'; before: string | boolean; after: string | boolean }
export interface ImportCandidate { key: string; name: string; path: string }
export interface SettingsBindingRequest { token: string; key: string; candidate: string }
export interface SettingsPreview {
  token: string; createdAt: string; rows: ImportRow[]; language?: LanguagePreference
  proxyStrategy?: ProxyStrategy; currentGroup?: string; affectedProxyCount: number
  candidates: ImportCandidate[]; currentLanguage: LanguagePreference; currentStrategy?: ProxyStrategy
}
export interface SettingsImportRequest {
  token: string; keys: string[]; applyRouting: boolean; restoreStrategy: boolean; restoreLanguage: boolean
}
export interface SettingsImportResult { imported: number; routingApplied: boolean; backupId: string; warnings: string[] }
export interface SettingsBackup {
  id: string; createdAt: string; kind: 'manual' | 'before-import' | 'before-upgrade' | 'routing'; count: number
  bytes: number; valid: boolean; restorable: boolean; fingerprint: string
}
