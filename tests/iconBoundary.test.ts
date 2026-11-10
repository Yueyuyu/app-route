import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import test, { type TestContext } from 'node:test'
import { createIconMiddleware } from '../tooling/vite/applicationIcons.ts'
import type { ApplicationIconService } from '../src/main/services/applicationIconService.ts'

const headers = { host: '127.0.0.1:4318', origin: 'http://127.0.0.1:4318', 'x-approute-ui': '1', 'content-type': 'application/json' }
async function setup(t: TestContext) {
  let writes = 0
  const service = { state: async () => ({ applications: [] }), register: async () => { writes++; return {} }, replace: async () => { throw Object.assign(new Error('C:\\private\\secret'), { code: 'EACCES' }) }, image: async () => Buffer.from('fixture') } as unknown as ApplicationIconService
  const middleware = createIconMiddleware(service)
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end() }))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())))
  const port = (server.address() as AddressInfo).port
  const call = (route: string, method = 'GET', extra: Record<string, string> = {}, body?: string) => new Promise<{ status: number; body: string; type?: string }>((resolve, reject) => {
    const req = request({ agent: false, hostname: '127.0.0.1', port, path: route, method, headers: { ...headers, ...extra } }, res => {
      let result = ''; res.on('data', data => { result += data }); res.on('end', () => resolve({ status: res.statusCode!, body: result, type: res.headers['content-type'] }))
    }); req.on('error', reject); req.end(body)
  })
  return { call, writes: () => writes }
}

test('图标管理拒绝跨站、非本机和无会话写入；合法写入成功', async t => {
  const { call, writes } = await setup(t)
  assert.equal((await call('/api/icons/state', 'GET', { origin: 'https://evil.example' })).status, 403)
  assert.equal((await call('/api/icons/state', 'GET', { host: 'evil.example:4318' })).status, 403)
  assert.equal((await call('/api/icons/register', 'POST', {}, '{}')).status, 403)
  assert.equal(writes(), 0)
  const { session } = JSON.parse((await call('/api/icons/session')).body)
  assert.equal((await call('/api/icons/register', 'POST', { 'x-approute-session': session }, '{}')).status, 200)
  assert.equal(writes(), 1)
})

test('图片端点限制同源与固定哈希路径，写入错误不暴露个人路径', async t => {
  const { call } = await setup(t)
  const route = `/api/icons/image/cache/${'a'.repeat(64)}.png`
  assert.equal((await call(route, 'GET', { 'x-approute-ui': '', referer: 'http://127.0.0.1:4318/' })).type, 'image/png')
  assert.equal((await call(route, 'GET', { 'x-approute-ui': '', referer: 'https://evil.example/', 'sec-fetch-site': 'cross-site' })).status, 403)
  assert.equal((await call('/api/icons/image/cache/../../secret')).status, 404)
  const { session } = JSON.parse((await call('/api/icons/session')).body)
  const result = await call('/api/icons/replace', 'POST', { 'x-approute-session': session }, '{}')
  assert.equal(result.status, 400); assert.ok(!result.body.includes('private'))
  const malformed = await call('/api/icons/register', 'POST', { 'x-approute-session': session }, '{"private-secret"')
  assert.ok(!malformed.body.includes('private-secret'))
})

test('超限上传被拒绝，处理器不执行写入', async t => {
  const { call, writes } = await setup(t)
  const { session } = JSON.parse((await call('/api/icons/session')).body)
  const result = await call('/api/icons/register', 'POST', { 'x-approute-session': session }, JSON.stringify({ data: 'a'.repeat(4 * 1024 * 1024) }))
  assert.equal(result.status, 400); assert.equal(writes(), 0)
})
