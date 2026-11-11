import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as wait } from 'node:timers/promises'
import YAML from 'yaml'
import { RoutingService } from '../src/main/services/routingService.ts'
import { MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'
import { findInstalledCore } from '../src/main/adapters/clashPartyConfiguration.ts'
import { installRecoveryKit } from '../src/main/recovery/recoveryKit.ts'
import { watchTransaction } from '../src/main/recovery/watchTransaction.ts'
import { atomicWrite, digest, readOptional } from '../src/main/storage/localState.ts'

// 子进程只接受本脚本在仓库隔离目录中生成的清单，绝不使用日常客户端的自动发现。
const workspace = path.resolve('.runtime/recovery-faults')
if (process.argv[2] === '--watch') {
  const manifestPath = path.resolve(process.argv[3])
  assert.ok(manifestPath.startsWith(workspace + path.sep))
  const config = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  assert.ok(config.root.startsWith(workspace + path.sep) && config.partyRoot.startsWith(workspace + path.sep))
  assert.match(config.pipe, /^\\\\\.\\pipe\\AppRouteFaultTest-/)
  await watchTransaction(new RoutingService({ root: config.root, partyRoot: config.partyRoot, runtime: async () => new MihomoRuntime(config.pipe) }), process.argv[4])
} else await verify()

async function verify() {
  assert.equal(process.platform, 'win32')
  const folder = path.join(workspace, String(Date.now())), party = path.join(folder, 'party'), root = path.join(folder, 'data')
  await fs.mkdir(path.join(party, 'work'), { recursive: true })
  const protectedFiles = [path.join(process.env.LOCALAPPDATA, 'AppRoute/state.json'), ...['config.yaml', 'profile.yaml', 'override.yaml', 'override/approute-managed-v1.js', 'work/config.yaml'].map(file => path.join(process.env.APPDATA, 'mihomo-party', file))]
  const hashProtected = () => Promise.all(protectedFiles.map(async file => digest(await fs.readFile(file).catch(() => Buffer.from('missing')))))
  const before = await hashProtected()
  const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve))
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
  const pipe = '\\\\.\\pipe\\AppRouteFaultTest-' + Date.now(), runtime = new MihomoRuntime(pipe)
  const config = { mode: 'rule', 'mixed-port': port, 'allow-lan': false, 'bind-address': '127.0.0.1', 'find-process-mode': 'strict', tun: { enable: false }, dns: { enable: false }, 'log-level': 'silent', rules: ['DOMAIN,original.example,DIRECT', 'MATCH,DIRECT'] }
  for (const [file, text] of Object.entries({ 'config.yaml': 'operationMode: standard\n', 'profile.yaml': 'current: isolated\n', 'override.yaml': 'items: []\n', 'work/config.yaml': YAML.stringify(config) })) await atomicWrite(path.join(party, file), text)
  const manifest = path.join(folder, 'manifest.json')
  await fs.writeFile(manifest, JSON.stringify({ root, partyRoot: party, pipe }))
  const corePath = await findInstalledCore(), children = new Set(), results = []
  let core, guardian
  async function stop(child) {
    if (!child || child.exitCode !== null || child.signalCode) return
    const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited
  }
  async function startCore() {
    core = spawn(corePath, ['-d', path.join(party, 'work'), '-f', path.join(party, 'work/config.yaml'), '-ext-ctl-pipe', pipe], { windowsHide: true, stdio: 'ignore' }); children.add(core)
    for (let i = 0; i < 80; i++) { try { await runtime.version(); return } catch { await wait(100) } }
    throw new Error('Isolated core did not start')
  }
  async function waitUntil(predicate) {
    for (let i = 0; i < 100; i++) { if (await predicate()) return; await wait(100) }
    throw new Error('Isolated recovery condition timed out')
  }
  const options = { root, partyRoot: party, runtime: async () => runtime, trialMs: 3500,
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
  } finally {
    for (const child of children) await stop(child)
    const unchanged = JSON.stringify(await hashProtected()) === JSON.stringify(before)
    const report = { checkedAt: new Date().toISOString(), results, originalConfigurationUnchanged: unchanged, physicalSleepTested: false }
    await fs.writeFile(path.join(folder, 'result.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report)); assert.ok(unchanged, 'Daily configuration changed during isolated acceptance')
  }
}
