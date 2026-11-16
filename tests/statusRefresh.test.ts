import assert from 'node:assert/strict'
import test from 'node:test'
import { SingleFlight, startStatusPolling } from '../src/core/statusRefresh.ts'
import { sampleConnectionEvidence } from '../src/core/connectionEvidence.ts'
import { routingPresentation } from '../src/core/applicationInventory.ts'
import type { ConnectionEvidence, IntegrationStatus } from '../src/shared/integration.ts'

test('慢状态请求合并，完成后下一次读取仍访问新状态', async () => {
  const flight = new SingleFlight<number>()
  let calls = 0, finish!: (value: number) => void
  const read = () => flight.run(async () => { calls++; return new Promise<number>(resolve => { finish = resolve }) })
  const first = read(), second = read()
  await Promise.resolve()
  assert.equal(calls, 1)
  finish(7)
  assert.deepEqual(await Promise.all([first, second]), [7, 7])
  assert.equal(await flight.run(async () => { calls++; return 8 }), 8)
  assert.equal(calls, 2)
  await assert.rejects(flight.run(async () => { throw new Error('offline') }))
  assert.equal(await flight.run(async () => 9), 9)
})

test('轮询等待读取完成，隐藏和失败时降频，停止后不再安排读取', async () => {
  let finish!: (value: boolean) => void, visible = true, calls = 0
  const scheduled: { callback: () => void; delay: number }[] = []
  const polling = startStatusPolling({ read: () => { calls++; return new Promise(resolve => { finish = resolve }) }, visible: () => visible,
    schedule: (callback, delay) => { scheduled.push({ callback, delay }); return 1 as unknown as ReturnType<typeof setTimeout> }, cancel: () => {} })
  polling.wake(); polling.wake()
  assert.equal(calls, 1)
  assert.equal(scheduled.length, 0)
  finish(true); await Promise.resolve(); await Promise.resolve()
  assert.equal(scheduled.at(-1)?.delay, 5000)
  visible = false; scheduled.at(-1)!.callback(); finish(false); await Promise.resolve(); await Promise.resolve()
  assert.equal(scheduled.at(-1)?.delay, 30000)
  visible = true; polling.wake(); finish(false); await Promise.resolve(); await Promise.resolve()
  assert.equal(scheduled.at(-1)?.delay, 20000)
  polling.wake(); polling.stop(); const count = scheduled.length
  finish(true); await Promise.resolve(); await Promise.resolve()
  assert.equal(scheduled.length, count)
})

test('繁忙应用不能挤掉其他应用证据，采样不隐藏任何应用的异常', () => {
  const now = new Date().toISOString()
  const row = (applicationId: string, matched = true): ConnectionEvidence => ({ applicationId, process: 'Example.exe', destination: 'fixture.invalid', outbound: 'DIRECT', matched, usesCurrentNode: true, startedAt: now })
  const all = [...Array.from({ length: 800 }, () => row('busy')), row('quiet'), row('busy', false)]
  const result = sampleConnectionEvidence(all, now)
  assert.ok(result.evidence.some(item => item.applicationId === 'quiet'))
  assert.equal(result.observations.busy.connectionCount, 801)
  assert.equal(result.observations.busy.matchedCount, 800)
  assert.ok(result.evidence.some(item => !item.matched))
  const status = { connected: true, rulesLoaded: true, managed: [{ id: 'busy', name: 'Busy', mode: 'direct', processes: ['Example.exe'] }], ...result } as IntegrationStatus
  status.evidence = status.evidence.filter(item => item.matched)
  assert.equal(routingPresentation({ id: 'busy' } as any, status).label, '连接不符合设置')
  const many = sampleConnectionEvidence(Array.from({ length: 300 }, (_, i) => row(String(i))), now)
  assert.equal(new Set(many.evidence.map(item => item.applicationId)).size, 300)
})
