import assert from 'node:assert/strict'
import test from 'node:test'
import { RoutingQueue } from '../src/core/routingQueue.ts'
import type { Application } from '../src/shared/application.ts'
import type { AutomaticApplyResult } from '../src/shared/integration.ts'

const application = (id: string): Application => ({ id, name: id, processes: [`${id}.exe`], mode: 'rule', source: 'manual', category: '其他应用' })
const success = (): AutomaticApplyResult => ({ outcome: 'applied', message: '已检查', status: { connected: true, revision: 'new', managed: [], choices: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: '' } })
const deferred = () => { let resolve!: (value: AutomaticApplyResult) => void; const promise = new Promise<AutomaticApplyResult>(done => { resolve = done }); return { promise, resolve } }
const callbacks = { onChange: () => {}, onResult: () => {}, onFailure: () => {}, debounceMs: 10000 }

test('点击立即呈现待应用；短窗口合并多个应用，同一应用只提交最后选择', async () => {
  const requests: { applications: Application[]; target?: string }[] = []
  const queue = new RoutingQueue({ ...callbacks, execute: async (applications, target) => { requests.push({ applications, target }); return success() } })
  queue.enqueue([application('A')], 'direct')
  assert.deepEqual(queue.snapshot().A, { mode: 'direct', phase: 'queued' })
  queue.enqueue([application('A')], 'proxy', 'Group')
  queue.enqueue([application('B')], 'direct')
  await queue.flush()
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0].applications.map(app => [app.id, app.mode]), [['A', 'proxy'], ['B', 'direct']])
  assert.equal(requests[0].target, 'Group')
  assert.deepEqual(queue.snapshot(), {})
})

test('前一事务运行时仍可继续选择，按序提交最终意图且不混用代理出口', async () => {
  const first = deferred(), requests: { apps: Application[]; target?: string }[] = []
  let active = 0, peak = 0
  const queue = new RoutingQueue({ ...callbacks, execute: async (apps, target) => {
    active++; peak = Math.max(peak, active); requests.push({ apps, target })
    const result = requests.length === 1 ? await first.promise : success()
    active--; return result
  } })
  queue.enqueue([application('A')], 'direct')
  const work = queue.flush()
  assert.deepEqual(queue.snapshot().A, { mode: 'direct', phase: 'applying' })
  queue.enqueue([application('A')], 'rule')
  queue.enqueue([application('A')], 'proxy', 'GroupOne')
  queue.enqueue([application('B')], 'proxy', 'GroupTwo')
  assert.deepEqual(queue.snapshot().A, { mode: 'proxy', phase: 'queued' })
  first.resolve(success()); await work
  assert.equal(peak, 1)
  assert.deepEqual(requests.map(request => [request.apps[0].id, request.apps[0].mode, request.target]), [['A', 'direct', undefined], ['A', 'proxy', 'GroupOne'], ['B', 'proxy', 'GroupTwo']])
})

test('恢复未确认会停止尚未发送的任务，不能在恢复之后偷偷应用', async () => {
  const first = deferred(), failures: string[] = []
  let writes = 0
  const queue = new RoutingQueue({ ...callbacks, execute: async () => { writes++; return first.promise }, onFailure: (_, intents) => failures.push(...intents.map(item => item.application.id)) })
  queue.enqueue([application('A')], 'direct'); const work = queue.flush()
  queue.enqueue([application('B')], 'direct')
  first.resolve({ ...success(), outcome: 'recovery-required', message: '恢复未确认' }); await work
  assert.equal(writes, 1)
  assert.deepEqual(failures, ['A', 'B'])
  assert.deepEqual(queue.snapshot(), {})
})

test('请求异常不会丢失失败反馈；页面离开时取消尚未发出的操作', async () => {
  const failures: string[] = []; let writes = 0
  const queue = new RoutingQueue({ ...callbacks, execute: async () => { writes++; throw Error('连接中断') }, onFailure: text => failures.push(text) })
  queue.enqueue([application('A')], 'direct'); queue.cancelWaiting(); await queue.flush()
  assert.equal(writes, 0)
  queue.enqueue([application('B')], 'proxy', 'Group'); await queue.flush()
  assert.equal(writes, 1); assert.deepEqual(failures, ['连接中断']); assert.deepEqual(queue.snapshot(), {})
})
