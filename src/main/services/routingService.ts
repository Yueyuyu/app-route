import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import YAML from 'yaml'
import type { ApplyRequest, DiagnosticCheck, IntegrationStatus, ManagedApplication } from '../../shared/integration.ts'
import { addManagedRules, isProxyOnly, managedApplications, markerKey, overrideScript, removeManagedRules, ruleStrings, scriptHeader } from '../../core/managedRouting.ts'
import { ClashPartyConfiguration, findInstalledCore, validateWithCore } from '../adapters/clashPartyConfiguration.ts'
import { discoverPipe, MihomoRuntime } from '../adapters/mihomoRuntime.ts'
import { configRuleSignature, runtimeRuleSignature } from '../adapters/runtimeRules.ts'
import { atomicWrite, digest, readOptional, withLock, writeIfUnchanged } from '../storage/localState.ts'
import { installRecoveryKit, startGuardian } from '../recovery/recoveryKit.ts'

export interface RoutingState {
  revision: string
  managed: ManagedApplication[]
  appliedAt?: string
  pendingId?: string
  lastRecovery?: string
}
export interface Transaction {
  id: string
  phase: 'prepared' | 'pending' | 'confirmed' | 'rolled-back' | 'recovery-required'
  deadline: number
  previous: RoutingState
  beforeScript: string | null
  nextScript: string
  error?: string
}
export interface ServiceOptions {
  root?: string
  partyRoot?: string
  kitBundle?: string
  runtime?: () => Promise<MihomoRuntime>
  validate?: (text: string, workDir: string) => Promise<void>
  guardian?: (id: string) => Promise<void>
  installKit?: () => Promise<void>
  trialMs?: number
}

export class RoutingService {
  readonly root: string
  readonly party: ClashPartyConfiguration
  readonly statePath: string
  readonly recoveryPath: string
  readonly options: ServiceOptions
  constructor(options: ServiceOptions = {}) {
    this.options = options
    this.root = options.root ?? path.join(process.env.LOCALAPPDATA ?? '', 'AppRoute')
    this.party = new ClashPartyConfiguration(options.partyRoot ?? path.join(process.env.APPDATA ?? '', 'mihomo-party'))
    this.statePath = path.join(this.root, 'state.json')
    this.recoveryPath = path.join(this.root, 'recovery', 'Restore-Network.cmd')
  }
  runtime() { return this.options.runtime ? this.options.runtime() : discoverPipe().then(pipe => new MihomoRuntime(pipe)) }
  async state(): Promise<RoutingState> {
    const text = await readOptional(this.statePath)
    if (!text) return { revision: 'initial', managed: [] }
    const state = JSON.parse(text) as RoutingState
    if (typeof state.revision !== 'string' || !Array.isArray(state.managed)) throw new Error('本地状态损坏，请运行离线恢复。')
    return state
  }
  async save(state: RoutingState) { await atomicWrite(this.statePath, JSON.stringify(state, null, 2)) }
  transactionPath(id: string) {
    if (!/^[\w-]{1,80}$/.test(id)) throw new Error('恢复编号无效。')
    return path.join(this.root, 'transactions', `${id}.json`)
  }
  async transaction(id: string): Promise<Transaction> { return JSON.parse(await fs.readFile(this.transactionPath(id), 'utf8')) }
  async saveTransaction(tx: Transaction) { await atomicWrite(this.transactionPath(tx.id), JSON.stringify(tx, null, 2)) }
  async validate(text: string, workDir: string) {
    if (this.options.validate) return this.options.validate(text, workDir)
    const file = path.join(this.root, 'candidate.yaml')
    await atomicWrite(file, text)
    try { await validateWithCore(await findInstalledCore(), file, workDir) }
    finally { await fs.rm(file, { force: true }) }
  }
  async ensureRecovery() {
    if (this.options.installKit) return this.options.installKit()
    if (!this.options.kitBundle) throw new Error('恢复工具尚未构建，请先运行 npm run recovery:build。')
    await installRecoveryKit(this.root, this.options.kitBundle)
  }
  async matches(runtime: MihomoRuntime, managed: ManagedApplication[]): Promise<boolean> {
    const { rules } = await runtime.rules()
    const expected = ruleStrings(managed)
    return expected.every((text, i) => {
      const [, payload, proxy] = text.split(',')
      const actual = rules[i]
      return actual?.type.replaceAll('-', '').toLowerCase() === 'processname' && actual.payload === payload && actual.proxy === proxy && !actual.extra?.disabled
    })
  }
  async status(): Promise<IntegrationStatus> {
    const state = await this.state()
    const base: IntegrationStatus = { connected: false, revision: state.revision, choices: [], managed: state.managed, rulesLoaded: false, evidence: [], recoveryReady: await fs.access(this.recoveryPath).then(() => true, () => false), recoveryPath: this.recoveryPath, lastRecovery: state.lastRecovery }
    if (state.pendingId) {
      const tx = await this.transaction(state.pendingId)
      base.pending = { id: tx.id, deadline: tx.deadline }
    }
    try {
      const runtime = await this.runtime()
      const [version, config, proxies, connections, rulesLoaded] = await Promise.all([runtime.version(), runtime.config(), runtime.proxies(), runtime.connections(), this.matches(runtime, state.managed)])
      const snapshot = await this.party.snapshot()
      const persistenceObserved = Boolean(snapshot.config[markerKey])
      const changedTarget = state.managed.some(app => app.mode === 'proxy' && !isProxyOnly(app.target!, proxies.proxies))
      const declared = new Set([...(snapshot.config.proxies ?? []), ...(snapshot.config['proxy-groups'] ?? [])].map(p => p.name))
      const choices = Object.values(proxies.proxies).filter(p => declared.has(p.name) && isProxyOnly(p.name, proxies.proxies))
        .sort((a, b) => Number(Boolean(b.all)) - Number(Boolean(a.all)))
        .map(p => ({ name: p.name, type: p.type, current: p.now ?? p.name, udp: p.udp === true }))
      const evidence = connections.connections.flatMap(connection => {
        const app = state.managed.find(app => app.processes.some(p => p.toLowerCase() === (connection.metadata.process ?? '').toLowerCase()))
        if (!app || Date.parse(connection.start) < Date.parse(state.appliedAt ?? new Date().toISOString())) return []
        const chains = connection.chains ?? []
        const direct = chains.some(p => p === 'DIRECT')
        const matched = app.mode === 'direct' ? direct : chains.includes(app.target ?? '') && !direct
        return [{ applicationId: app.id, process: connection.metadata.process ?? '', destination: connection.metadata.host || connection.metadata.destinationIP || '未知目标', outbound: chains.join(' ← '), matched, startedAt: connection.start }]
      }).slice(0, 50)
      return { ...base, connected: true, version: version.version, mode: config.mode, tun: config.tun?.enable ?? false, processMode: config['find-process-mode'], choices, rulesLoaded: rulesLoaded && config.mode === 'rule', evidence,
        persistenceObserved,
        warning: config.mode !== 'rule' ? '当前内核不是规则模式，应用规则不会按预期执行。' : !rulesLoaded ? '规则与运行内核不一致，请检查覆写启用状态或恢复后重新应用。' : changedTarget ? '代理出口成员发生变化，可能包含直连或不可用节点，请重新选择出口。' : state.managed.length && !persistenceObserved ? '当前规则已加载，持久化尚未验证。首次登记后请正常退出并重新打开 Clash Party，再检查规则是否仍已加载。' : config.tun?.enable ? undefined : '当前使用系统代理；不遵循系统代理的软件可能不会进入 Clash，需以实际连接检查为准。' }
    } catch (e) { return { ...base, warning: (e as Error).message } }
  }
  async diagnose(): Promise<DiagnosticCheck[]> {
    const checks: DiagnosticCheck[] = []
    try {
      const runtime = await this.runtime()
      const cfg = await runtime.config()
      checks.push({ name: 'Clash Party 控制连接', ok: true, detail: `已连接，当前模式 ${cfg.mode}` })
      const state = await this.state()
      checks.push({ name: '应用规则加载', ok: cfg.mode === 'rule' && await this.matches(runtime, state.managed), detail: state.managed.length ? '核对已管理应用的前置规则' : '当前没有 AppRoute 专属规则' })
      const probes = await Promise.allSettled([
        runtime.delay('DIRECT', 'https://www.baidu.com/'),
        runtime.delay(state.managed.find(app => app.target)?.target ?? 'GLOBAL', 'https://www.gstatic.com/generate_204'),
      ])
      probes.forEach((probe, i) => checks.push({ name: i ? '当前出口 HTTPS 探测' : '国内直连 HTTPS 探测', ok: probe.status === 'fulfilled', detail: probe.status === 'fulfilled' ? `收到目标响应，${probe.value.delay} ms；不等同于所有应用均正常` : '探测失败：可能是网络、目标站点或出口异常' }))
    } catch (e) { checks.push({ name: 'Clash Party 控制连接', ok: false, detail: (e as Error).message }) }
    checks.push({ name: '独立离线恢复入口', ok: await fs.access(this.recoveryPath).then(() => true, () => false), detail: this.recoveryPath })
    return checks
  }
  async apply(request: ApplyRequest): Promise<IntegrationStatus> {
    await withLock(this.root, async () => {
      const previous = await this.state()
      if (previous.pendingId) throw new Error('请先保留或恢复上一轮试运行设置。')
      if (request.revision !== previous.revision) throw new Error('页面状态已过期，请刷新后重试。')
      if (!Array.isArray(request.applications) || !request.applications.length) throw new Error('请先选择应用。')
      const selected = managedApplications(request.applications, request.target)
      const selectedIds = new Set(request.applications.map(app => app.id))
      const managed = [...previous.managed.filter(app => !selectedIds.has(app.id)), ...selected]
      const allProcesses = managed.flatMap(app => app.processes.map(p => p.toLowerCase()))
      if (new Set(allProcesses).size !== allProcesses.length) throw new Error('这些进程已在其他已生效应用中，请先恢复对应应用。')
      const runtime = await this.runtime()
      const [cfg, proxies, snapshot] = await Promise.all([runtime.config(), runtime.proxies(), this.party.snapshot()])
      const rulesBefore = runtimeRuleSignature((await runtime.rules()).rules)
      const expectedBefore = configRuleSignature(addManagedRules(snapshot.config, previous.managed).rules ?? [])
      if (rulesBefore !== expectedBefore) throw new Error('磁盘与运行中的规则不一致，已停止修改。请先在 Clash Party 重新加载配置，再重试。')
      const runtimeBefore = digest(JSON.stringify({ cfg, rules: rulesBefore }))
      if (cfg.mode !== 'rule' || cfg['find-process-mode'] === 'off') throw new Error('需要 Clash Party 的规则模式及进程识别；AppRoute 不会自动切换全局网络设置。')
      if (snapshot.config.mode !== cfg.mode || snapshot.config['mixed-port'] !== cfg['mixed-port']) throw new Error('磁盘配置与内核模式或代理端口不同，请先在 Clash Party 重新加载配置。')
      const declared = new Set([...(snapshot.config.proxies ?? []), ...(snapshot.config['proxy-groups'] ?? [])].map(p => p.name))
      for (const app of managed) if (app.mode === 'proxy' && (!declared.has(app.target!) || !isProxyOnly(app.target!, proxies.proxies))) throw new Error('代理出口不存在或包含直连/拒绝成员，请重新选择。')
      const candidate = YAML.stringify(addManagedRules(snapshot.config, managed))
      await this.validate(candidate, snapshot.workDir)
      await this.ensureRecovery()
      await this.party.assertSnapshot(snapshot)
      if (digest(JSON.stringify({ cfg: await runtime.config(), rules: runtimeRuleSignature((await runtime.rules()).rules) })) !== runtimeBefore) throw new Error('内核运行配置发生变化，已取消本次应用。')
      const id = randomUUID()
      const tx: Transaction = { id, phase: 'prepared', deadline: Date.now() + (this.options.trialMs ?? 120000), previous, beforeScript: snapshot.script, nextScript: overrideScript(managed) }
      await atomicWrite(path.join(this.root, 'transactions', `${id}.baseline.yaml`), snapshot.workText)
      await atomicWrite(path.join(this.root, 'transactions', `${id}.registry.yaml`), snapshot.registry ?? 'items: []\n')
      await this.saveTransaction(tx)
      await this.save({ ...previous, revision: id, pendingId: id })
      try {
        if (this.options.guardian) await this.options.guardian(id); else await startGuardian(this.root, id)
        await this.party.assertSnapshot(snapshot)
        await writeIfUnchanged(this.party.scriptPath, snapshot.script, tx.nextScript)
        await this.party.register(snapshot)
        await runtime.reload(candidate)
        if (!await this.matches(runtime, managed)) throw new Error('内核未加载预期规则。')
        tx.phase = 'pending'; await this.saveTransaction(tx)
        await this.save({ revision: id, managed, appliedAt: new Date().toISOString(), pendingId: id })
      } catch (e) {
        try { await this.rollbackInternal(tx) } catch { throw new Error('应用失败且内核恢复未确认，请立即运行独立恢复工具。') }
        throw e
      }
    })
    return this.status()
  }
  async confirm(id: string) {
    await withLock(this.root, async () => {
      const state = await this.state(); const tx = await this.transaction(id)
      if (state.pendingId !== id || tx.phase !== 'pending') throw new Error('这次试运行已结束。')
      if (Date.now() >= tx.deadline) { await this.rollbackInternal(tx); throw new Error('试运行已超时，设置已恢复。') }
      const runtime = await this.runtime()
      if ((await runtime.config()).mode !== 'rule' || !await this.matches(runtime, state.managed)) throw new Error('规则状态异常，不能确认保留。')
      tx.phase = 'confirmed'; await this.saveTransaction(tx)
      await this.save({ ...state, revision: randomUUID(), pendingId: undefined })
    })
    return this.status()
  }
  async rollbackInternal(tx: Transaction) {
    const script = await readOptional(this.party.scriptPath)
    if (script !== tx.nextScript && script !== tx.beforeScript) throw new Error('覆写脚本出现外部修改，已停止覆盖。')
    await writeIfUnchanged(this.party.scriptPath, script, tx.beforeScript ?? overrideScript([]))
    // 按当前订阅重新组合旧的应用策略，避免将过期完整快照覆盖到新订阅。
    try {
      const snapshot = await this.party.snapshot()
      const candidate = YAML.stringify(addManagedRules(snapshot.config, tx.previous.managed))
      const runtime = await this.runtime()
      await runtime.reload(candidate)
      if (!await this.matches(runtime, tx.previous.managed)) throw new Error('旧规则未确认')
      tx.phase = 'rolled-back'; await this.saveTransaction(tx)
      await this.save({ ...tx.previous, revision: randomUUID(), pendingId: undefined, lastRecovery: new Date().toISOString() })
    } catch {
      tx.phase = 'recovery-required'; await this.saveTransaction(tx)
      await this.save({ ...tx.previous, revision: randomUUID(), pendingId: undefined, lastRecovery: '持久化规则已恢复；内核未确认，请运行离线恢复或在 Clash Party 重新加载。' })
      throw new Error('持久化规则已恢复，但无法确认内核；请运行离线恢复工具。')
    }
  }
  async rollback(id: string) {
    await withLock(this.root, async () => {
      const state = await this.state(); const tx = await this.transaction(id)
      if (state.pendingId !== id || !['prepared', 'pending'].includes(tx.phase)) return
      await this.rollbackInternal(tx)
    })
    return this.status()
  }
  async recoverAll() {
    return withLock(this.root, async () => {
      const script = await readOptional(this.party.scriptPath)
      if (script && !script.startsWith(scriptHeader)) throw new Error('覆写文件不是 AppRoute 所有，未覆盖。')
      await writeIfUnchanged(this.party.scriptPath, script, overrideScript([]))
      const previous = await this.state().catch(() => ({ revision: 'damaged', managed: [] } as RoutingState))
      if (previous.pendingId) {
        try { const tx = await this.transaction(previous.pendingId); tx.phase = 'rolled-back'; await this.saveTransaction(tx) }
        catch { /* 离线全部恢复不依赖可解析的历史事务，先解除全部专属规则。 */ }
      }
      await this.save({ revision: randomUUID(), managed: [], lastRecovery: new Date().toISOString() })
      try {
        const snapshot = await this.party.snapshot()
        const runtime = await this.runtime()
        await runtime.reload(YAML.stringify(removeManagedRules(snapshot.config)))
        const rules = await runtime.rules()
        const expected = configRuleSignature(removeManagedRules(snapshot.config).rules ?? [])
        if (runtimeRuleSignature(rules.rules) !== expected) throw new Error('原有规则未完整恢复')
        return { restored: true, message: '已停用 AppRoute 专属规则，并重新加载当前 Clash Party 原有配置。请自检或打开网页确认网络。' }
      } catch {
        return { restored: false, message: 'AppRoute 持久化规则已停用，但内核恢复未确认。请在 Clash Party 重新加载配置或启动内核；原有订阅、系统代理和 TUN 设置未被清空。' }
      }
    })
  }
}
