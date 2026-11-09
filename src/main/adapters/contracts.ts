import type { RoutingReadiness } from '../../shared/routingBackend'

/** 只读探测内核能力。不能仅凭一个可连通的端口判断可以按进程分流。 */
export interface EngineRuntimeAdapter {
  readonly id: string
  inspect(): Promise<RoutingReadiness>
}

/** 配置持久化归客户端或独立内核的配置所有者负责，与运行控制 API 分开。 */
export interface ConfigurationOwnerAdapter {
  readonly id: string
  inspectOwnership(): Promise<{
    writable: boolean
    preservesChangesOnReload: boolean | null
    reason?: string
  }>
}

/** 通用代理端口路线需要独立的流量接管能力；首版不提供其实现。 */
export interface TrafficInterceptorAdapter {
  readonly id: string
  inspect(): Promise<RoutingReadiness>
}

// apply/rollback 接口在备份、冲突检测、原子写入方案验证后再确定，避免虚构成功接口。
