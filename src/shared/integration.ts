import type { Application, RouteMode } from './application.ts'

export interface ManagedApplication {
  id: string
  name: string
  processes: string[]
  mode: RouteMode
  target?: string
}
export interface ApplyRequest { applications: Application[]; target?: string; revision: string }
export interface ProxyChoice { name: string; type: string; current: string; udp: boolean }
export interface ConnectionEvidence {
  applicationId: string
  process: string
  destination: string
  outbound: string
  matched: boolean
  startedAt: string
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
  managed: ManagedApplication[]
  rulesLoaded: boolean
  evidence: ConnectionEvidence[]
  pending?: { id: string; deadline: number }
  recoveryReady: boolean
  recoveryPath: string
  warning?: string
  lastRecovery?: string
}
export interface DiagnosticCheck { name: string; ok: boolean; detail: string }
