import type { Application, RouteMode } from './application.ts'

export const temporaryDurations = [15, 30, 60] as const
export interface TemporaryRoute {
  id: string
  expiresAt: string
  previous: { mode: RouteMode; target?: string; missingTargetAction?: 'block' | 'original' }
}
export interface TemporaryRoutingRequest {
  revision: string
  application: Application
  minutes: number
}
