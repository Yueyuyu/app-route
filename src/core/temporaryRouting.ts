import type { TemporaryRoute } from '../shared/temporaryRouting.ts'
import type { ManagedApplication } from '../shared/integration.ts'

export function validateTemporaryRoute(value: unknown): asserts value is TemporaryRoute {
  const lease = value as TemporaryRoute | undefined
  if (!lease || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(lease.id) || typeof lease.expiresAt !== 'string' || !Number.isFinite(Date.parse(lease.expiresAt)) ||
      !lease.previous || !['rule', 'direct', 'proxy'].includes(lease.previous.mode) ||
      (lease.previous.missingTargetAction !== undefined && !['block', 'original'].includes(lease.previous.missingTargetAction)) ||
      (lease.previous.mode === 'proxy' && (typeof lease.previous.target !== 'string' || !lease.previous.target || lease.previous.target.length > 200 || /[,\r\n\x00]/.test(lease.previous.target)))) throw new Error('临时分流记录无效，请核对恢复状态。')
}
export function nextTemporaryDeadline(applications: ManagedApplication[]): number | undefined {
  const values = applications.flatMap(app => app.temporary ? [Date.parse(app.temporary.expiresAt)] : [])
  return values.length ? Math.min(...values) : undefined
}
