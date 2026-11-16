import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { endpointFromConfig, inspectMihomoFile, MihomoEndpointInspector } from '../src/main/adapters/mihomoEndpointInspector.ts'

async function endpoint(t: TestContext, handler?: http.RequestListener) {
  const seen: { method?: string; url?: string; authorization?: string }[] = []
  const server = http.createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, authorization: req.headers.authorization })
    if (handler) return handler(req, res)
    if (req.headers.authorization !== 'Bearer fixture-only-key') { res.writeHead(401); res.end('fixture-only-key'); return }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(req.url === '/version' ? { meta: true, version: 'v1.19.32', secret: 'private-response' } : req.url === '/configs' ? { mode: 'rule', 'find-process-mode': 'strict', secret: 'private-response' } : { connections: [], secret: 'private-response' }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  return { port: (server.address() as import('node:net').AddressInfo).port, seen }
}
test('Mihomo 探测仅发固定回环 GET，接口可读不能宣称配置可写或 UDP 可用', async t => {
  const local = await endpoint(t)
  const result = await new MihomoEndpointInspector({ port: local.port, secret: 'fixture-only-key' }).inspect()
  assert.equal(result.state, 'needs-setup')
  assert.deepEqual(result.capabilities, { processRules: 'supported', persistentRules: 'unknown', connectionInspection: 'supported', udp: 'unknown' })
  assert.equal(result.version, 'v1.19.32')
  assert.deepEqual(local.seen.map(item => item.url).sort(), ['/configs', '/connections', '/version'])
  assert.ok(local.seen.every(item => item.method === 'GET' && item.authorization === 'Bearer fixture-only-key'))
  assert.doesNotMatch(JSON.stringify(result), /fixture-only-key|private-response/)
  const denied = await new MihomoEndpointInspector({ port: local.port }).inspect()
  assert.equal(denied.state, 'unavailable'); assert.equal(local.seen.length, 4)
  assert.doesNotMatch(JSON.stringify(denied), /fixture-only-key/)
})
test('控制配置只接受本机控制端口，不把代理入口或远端地址当管理接口', () => {
  for (const host of ['127.0.0.1', 'localhost', '0.0.0.0']) assert.deepEqual(endpointFromConfig(`external-controller: ${host}:9090\nsecret: local-only`), { port: 9090, secret: 'local-only' })
  for (const input of ['mixed-port: 7890', 'external-controller: remote.example:9090', 'external-controller: https://127.0.0.1:9090', 'external-controller: 127.0.0.1:0', 'external-controller: 127.0.0.1:65536', 'external-controller: 127.0.0.1:9090\nsecret: [bad]']) assert.throws(() => endpointFromConfig(input))
  for (const request of [{ port: 1.5 }, { port: -1 }, { port: 0 }, { port: 65536 }, { port: 80, secret: '\r\nInjected: test' }]) assert.throws(() => new MihomoEndpointInspector(request))
})
test('文件检查只返回白名单结果，取消之外的坏文件也不回传路径或内容', async t => {
  const local = await endpoint(t), directory = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-probe-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'runtime.yaml'), content = `external-controller: 127.0.0.1:${local.port}\nsecret: fixture-only-key\nproxies: [private-example]`
  await fs.writeFile(file, content)
  assert.equal((await inspectMihomoFile(file)).state, 'needs-setup')
  assert.equal(await fs.readFile(file, 'utf8'), content)
  await fs.writeFile(file, 'x'.repeat(2 * 1024 * 1024 + 1))
  const bad = await inspectMihomoFile(file)
  assert.equal(bad.state, 'unavailable'); assert.equal(local.seen.length, 3)
  assert.ok(!JSON.stringify(bad).includes(directory))
})
test('未确认内核、重定向和异常响应均不扩大请求范围', async t => {
  for (const mode of ['redirect', 'other-engine', 'oversized', 'malformed']) {
    const local = await endpoint(t, (_req, res) => {
      if (mode === 'redirect') { res.writeHead(302, { Location: 'http://remote.invalid' }); res.end(); return }
      res.end(mode === 'other-engine' ? JSON.stringify({ version: 'other' }) : mode === 'oversized' ? 'x'.repeat(2 * 1024 * 1024 + 1) : 'invalid-json')
    })
    assert.equal((await new MihomoEndpointInspector({ port: local.port }).inspect()).state, 'unavailable')
    assert.equal(local.seen.length, 1)
  }
})
test('部分读取失败和进程识别关闭分别显示未知与未启用', async t => {
  const local = await endpoint(t, (req, res) => {
    if (req.url === '/connections') { res.writeHead(403); res.end('private'); return }
    res.end(JSON.stringify(req.url === '/version' ? { meta: true, version: 'v1.19.32' } : { mode: 'global', 'find-process-mode': 'off' }))
  })
  const result = await new MihomoEndpointInspector({ port: local.port }).inspect()
  assert.equal(result.capabilities.processRules, 'unsupported'); assert.equal(result.capabilities.connectionInspection, 'unknown')
  assert.ok(result.reasons.includes('当前内核不是规则模式。'))
  assert.equal(result.state, 'needs-setup')
})
test('控制接口无响应时在期限内返回，不一直挂起桌面检查', async t => {
  const local = await endpoint(t, () => {}), start = Date.now()
  assert.equal((await new MihomoEndpointInspector({ port: local.port }).inspect()).state, 'unavailable')
  assert.ok(Date.now() - start < 6000)
})
