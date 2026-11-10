import assert from 'node:assert/strict'
import test from 'node:test'
import { isFollowGroup, resolveProxyOutlet } from '../src/core/proxyGroups.ts'
import type { ProxyInfo } from '../src/core/managedRouting.ts'

test('逐层跟随手动选择与故障转移，切换成员后不保留旧节点', () => {
  const proxies: Record<string, ProxyInfo> = {
    Main: { name: 'Main', type: 'Selector', all: ['Auto', 'DIRECT'], now: 'Auto' },
    Auto: { name: 'Auto', type: 'Fallback', all: ['A', 'B'], now: 'A' },
    A: { name: 'A', type: 'Trojan' }, B: { name: 'B', type: 'Trojan' }, DIRECT: { name: 'DIRECT', type: 'Direct' },
  }
  assert.equal(isFollowGroup(proxies.Main), true)
  assert.deepEqual(resolveProxyOutlet('Main', proxies).chain, ['Main', 'Auto', 'A'])
  proxies.Auto.now = 'B'
  assert.equal(resolveProxyOutlet('Main', proxies).node, 'B')
  proxies.Main.now = 'DIRECT'
  assert.equal(resolveProxyOutlet('Main', proxies).kind, 'direct')
})

test('失效引用、循环、负载均衡与未知策略不冒充确定节点', () => {
  const proxies: Record<string, ProxyInfo> = { A: { name: 'A', type: 'Selector', all: ['A'], now: 'A' },
    LB: { name: 'LB', type: 'LoadBalance', all: ['Node'], now: 'Node' }, PASS: { name: 'PASS', type: 'Pass' },
    Reject: { name: 'Reject', type: 'RejectDrop' } }
  assert.equal(resolveProxyOutlet('Missing', proxies).kind, 'missing')
  assert.equal(resolveProxyOutlet('A', proxies).kind, 'unknown')
  assert.equal(resolveProxyOutlet('LB', proxies).kind, 'distributed')
  assert.equal(resolveProxyOutlet('PASS', proxies).kind, 'unknown')
  assert.equal(resolveProxyOutlet('Reject', proxies).kind, 'reject')
})

test('节点选择不等于健康；仅最近有效探测可作为状态依据', () => {
  const node: ProxyInfo = { name: 'Node', type: 'Trojan', alive: true }
  const proxies = { Node: node }
  assert.equal(resolveProxyOutlet('Node', proxies).health, 'unknown')
  node.history = [{ time: new Date().toISOString(), delay: 100 }]
  assert.equal(resolveProxyOutlet('Node', proxies).health, 'healthy')
  node.history[0].delay = 0
  assert.equal(resolveProxyOutlet('Node', proxies).health, 'unhealthy')
  node.history[0].time = '2000-01-01T00:00:00Z'
  assert.equal(resolveProxyOutlet('Node', proxies).health, 'unknown')
})
