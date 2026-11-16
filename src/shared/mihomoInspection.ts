import type { RoutingReadiness } from './routingBackend.ts'

export interface MihomoEndpointInspection extends RoutingReadiness { checkedAt: string; version?: string }
