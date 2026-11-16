import type { RouteMode } from './application.ts'
import type { ManagedApplication } from './integration.ts'
import type { ProxyStrategy } from './proxyStrategy.ts'

export type RoutingOperationSource = 'application' | 'strategy' | 'import' | 'helper' | 'undo' | 'temporary' | 'expiry' | 'exceptions'
export interface HistoryRoutingState {
  revision: string; pendingId?: string; managed: ManagedApplication[]
  proxyGroup?: string; proxyStrategy?: ProxyStrategy; missingTargetAction?: 'block' | 'original'
}
export interface RoutingChange {
  id: string; name: string
  before: { mode: RouteMode; target?: string; processes: number; expiresAt?: string; exceptions?: string }
  after: { mode: RouteMode; target?: string; processes: number; expiresAt?: string; exceptions?: string }
}
export interface RoutingHistoryItem {
  id: string; at?: string; source: RoutingOperationSource | 'unknown'
  phase: 'prepared' | 'pending' | 'confirmed' | 'rolled-back' | 'recovery-required'
  changes: RoutingChange[]; strategyChanged: boolean; undoReason?: string
}
export interface RoutingHistory { revision: string; items: RoutingHistoryItem[]; unreadable: number }
