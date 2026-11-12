import assert from 'node:assert/strict'
import test from 'node:test'
import { MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'
import type { ProxyInfo } from '../src/core/managedRouting.ts'

class CachedSelectionRuntime extends MihomoRuntime {
  groups: Record<string, ProxyInfo> = {
    Auto: { name: 'Auto', type: 'Fallback', all: ['A', 'B'], now: 'A', fixed: '' },
    Fixed: { name: 'Fixed', type: 'URLTest', all: ['A', 'B'], now: 'B', fixed: 'B' },
    Manual: { name: 'Manual', type: 'Selector', all: ['A', 'B'], now: 'B' },
  }
  cache: Record<string, string> = { Auto: 'B', Fixed: 'B', Manual: 'B' }
  writes: string[] = []
  changeBeforeClear = false
  failClear = false
  changeAfterClear = false
  constructor() { super('isolated-fixture') }
  override async request<T>(method: string, endpoint: string): Promise<T> {
    if (method === 'GET' && endpoint === '/proxies') return structuredClone({ proxies: this.groups }) as T
    if (endpoint.startsWith('/proxies/')) {
      const name = decodeURIComponent(endpoint.slice('/proxies/'.length))
      if (method === 'GET') {
        if (this.changeBeforeClear) this.groups[name].fixed = 'B'
        return structuredClone(this.groups[name]) as T
      }
      if (method === 'DELETE') {
        if (this.failClear) throw new Error('同步失败')
        this.writes.push(`clear:${name}`); this.cache[name] = ''; this.groups[name].fixed = ''
        if (this.changeAfterClear) this.groups.Manual.now = 'A'
        return undefined as T
      }
    }
    assert.equal(method, 'PUT'); assert.equal(endpoint, '/configs?force=true')
    this.writes.push('reload')
    for (const [name, group] of Object.entries(this.groups)) if (group.type !== 'Selector') group.fixed = this.cache[name]
    return undefined as T
  }
}

test('重载不复活自动组的过期固定缓存，并保留手选与固定选择', async () => {
  const runtime = new CachedSelectionRuntime()
  await runtime.reload('fixture')
  assert.deepEqual(runtime.writes, ['clear:Auto', 'reload'])
  assert.equal(runtime.groups.Auto.fixed, '')
  assert.equal(runtime.groups.Fixed.fixed, 'B')
  assert.equal(runtime.groups.Manual.now, 'B')
})

test('重载前发现外部固定选择或同步失败时，不继续写配置', async () => {
  for (const reason of ['changeBeforeClear', 'failClear', 'changeAfterClear'] as const) {
    const runtime = new CachedSelectionRuntime(); runtime[reason] = true
    await assert.rejects(runtime.reload('fixture'), /变化|同步失败/)
    assert.ok(!runtime.writes.includes('reload'))
    if (reason === 'changeBeforeClear') { assert.deepEqual(runtime.writes, []); assert.equal(runtime.groups.Auto.fixed, 'B') }
    if (reason === 'changeAfterClear') assert.equal(runtime.groups.Manual.now, 'A')
  }
})

test('未知 fixed 状态不猜测为自动选择，成员变化也不清除选择', async () => {
  const runtime = new CachedSelectionRuntime(); delete runtime.groups.Auto.fixed
  await runtime.reload('fixture'); assert.deepEqual(runtime.writes, ['reload'])
  const changed = new CachedSelectionRuntime(), request = changed.request.bind(changed)
  changed.request = async <T>(method: string, endpoint: string) => {
    if (method === 'GET' && endpoint === '/proxies/Auto') changed.groups.Auto.all = ['C']
    return request<T>(method, endpoint)
  }
  await assert.rejects(changed.reload('fixture'), /成员已变化/)
  assert.deepEqual(changed.writes, [])
})
