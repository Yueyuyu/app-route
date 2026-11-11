import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { addManagedRules, overrideScript, removeManagedRules } from '../src/core/managedRouting.ts'
import { strategyOwnership, validateProxyStrategy } from '../src/core/proxyStrategy.ts'
import type { ProxyStrategy } from '../src/shared/proxyStrategy.ts'

const strategy: Extract<ProxyStrategy, { nodes: string[] }> = { mode: 'fallback', nodes: ['A', 'B'], interval: 60, timeout: 5000, tolerance: 100 }
const config = { proxies: [{ name: 'A', type: 'ss' }, { name: 'B', type: 'ss' }], 'proxy-groups': [{ name: 'Original', type: 'select', proxies: ['A', 'B'] }], rules: ['MATCH,Original'] }
const apps = [{ id: 'sample', name: '示例', processes: ['Sample.exe'], mode: 'proxy' as const, target: strategyOwnership.name }]
const run = (input: unknown, policy = strategy) => JSON.parse(JSON.stringify(vm.runInNewContext(overrideScript(apps, policy) + '\nmain(config)', { config: structuredClone(input) }, { timeout: 500 })))

test('专用组编译与覆写一致，幂等生成，恢复完整保留原配置', () => {
  for (const mode of ['fallback', 'url-test'] as const) {
    const policy: ProxyStrategy = { ...strategy, mode }
    const next = addManagedRules(config, apps, policy)
    assert.deepEqual(run(config, policy), next)
    assert.deepEqual(run(next, policy), next)
    assert.deepEqual(removeManagedRules(next), config)
    assert.deepEqual(next['proxy-groups'][0], config['proxy-groups'][0])
    assert.equal(next['proxy-groups'][1].type, mode)
    assert.deepEqual(next['proxy-groups'][1].proxies, ['A', 'B'])
    assert.equal(next['proxy-groups'][1].tolerance, mode === 'url-test' ? 100 : undefined)
  }
  const noGroups = { proxies: config.proxies, rules: ['MATCH,DIRECT'] }
  assert.deepEqual(removeManagedRules(addManagedRules(noGroups, apps, strategy)), noGroups)
})

test('订阅减少候选保持顺序，全部消失时拒绝而不直连', () => {
  const one = { ...config, proxies: [config.proxies[1]] }
  assert.deepEqual(run(one)['proxy-groups'][1].proxies, ['B'])
  const empty = { ...config, proxies: [] }
  const result = run(empty)
  assert.deepEqual(result['proxy-groups'][1].proxies, ['REJECT'])
  assert.ok(result.rules[0].endsWith(',' + strategyOwnership.name))
})

test('同名占用、所有权冲突和外部引用时不删除或覆盖用户配置', () => {
  const collision = { ...config, 'proxy-groups': [...config['proxy-groups'], { name: strategyOwnership.name, type: 'select', proxies: ['A'] }] }
  assert.throws(() => addManagedRules(collision, apps, strategy), /占用/)
  assert.deepEqual(run(collision), collision)
  assert.deepEqual(removeManagedRules(collision), collision)
  const modified = addManagedRules(config, apps, strategy)
  modified['proxy-groups'][1].interval = 900
  assert.throws(() => removeManagedRules(modified), /标记冲突/)
  assert.deepEqual(run(modified), modified)
  const referenced = addManagedRules(config, apps, strategy)
  referenced['proxy-groups'][0].proxies.push(strategyOwnership.name)
  assert.throws(() => removeManagedRules(referenced), /引用/)
  assert.deepEqual(run(referenced), referenced)
})

test('策略输入拒绝空集合、重复、注入、异常参数及自身循环', () => {
  for (const nodes of [[], ['A'], ['A', 'A'], ['A', 'B\nMATCH,DIRECT'], ['A', strategyOwnership.name]]) assert.throws(() => validateProxyStrategy({ ...strategy, nodes }))
  for (const interval of [0, 1, -1, '60', Infinity]) assert.throws(() => validateProxyStrategy({ ...strategy, interval }))
  assert.throws(() => validateProxyStrategy({ mode: 'existing', group: strategyOwnership.name }))
  assert.deepEqual(validateProxyStrategy(strategy), strategy)
})
