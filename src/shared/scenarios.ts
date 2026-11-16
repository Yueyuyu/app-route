import type { RouteMode } from './application.ts'
import type { SettingsApplication } from './settings.ts'

export interface ScenarioSummary { id: string; name: string; createdAt: string; count: number; fingerprint: string }
export interface ScenarioList { items: ScenarioSummary[]; unreadable: number }
export interface ScenarioDraft { token: string; rows: (SettingsApplication & { key: string; temporary: boolean; blocked?: string })[] }
export interface ScenarioSave { token: string; name: string; choices: { key: string; mode: RouteMode }[] }
