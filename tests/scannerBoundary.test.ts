import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import test, { type TestContext } from 'node:test'
import { createScanMiddleware, previewPort } from '../tooling/vite/applicationScanner.ts'

async function start(t: TestContext, scan: Parameters<typeof createScanMiddleware>[0], platform: NodeJS.Platform = 'win32') {
  const middleware = createScanMiddleware(scan, platform)
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end() }))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const port = (server.address() as AddressInfo).port
  return (headers: Record<string, string>, method = 'GET') => new Promise<{ status: number; body: string; cache?: string }>((resolve, reject) => {
    // 拒绝请求后不复用临时测试服务的连接，避免空闲连接关闭与下次请求竞态。
    const req = request({ agent: false, hostname: '127.0.0.1', port, path: '/api/applications', headers, method }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode!, body, cache: res.headers['cache-control'] }))
    })
    req.on('error', reject)
    req.end()
  })
}

const localHeaders = { host: `127.0.0.1:${previewPort}`, 'x-approute-ui': '1' }

test('跨站、非本机 Host、无专用请求头及写入请求都不能触发扫描', async (t) => {
  let scans = 0
  const call = await start(t, async () => { scans++; return { applications: [], scannedAt: '' } })
  for (const headers of [
    { ...localHeaders, origin: 'https://example.com' },
    { ...localHeaders, host: `example.com:${previewPort}` },
    { host: localHeaders.host },
  ]) assert.equal((await call(headers)).status, 403)
  assert.equal((await call(localHeaders, 'POST')).status, 403)
  assert.equal(scans, 0)
})

test('授权的本机请求返回扫描结果且禁止缓存', async (t) => {
  const call = await start(t, async () => ({ applications: [], scannedAt: '2026-11-09T00:00:00.000Z' }))
  const result = await call({ ...localHeaders, origin: `http://${localHeaders.host}` })
  assert.equal(result.status, 200)
  assert.equal(result.cache, 'no-store')
  assert.deepEqual(JSON.parse(result.body).applications, [])
})

test('尚未适配的 Linux 环境明确返回不支持，不执行扫描', async (t) => {
  let scans = 0
  const call = await start(t, async () => { scans++; return { applications: [], scannedAt: '' } }, 'linux')
  assert.equal((await call(localHeaders)).status, 501)
  assert.equal(scans, 0)
})

test('扫描失败不会把内部异常或本机路径返回界面', async (t) => {
  const call = await start(t, async () => { throw new Error('private-scanner-details') })
  const result = await call(localHeaders)
  assert.equal(result.status, 500)
  assert.equal(result.body.includes('private-scanner-details'), false)
})
