import { appRouteDataDirectory, clashPartyDataDirectory } from '../src/main/platform/paths.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import http from 'node:http'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as wait } from 'node:timers/promises'
import YAML from 'yaml'
import { RoutingService } from '../src/main/services/routingService.ts'
import { RoutingHistoryService } from '../src/main/services/routingHistory.ts'
import { TemporaryRoutingService } from '../src/main/services/temporaryRouting.ts'
import { watchTemporaryRouting } from '../src/main/recovery/temporaryGuardian.ts'
import { MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'
import { findInstalledCore, validateWithCore } from '../src/main/adapters/clashPartyConfiguration.ts'
import { installRecoveryKit } from '../src/main/recovery/recoveryKit.ts'
import { watchTransaction } from '../src/main/recovery/watchTransaction.ts'
import { atomicWrite, digest, readOptional } from '../src/main/storage/localState.ts'
import { waitForCoreRules } from './lib/core-readiness.ts'

// 子进程只接受本脚本在仓库隔离目录中生成的清单，绝不使用日常客户端的自动发现。
const workspace = path.resolve('.runtime/recovery-faults')
if (['--watch', '--temporary-watch'].includes(process.argv[2])) {
  const manifestPath = path.resolve(process.argv[3])
  assert.ok(manifestPath.startsWith(workspace + path.sep))
  const config = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  assert.ok(config.root.startsWith(workspace + path.sep) && config.partyRoot.startsWith(workspace + path.sep))
  assert.match(config.pipe, process.platform === 'win32' ? /^\\\\\.\\pipe\\AppRouteFaultTest-/ : /^\/tmp\/AppRouteFaultTest-\d+\.sock$/)
  if (process.argv[2] === '--watch') await watchTransaction(new RoutingService({ root: config.root, partyRoot: config.partyRoot, runtime: async () => new MihomoRuntime(config.pipe) }), process.argv[4])
  else {
    assert.match(config.probeUrl, /^http:\/\/127\.0\.0\.1:\d+\/probe$/)
    const owned = [], corePath = process.env.APPROUTE_TEST_CORE ?? await findInstalledCore()
    const service = new RoutingService({ root: config.root, partyRoot: config.partyRoot, runtime: async () => new MihomoRuntime(config.pipe),
      validate: async (text, workDir) => { const file = path.join(config.root, 'candidate.yaml'); await atomicWrite(file, text); await validateWithCore(corePath, file, workDir) },
      installKit: () => installRecoveryKit(config.root, path.resolve('.runtime/recovery.cjs'), async () => undefined),
      probe: (runtime) => runtime.delay('DIRECT', config.probeUrl).then(value => value.delay > 0, () => false),
      guardian: async id => {
        const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--watch', manifestPath, id], { windowsHide: true, stdio: 'ignore' }); owned.push(child)
        for (let i = 0; i < 50; i++) { if (await readOptional(path.join(config.root, 'transactions', id + '.ready'))) return; await wait(100) }
        throw new Error('Isolated expiry guardian not ready')
      },
    })
    try { await watchTemporaryRouting(service) }
    finally { for (const child of owned) if (child.exitCode === null && !child.signalCode) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited } }
  }
} else await verify()

async function verify() {
  assert.ok(['win32', 'darwin'].includes(process.platform))
  const folder = path.join(workspace, String(Date.now())), party = path.join(folder, 'party'), root = path.join(folder, 'data')
  await fs.mkdir(path.join(party, 'work'), { recursive: true })
  const protectedFiles = [path.join(appRouteDataDirectory(), 'state.json'), ...['config.yaml', 'profile.yaml', 'override.yaml', 'override/approute-managed-v1.js', 'work/config.yaml'].map(file => path.join(clashPartyDataDirectory(), file))]
  const hashProtected = () => Promise.all(protectedFiles.map(async file => digest(await fs.readFile(file).catch(() => Buffer.from('missing')))))
  const before = await hashProtected()
  const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve))
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
  const pipe = process.platform === 'win32' ? '\\\\.\\pipe\\AppRouteFaultTest-' + Date.now() : '/tmp/AppRouteFaultTest-' + Date.now() + '.sock', runtime = new MihomoRuntime(pipe)
  const config = { mode: 'rule', 'mixed-port': port, 'allow-lan': false, 'bind-address': '127.0.0.1', 'find-process-mode': 'strict', tun: { enable: false }, dns: { enable: false }, 'log-level': 'silent', rules: ['DOMAIN,original.example,DIRECT', 'MATCH,DIRECT'] }
  for (const [file, text] of Object.entries({ 'config.yaml': 'operationMode: standard\n', 'profile.yaml': 'current: isolated\n', 'override.yaml': 'items: []\n', 'work/config.yaml': YAML.stringify(config) })) await atomicWrite(path.join(party, file), text)
  const manifest = path.join(folder, 'manifest.json')
  await fs.writeFile(manifest, JSON.stringify({ root, partyRoot: party, pipe }))
  const corePath = process.env.APPROUTE_TEST_CORE ?? await findInstalledCore(), children = new Set(), results = []
  let core, guardian, localServer
  async function stop(child) {
    if (!child || child.exitCode !== null || child.signalCode) return
    const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited
  }
  async function startCore() {
    const expected = YAML.parse(await fs.readFile(path.join(party, 'work/config.yaml'), 'utf8')).rules
    core = spawn(corePath, ['-d', path.join(party, 'work'), '-f', path.join(party, 'work/config.yaml'), process.platform === 'win32' ? '-ext-ctl-pipe' : '-ext-ctl-unix', pipe], { windowsHide: true, stdio: 'ignore' }); children.add(core)
    await waitForCoreRules(() => runtime.rules(), expected, { exited: () => core.exitCode !== null || Boolean(core.signalCode) })
  }
  async function waitUntil(predicate) {
    for (let i = 0; i < 100; i++) { if (await predicate()) return; await wait(100) }
    throw new Error('Isolated recovery condition timed out')
  }
  const options = { root, partyRoot: party, runtime: async () => runtime, trialMs: 3500, validate: (text, workDir) => { const candidate = path.join(root, 'candidate.yaml'); return atomicWrite(candidate, text).then(() => validateWithCore(corePath, candidate, workDir)) },
    installKit: () => installRecoveryKit(root, path.resolve('.runtime/recovery.cjs'), async () => undefined),
    guardian: async id => {
      guardian = spawn(process.execPath, [fileURLToPath(import.meta.url), '--watch', manifest, id], { windowsHide: true, stdio: 'ignore' }); children.add(guardian)
      await waitUntil(async () => Boolean(await readOptional(path.join(root, 'transactions', id + '.ready'))))
    } }
  const service = new RoutingService(options)
  const probe = { id: 'fault-probe', name: 'Fault probe', processes: ['AppRouteFaultProbe.exe'], category: '其他应用', source: 'manual', mode: 'direct' }
  const apply = async () => service.apply({ revision: (await service.state()).revision, applications: [probe] })
  const originalRules = async () => assert.deepEqual((await runtime.rules()).rules.map(rule => rule.payload), ['original.example', ''])
  try {
    await startCore()
    let pending = await apply()
    await waitUntil(async () => !(await service.state()).pendingId)
    assert.equal((await service.transaction(pending.pending.id)).phase, 'rolled-back'); await originalRules()
    results.push({ scenario: 'real-guardian-timeout', passed: true })

    pending = await apply(); await stop(guardian)
    await wait(Math.max(0, pending.pending.deadline - Date.now()) + 50)
    await new RoutingService(options).reconcileInterrupted()
    assert.equal((await service.state()).pendingId, undefined); await originalRules()
    results.push({ scenario: 'guardian-killed-service-recreated', passed: true })

    pending = await apply(); await stop(core)
    await waitUntil(async () => (await service.transaction(pending.pending.id)).phase === 'recovery-required')
    assert.ok((await service.state()).pendingId)
    await startCore(); await new RoutingService(options).reconcileInterrupted()
    assert.equal((await service.state()).pendingId, undefined); await originalRules()
    results.push({ scenario: 'core-offline-at-timeout-reconnect', passed: true })

    pending = await apply(); await stop(guardian)
    const updated = { ...config, rules: ['DOMAIN,new-subscription.example,DIRECT', 'MATCH,DIRECT'] }
    const script = await fs.readFile(service.party.scriptPath, 'utf8')
    const generated = JSON.parse(JSON.stringify(vm.runInNewContext(script + '\nmain(config)', { config: updated })))
    await atomicWrite(path.join(party, 'profile.yaml'), 'current: changed\n')
    await atomicWrite(path.join(party, 'work/config.yaml'), YAML.stringify(generated)); await runtime.reload(YAML.stringify(generated))
    await wait(Math.max(0, pending.pending.deadline - Date.now()) + 50); await service.reconcileInterrupted()
    assert.deepEqual((await runtime.rules()).rules.map(rule => rule.payload), ['new-subscription.example', ''])
    assert.equal((await service.state()).pendingId, undefined)
    results.push({ scenario: 'configuration-regenerated-during-pending', passed: true, boundary: 'isolated profile generation and real core; not a real Clash Party subscription switch' })

    pending = await apply(); await service.confirm(pending.pending.id)
    const stable = await fs.readFile(service.statePath, 'utf8')
    const confirmedScript = await fs.readFile(service.party.scriptPath, 'utf8')
    const restartConfig = JSON.parse(JSON.stringify(vm.runInNewContext(confirmedScript + '\nmain(config)', { config: updated })))
    await atomicWrite(path.join(party, 'work/config.yaml'), YAML.stringify(restartConfig)); await stop(core); await startCore()
    await service.reconcileInterrupted()
    const restarted = await service.status()
    assert.equal(restarted.rulesLoaded, true, JSON.stringify({ connected: restarted.connected, warning: restarted.warning, untracked: restarted.untrackedRuleCount, runtimeRules: (await runtime.rules()).rules }))
    assert.equal(await fs.readFile(service.statePath, 'utf8'), stable)
    results.push({ scenario: 'confirmed-real-core-restart-no-replay', passed: true })
    assert.equal((await service.recoverAll()).restored, true)

    // 独立命名的测试进程产生真实连接；不接触任何用户应用或系统代理。
    localServer = http.createServer((request, response) => {
      if (request.url === '/probe') {
        // Mihomo v1.19.32 的测速 API 将 0 ms 视为失败；快速 Mac 回环请求可能不足 1 ms。
        // 只延迟测试服务器响应，让真实测速产生可表示的非零值，不伪造探测成功。
        setTimeout(() => { response.writeHead(204); response.end() }, 20); return
      }
      response.writeHead(200, { 'Content-Type': 'text/plain' }); response.write('isolated connection\n')
    })
    await new Promise(resolve => localServer.listen(0, '127.0.0.1', resolve))
    const targetPort = localServer.address().port
    const executable = path.join(folder, process.platform === 'win32' ? 'AppRouteHistoryProbe.exe' : 'AppRouteHistoryProbe.app/Contents/MacOS/Probe')
    await fs.mkdir(path.dirname(executable), { recursive: true }); await fs.copyFile(process.execPath, executable)
    if (process.platform !== 'win32') await fs.chmod(executable, 0o755)
    const application = { id: 'history-probe', name: 'History probe', path: executable, processes: [path.basename(executable)], processPaths: [executable], category: '其他应用', source: 'manual', mode: 'direct' }
    service.options.trialMs = 15000
    const probeDelays = []
    service.options.probe = async () => runtime.delay('DIRECT', `http://127.0.0.1:${targetPort}/probe`).then(({ delay }) => { probeDelays.push(delay); return delay > 0 }, () => false)
    pending = await service.apply({ revision: (await service.state()).revision, applications: [application] })
    await service.confirm(pending.pending.id)
    function connect(label) {
      const code = `const http=require('node:http');const req=http.get({host:'127.0.0.1',port:${port},path:'http://127.0.0.1:${targetPort}/${label}',headers:{host:'127.0.0.1:${targetPort}'}},r=>{console.log('status',r.statusCode);r.resume()}).on('error',e=>{console.error(e.code);process.exit(2)});req.on('socket',s=>s.on('connect',()=>console.log('sourcePort',s.localPort)));`
      const child = spawn(executable, ['-e', code], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      child.responseLog = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { child.responseLog = (child.responseLog + chunk.toString()).slice(0, 500) })
      children.add(child); return child
    }
    const beforeUndo = connect('before')
    try { await waitUntil(async () => (await service.status()).evidence.some(item => item.applicationId === application.id && item.matched)) }
    catch (error) {
      await fs.writeFile(path.join(folder, 'connection-failure.json'), JSON.stringify({ childExit: beforeUndo.exitCode, childSignal: beforeUndo.signalCode, response: beforeUndo.responseLog, status: await service.status(), connections: await runtime.connections() }, null, 2))
      throw error
    }
    await stop(beforeUndo)
    const history = new RoutingHistoryService(new RoutingService(service.options)), list = await history.list()
    assert.equal(list.items[0].undoReason, undefined)
    const undone = await history.undo({ id: list.items[0].id, revision: list.revision })
    // 自动事务会将拒绝原因包装在结果中；断言必须保留原因，才能定位不同平台的真实失败。
    assert.equal(undone.outcome, 'applied', undone.message)
    const afterUndo = connect('after')
    // 撤销后 strict 模式不一定读取进程路径；用子进程报告的真实 TCP 源端口关联同一连接。
    await waitUntil(async () => {
      const sourcePort = Number(/sourcePort (\d+)/.exec(afterUndo.responseLog)?.[1])
      return Number.isSafeInteger(sourcePort) && (await runtime.connections()).connections.some(connection => Number(connection.metadata.sourcePort) === sourcePort && Number(connection.metadata.destinationPort) === targetPort && connection.rule === 'Match' && connection.chains.includes('DIRECT'))
    })
    await stop(afterUndo)
    assert.deepEqual((await runtime.rules()).rules.map(rule => rule.payload), ['new-subscription.example', ''])
    assert.equal((await service.state()).managed.length, 0)
    assert.equal(probeDelays.length, 4); assert.ok(probeDelays.every(delay => delay > 0))
    results.push({ scenario: 'history-undo-real-process-connection', passed: true, before: 'ProcessPath DIRECT', after: 'original Match DIRECT', probeDelaysMs: [...probeDelays], boundary: 'isolated executable, loopback server and Mihomo core; not daily app traffic' })

    // 真正独立的期限进程在没有桌面页面计时器时恢复；只传仓库夹具清单，不自动发现日常客户端。
    await fs.writeFile(manifest, JSON.stringify({ root, partyRoot: party, pipe, probeUrl: `http://127.0.0.1:${targetPort}/probe` }))
    let temporaryWatcher
    service.options.resolveFamily = async app => ({ ...app, processPaths: [app.path] })
    service.options.temporaryGuardian = async () => {
      temporaryWatcher = spawn(process.execPath, [fileURLToPath(import.meta.url), '--temporary-watch', manifest], { windowsHide: true, stdio: 'ignore' }); children.add(temporaryWatcher)
      await waitUntil(async () => { const value = await readOptional(path.join(root, 'temporary-monitor', 'ready.json')); return value && JSON.parse(value).pid === temporaryWatcher.pid && JSON.parse(value).revision === (await service.state()).revision })
    }
    const temporary = new TemporaryRoutingService(service, Date.now, 5000)
    const timed = await temporary.apply({ revision: (await service.state()).revision, application, minutes: 15 })
    assert.equal(timed.outcome, 'applied', timed.message)
    assert.ok((await service.state()).managed[0].temporary)
    const duringTemporary = connect('temporary-before')
    await waitUntil(async () => (await service.status()).evidence.some(item => item.applicationId === application.id && item.matched))
    await stop(duringTemporary)
    await waitUntil(async () => !(await service.state()).managed.length && temporaryWatcher.exitCode === 0)
    const afterTemporary = connect('temporary-after')
    await waitUntil(async () => {
      const sourcePort = Number(/sourcePort (\d+)/.exec(afterTemporary.responseLog)?.[1])
      return Number.isSafeInteger(sourcePort) && (await runtime.connections()).connections.some(connection => Number(connection.metadata.sourcePort) === sourcePort && Number(connection.metadata.destinationPort) === targetPort && connection.rule === 'Match' && connection.chains.includes('DIRECT'))
    })
    await stop(afterTemporary)
    assert.deepEqual((await runtime.rules()).rules.map(rule => rule.payload), ['new-subscription.example', ''])
    assert.equal(await readOptional(path.join(root, 'temporary-monitor', 'ready.json')), null)
    results.push({ scenario: 'temporary-route-independent-expiry', passed: true, before: 'ProcessPath DIRECT', after: 'original Match DIRECT', boundary: 'separate watcher process, isolated executable and real core; no UI timer or daily routing' })
  } finally {
    for (const child of children) await stop(child)
    if (localServer) { localServer.closeAllConnections(); await new Promise(resolve => localServer.close(resolve)) }
    const unchanged = JSON.stringify(await hashProtected()) === JSON.stringify(before)
    const report = { checkedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, results, originalConfigurationUnchanged: unchanged, physicalSleepTested: false }
    await fs.writeFile(path.join(folder, 'result.json'), JSON.stringify(report, null, 2))
    await fs.mkdir('output', { recursive: true })
    await fs.writeFile('output/recovery-fault-check.json', JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report)); assert.ok(unchanged, 'Daily configuration changed during isolated acceptance')
  }
}
