/** 以下是扩展接口的类型契约，不代表已经接入相应引擎。 */
export type CapabilityState = 'supported' | 'unsupported' | 'unknown'

export interface RoutingCapabilities {
  processRules: CapabilityState
  persistentRules: CapabilityState
  connectionInspection: CapabilityState
  udp: CapabilityState
}

export type RoutingBackend =
  | { kind: 'managed-engine'; engine: 'mihomo' | 'sing-box'; runtimeId: string; configurationOwnerId: string }
  | { kind: 'proxy-endpoint'; endpointId: string; interceptorId: string | null }

// 凭据由本地进程保存；共享配置只携带引用，不把密码发给界面或写进草稿导出。
export interface ProxyEndpoint {
  id: string
  protocol: 'http' | 'socks5'
  host: string
  port: number
  credentialRef?: string
}

export interface RoutingReadiness {
  state: 'unavailable' | 'needs-setup' | 'ready'
  reasons: string[]
  capabilities: RoutingCapabilities
}
