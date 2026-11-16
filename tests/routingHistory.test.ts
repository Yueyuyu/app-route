import test from 'node:test'
import assert from 'node:assert/strict'
import { routingUndoPlan } from '../src/core/routingHistory.ts'
import type { HistoryRoutingState } from '../src/shared/routingHistory.ts'

test('撤销只回退联网选择，拒绝旧身份、共享宿主、策略变化和无效来源', () => {
  const previous: HistoryRoutingState = { revision: 'before', managed: [{ id: 'app', name: 'Music', mode: 'direct', processes: ['Music.exe'], processPaths: ['C:\\Apps\\Music\\Music.exe'] }] }
  const after: HistoryRoutingState = { ...previous, revision: 'after', managed: [{ ...previous.managed[0], mode: 'proxy', target: 'Group', processes: ['Music.exe', 'Helper.exe'], processPaths: ['C:\\Apps\\Music\\Music.exe', 'C:\\Apps\\Music\\Helper.exe'] }] }
  const tx = { phase: 'confirmed', source: 'application' as const, previous, after }
  const plan = routingUndoPlan(tx, after)
  assert.equal(plan.reason, undefined)
  assert.equal(plan.applications[0].mode, 'direct')
  assert.equal(plan.applications[0].processPaths, undefined, 'helper paths must be rebuilt by the normal routing transaction')
  assert.ok(routingUndoPlan({ ...tx, source: 'helper' }, after).reason)
  assert.ok(routingUndoPlan({ ...tx, source: undefined }, after).reason)
  assert.ok(routingUndoPlan({ ...tx, after: { ...after, proxyGroup: 'Changed' } }, { ...after, proxyGroup: 'Changed' }).reason)
  const moved = { ...after, managed: [{ ...after.managed[0], processPaths: ['D:\\Apps\\Music\\Music.exe'] }] }
  assert.ok(routingUndoPlan({ ...tx, after: moved }, moved).reason)
  const helperOnly = { ...after, managed: [{ ...after.managed[0], mode: 'direct' as const, target: undefined }] }
  assert.ok(routingUndoPlan({ ...tx, after: helperOnly }, helperOnly).reason)
  const host = { ...previous, managed: [{ ...previous.managed[0], processes: ['explorer.exe'], processPaths: ['C:\\Windows\\explorer.exe'] }] }
  const empty = { revision: 'removed', managed: [] }
  assert.ok(routingUndoPlan({ ...tx, previous: host, after: empty }, empty).reason)
  assert.ok(routingUndoPlan(tx, { ...after, managed: [{ ...after.managed[0], target: 'Changed' }] }).reason, 'same revision cannot hide modified state contents')
})
