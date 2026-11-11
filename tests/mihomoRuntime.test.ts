import assert from 'node:assert/strict'
import test from 'node:test'
import { MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'

function fixture(response: unknown) {
  const runtime = new MihomoRuntime('unused-test-pipe')
  runtime.request = async <T>(method: string, endpoint: string) => {
    assert.equal(method, 'GET'); assert.equal(endpoint, '/connections')
    return response as T
  }
  return runtime
}

test('Mihomo 无连接时的 null 是空记录，不应误报内核离线', async () => {
  assert.deepEqual(await fixture({ connections: null }).connections(), { connections: [] })
  assert.deepEqual(await fixture({ connections: [] }).connections(), { connections: [] })
})

test('有效连接记录保留原内容，错误响应不能伪装成空连接', async () => {
  const response = { connections: [{ metadata: { process: 'Example.exe' }, chains: ['DIRECT'], start: '2026-01-01T00:00:00Z', rule: 'ProcessName', rulePayload: 'Example.exe' }] }
  assert.deepEqual(await fixture(response).connections(), response)
  await assert.rejects(fixture({ connections: 'invalid' }).connections(), /格式错误/)
  const runtime = fixture(null)
  runtime.request = async () => { throw new Error('offline') }
  await assert.rejects(runtime.connections(), /offline/)
})
