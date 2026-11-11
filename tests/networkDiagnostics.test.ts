import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnosticContextKey, diagnosticFreshnessMs, diagnosticStaleReason } from '../src/core/networkDiagnostics.ts'
import type { IntegrationStatus } from '../src/shared/integration.ts'

const status: IntegrationStatus = { connected: true, revision: 'one', mode: 'rule', tun: false, choices: [], managed: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: '', proxyGroup: 'Group',
  outlets: { Group: { target: 'Group', kind: 'proxy', node: 'A', chain: ['Group', 'A'], health: 'healthy' } } }
test('自检上下文识别断线、配置及节点变化，不因测速时间和连接采样反复过期', () => {
  const before = diagnosticContextKey(status)
  for (const patch of [{ connected: false }, { revision: 'two' }, { configurationFingerprint: 'subscription-refreshed-same-node' }, { mode: 'global' }, { tun: true }, { rulesLoaded: false }, { proxyGroup: 'Other' },
    { outlets: { Group: { ...status.outlets!.Group, node: 'B', chain: ['Group', 'B'] } } }]) assert.notEqual(diagnosticContextKey({ ...status, ...patch }), before)
  assert.notEqual(diagnosticContextKey(status, 'offline'), before)
  assert.equal(diagnosticContextKey({ ...status, timings: [{ phase: 'scan', durationMs: 1, ok: true, at: 'now' }], outlets: { Group: { ...status.outlets!.Group, checkedAt: 'later', delay: 50 } } }), before)
})
test('自检五分钟到期、系统时间回退及上下文变化都不能继续展示为新结果', () => {
  const time = '2026-11-11T12:00:00Z', now = Date.parse(time)
  assert.equal(diagnosticStaleReason(time, true, now + diagnosticFreshnessMs - 1), undefined)
  assert.equal(diagnosticStaleReason(time, true, now + diagnosticFreshnessMs), 'expired')
  assert.equal(diagnosticStaleReason(time, true, now - 1), 'expired')
  assert.equal(diagnosticStaleReason('invalid', true, now), 'expired')
  assert.equal(diagnosticStaleReason(time, false, now), 'changed')
})
