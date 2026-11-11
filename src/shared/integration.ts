import type { Application, RouteMode } from './application.ts'
import type { ProxyStrategy, StrategyNode } from './proxyStrategy.ts'

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
export interface ApplyRequest {
  applications: Application[]; target?: string; revision: string
  /** 保存默认跟随组时，必须同时迁移全部已设置代理的应用。 */
  proxyGroup?: string
  proxyStrategy?: ProxyStrategy
}
export interface AutomaticApplyResult {
  outcome: 'applied' | 'restored' | 'unchanged' | 'recovery-required'
  message: string
  status: IntegrationStatus
}
export interface ProxyChoice { name: string; type: string; current: string; udp: boolean }
export interface ProxyOutlet {
  target: string
  type?: string
  chain: string[]
  node?: string
  kind: 'proxy' | 'direct' | 'reject' | 'distributed' | 'missing' | 'unknown'
  health: 'healthy' | 'unhealthy' | 'unknown'
  checkedAt?: string
  delay?: number
}
export interface ConnectionEvidence {
  applicationId: string
  process: string
  destination: string
  outbound: string
  matched: boolean
  startedAt: string
  currentRuleMatched?: boolean
  node?: string
  usesCurrentNode?: boolean
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
  proxyGroup?: string
  groupChoices?: ProxyChoice[]
  proxyStrategy?: ProxyStrategy
  strategyNodes?: StrategyNode[]
  strategyLoaded?: boolean
  strategyWarning?: string
  outlets?: Record<string, ProxyOutlet>
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
