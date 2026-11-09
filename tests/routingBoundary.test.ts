import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import { createRoutingApi } from '../tooling/vite/routingApi.ts'
import { RoutingService } from '../src/main/services/routingService.ts'

test('真实写入接口必须同源且持有当前会话；拒绝伪造令牌和超大请求', async t => {
  let writes = 0
  const service = new RoutingService()
  service.recoverAll = async () => { writes++; return { restored: true, message: 'test' } }
  const middleware = createRoutingApi(service)
  const server = createServer((req, res) => middleware(req, res, () => res.end()))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())))
  const port = (server.address() as AddressInfo).port
  const headers = { host: '127.0.0.1:4318', 'x-approute-ui': '1', 'content-type': 'application/json' }
  function call(route: string, method: string, extra: Record<string, string> = {}, body = '{}') {
    return new Promise<{ code: number; body: any }>((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path: `/api/integration/${route}`, method, headers: { ...headers, ...extra } }, res => {
        let text = ''; res.on('data', chunk => { text += chunk }); res.on('end', () => resolve({ code: res.statusCode!, body: JSON.parse(text) }))
      }); req.on('error', reject); req.end(method === 'POST' ? body : undefined)
    })
  }
  const session = (await call('session', 'GET')).body.session
  const origin = 'http://127.0.0.1:4318'
  const rejected: Record<string, string>[] = [
    { origin }, { origin, 'x-approute-session': 'é'.repeat(64) },
    { origin: 'https://other.example', 'x-approute-session': session },
    { 'x-approute-session': session },
    { origin, 'x-approute-session': session, host: 'other.example:4318' },
  ]
  for (const extra of rejected) assert.equal((await call('recover', 'POST', extra)).code, 403)
  assert.equal(writes, 0)
  const valid = { origin, 'x-approute-session': session }
  assert.equal((await call('recover', 'POST', valid, JSON.stringify({ value: 'a'.repeat(130 * 1024) }))).code, 400)
  assert.equal(writes, 0)
  assert.equal((await call('recover', 'POST', valid)).code, 200)
  assert.equal(writes, 1)
})
