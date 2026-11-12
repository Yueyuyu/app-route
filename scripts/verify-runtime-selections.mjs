import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import YAML from 'yaml'
import { MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'
import { findInstalledCore } from '../src/main/adapters/clashPartyConfiguration.ts'
import { appRouteDataDirectory, clashPartyDataDirectory } from '../src/main/platform/paths.ts'
import { digest } from '../src/main/storage/localState.ts'

// 使用独立内核、回环探测和虚构节点复现缓存回读；不发现或重载日常内核。
const folder = path.resolve('.runtime/selection-checks', String(Date.now()))
await fs.mkdir(folder, { recursive: true })
const protectedFiles = [path.join(appRouteDataDirectory(), 'state.json'), ...['config.yaml', 'profile.yaml', 'override.yaml', 'override/approute-managed-v1.js', 'work/config.yaml'].map(file => path.join(clashPartyDataDirectory(), file))]
const hashProtected = () => Promise.all(protectedFiles.map(async file => digest(await fs.readFile(file).catch(() => Buffer.from('missing')))))
const originalHashes = await hashProtected()
const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve))
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
let healthy = true
const probe = http.createServer((_request, response) => { response.writeHead(healthy ? 204 : 500); response.end() })
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${probe.address().port}`
const pipe = process.platform === 'win32' ? `\\\\.\\pipe\\AppRouteSelectionTest-${Date.now()}` : `/tmp/AppRouteSelectionTest-${Date.now()}.sock`
const runtime = new MihomoRuntime(pipe)
const config = { mode: 'rule', 'mixed-port': port, 'allow-lan': false, 'bind-address': '127.0.0.1', tun: { enable: false }, dns: { enable: false }, profile: { 'store-selected': true }, 'log-level': 'silent',
  proxies: [{ name: 'Node A', type: 'direct' }, { name: 'Node B', type: 'direct' }],
  'proxy-groups': [{ name: 'Fixture auto', type: 'fallback', proxies: ['Node A', 'Node B'], url, interval: 86400, lazy: true, 'expected-status': 204 },
    { name: 'Fixture manual', type: 'select', proxies: ['Node A', 'Node B'] }], rules: ['MATCH,DIRECT'] }
const payload = YAML.stringify(config), file = path.join(folder, 'config.yaml')
await fs.writeFile(file, payload)
const results = []
let child
const groups = async () => (await runtime.proxies()).proxies
const setFixed = () => runtime.request('PUT', '/proxies/Fixture%20auto', { name: 'Node B' })
async function failSelectedNode() {
  healthy = false
  await runtime.request('GET', `/proxies/Node%20B/delay?timeout=1000&expected=204&url=${encodeURIComponent(url)}`).catch(() => {})
  assert.equal((await groups())['Fixture auto'].fixed, '')
  healthy = true
}
try {
  child = spawn(process.env.APPROUTE_TEST_CORE ?? await findInstalledCore(), ['-d', folder, '-f', file, process.platform === 'win32' ? '-ext-ctl-pipe' : '-ext-ctl-unix', pipe], { windowsHide: true, stdio: 'ignore' })
  for (let attempt = 0; attempt < 80; attempt++) { try { await runtime.version(); break } catch { await wait(100) } }
  await runtime.request('PUT', '/proxies/Fixture%20manual', { name: 'Node B' })
  await setFixed(); await failSelectedNode()
  // 裸 API 是问题对照，只在独立内核运行。
  await runtime.request('PUT', '/configs?force=true', { payload })
  assert.equal((await groups())['Fixture auto'].fixed, 'Node B')
  results.push({ scenario: 'raw-reload-repins-stale-selection', reproduced: true })
  await failSelectedNode(); await runtime.reload(payload)
  assert.equal((await groups())['Fixture auto'].fixed, '')
  assert.equal((await groups())['Fixture manual'].now, 'Node B')
  await runtime.reload(payload)
  assert.equal((await groups())['Fixture auto'].fixed, '')
  results.push({ scenario: 'protected-reload-keeps-automatic-and-manual-selection', passed: true })
  await setFixed(); await runtime.reload(payload)
  assert.equal((await groups())['Fixture auto'].fixed, 'Node B')
  results.push({ scenario: 'intentional-fixed-selection-preserved', passed: true })
} finally {
  if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited }
  await new Promise(resolve => probe.close(resolve))
  const originalConfigurationUnchanged = JSON.stringify(await hashProtected()) === JSON.stringify(originalHashes)
  const report = { checkedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, results, originalConfigurationUnchanged }
  await fs.mkdir('output', { recursive: true })
  await fs.writeFile('output/runtime-selection-check.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  assert.ok(originalConfigurationUnchanged, 'Daily configuration changed during isolated check')
}
