export type ProxyStrategy =
  | { mode: 'existing'; group: string }
  | { mode: 'fallback' | 'url-test'; nodes: string[]; interval: number; timeout: number; tolerance: number }

export interface ProxyStrategyRequest { revision: string; strategy: ProxyStrategy; missingTargetAction?: 'block' | 'original' }
export interface StrategyNode { name: string; type: string; health: 'healthy' | 'unhealthy' | 'unknown'; delay?: number }

export const strategyLabels = { existing: '沿用现有策略', fallback: '故障备用', 'url-test': '延迟优先' } as const
export const strategyDefaults = { interval: 60, timeout: 5000, tolerance: 100 }
