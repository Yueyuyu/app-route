import type { Application, RouteMode } from './application.ts'

export interface ManagedApplication {
  id: string
  name: string
  processes: string[]
  processPaths?: string[]
  processWarnings?: string[]
  appliedAt?: string
  mode: RouteMode
  target?: string
}
export interface ApplyRequest { applications: Application[]; target?: string; revision: string }
export interface AutomaticApplyResult {
  outcome: 'applied' | 'restored' | 'unchanged' | 'recovery-required'
  message: string
  status: IntegrationStatus
}
export interface ProxyChoice { name: string; type: string; current: string; udp: boolean }
export interface ConnectionEvidence {
  applicationId: string
  process: string
  destination: string
  outbound: string
  matched: boolean
  startedAt: string
  currentRuleMatched?: boolean
}
export interface IntegrationStatus {
  persistenceObserved?: boolean
  connected: boolean
  version?: string
  mode?: string
  tun?: boolean
  processMode?: string
  revision: string
  choices: ProxyChoice[]
  suggestedTarget?: string
  managed: ManagedApplication[]
  rulesLoaded: boolean
  evidence: ConnectionEvidence[]
  uncoveredProcesses?: { applicationId: string; process: string }[]
  pending?: { id: string; deadline: number }
  recoveryReady: boolean
  recoveryPath: string
  warning?: string
  lastRecovery?: string
}
export interface DiagnosticCheck { name: string; ok: boolean; detail: string }
