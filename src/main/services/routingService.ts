import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import YAML from 'yaml'
import type { ApplyRequest, AutomaticApplyResult, DiagnosticCheck, IntegrationStatus, ManagedApplication } from '../../shared/integration.ts'
import type { Application } from '../../shared/application.ts'
import { addManagedRules, assertNoProcessOverlap, configuredProxySelections, isProxyOnly, managedApplications, managedProcessMatches, markerKey, ownerId, overrideScript, removeManagedRules, ruleStrings, scriptHeader } from '../../core/managedRouting.ts'
import { ClashPartyConfiguration, findInstalledCore, validateWithCore } from '../adapters/clashPartyConfiguration.ts'
import { discoverPipe, MihomoRuntime } from '../adapters/mihomoRuntime.ts'
import { configRuleSignature, runtimeRuleSignature } from '../adapters/runtimeRules.ts'
import { atomicWrite, digest, readOptional, withLock, writeIfUnchanged } from '../storage/localState.ts'
import { installRecoveryKit, startGuardian } from '../recovery/recoveryKit.ts'
import { isDedicatedApplicationDirectory, resolveProcessFamily } from '../platform/windows/processFamily.ts'
import { normalizeProcessPath } from '../../core/processFamily.ts'
import { isFollowGroup, resolveProxyOutlet } from '../../core/proxyGroups.ts'
import type { ProxyStrategy, ProxyStrategyRequest } from '../../shared/proxyStrategy.ts'
import { strategyOwnership, strategyTestUrl, validateProxyStrategy } from '../../core/proxyStrategy.ts'
import { effectiveApplications } from '../../core/managedRouting.ts'
import { parseRoutingState, saveRoutingState, pruneCompletedTransactions } from '../storage/routingStateStore.ts'
import { OperationTimings } from './operationTimings.ts'

export interface RoutingState {
  version?: 1
  missingTargetAction?: 'block' | 'original'
  revision: string
  managed: ManagedApplication[]
  appliedAt?: string
  pendingId?: string
  lastRecovery?: string
  proxyGroup?: string
  proxyStrategy?: ProxyStrategy
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
  resolveFamily?: (app: Application, previousPaths?: string[]) => Promise<Application>
  probe?: (runtime: MihomoRuntime, target: string, url: string) => Promise<boolean>
}

export class RoutingService {
  readonly timings = new OperationTimings()
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
    return parseRoutingState(text)
  }
  async save(state: RoutingState) { await saveRoutingState(this.root, state) }
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
  async strategyMatches(runtime: MihomoRuntime, strategy?: ProxyStrategy): Promise<boolean> {
    if (!strategy || strategy.mode === 'existing') return true
    const { proxies } = await runtime.proxies()
    const group = proxies[strategyOwnership.name]
    const nodes = strategy.nodes.filter(name => proxies[name] && !proxies[name].all && isProxyOnly(name, proxies))
    return group?.type === (strategy.mode === 'fallback' ? 'Fallback' : 'URLTest') && JSON.stringify(group.all) === JSON.stringify(nodes.length ? nodes : ['REJECT'])
  }
  async matches(runtime: MihomoRuntime, managed: ManagedApplication[], strategy?: ProxyStrategy): Promise<boolean> {
    if (!await this.strategyMatches(runtime, strategy)) return false
    const { rules } = await runtime.rules()
    const expected = ruleStrings(effectiveApplications(managed, Object.keys((await runtime.proxies()).proxies)))
    return expected.every((text, i) => {
      const [type, payload, proxy] = text.split(',')
      const actual = rules[i]
      return actual?.type.replaceAll('-', '').toLowerCase() === type.replaceAll('-', '').toLowerCase() && actual.payload.toLowerCase() === payload.toLowerCase() && actual.proxy === proxy && !actual.extra?.disabled
    })
  }
  async status(): Promise<IntegrationStatus> {
    let dataIssue = false
    const state = await this.state().catch(() => { dataIssue = true; return { revision: 'damaged', managed: [] } as RoutingState })
    const base: IntegrationStatus = { dataIssue, timings: this.timings.snapshot(), missingTargetAction: state.missingTargetAction ?? 'original', connected: false, revision: state.revision, proxyGroup: state.proxyGroup, proxyStrategy: state.proxyStrategy, choices: [], managed: state.managed, rulesLoaded: false, evidence: [], recoveryReady: await fs.access(this.recoveryPath).then(() => true, () => false), recoveryPath: this.recoveryPath, lastRecovery: state.lastRecovery }
    if (state.pendingId) {
      const tx = await this.transaction(state.pendingId).catch(() => undefined)
      base.pending = { id: state.pendingId, deadline: tx?.deadline ?? 0, recoveryRequired: !tx || tx.phase === 'recovery-required' }
    }
    try {
      const runtime = await this.runtime()
      const [version, config, proxies, connections, rulesLoaded] = await Promise.all([runtime.version(), runtime.config(), runtime.proxies(), runtime.connections(), this.matches(runtime, state.managed, state.proxyStrategy)])
      const snapshot = await this.party.snapshot()
      const marker = snapshot.config[markerKey]
      const untrackedRuleCount = await this.countUntrackedRules(runtime, state, snapshot.config)
      const persistenceObserved = state.managed.length > 0 && marker?.owner === ownerId && JSON.stringify(marker.rules) === JSON.stringify(ruleStrings(effectiveApplications(state.managed, Object.keys(proxies.proxies))))
      const declared = new Set([...(snapshot.config.proxies ?? []), ...(snapshot.config['proxy-groups'] ?? [])].map(p => p.name))
      if (state.proxyStrategy && state.proxyStrategy.mode !== 'existing') declared.add(strategyOwnership.name)
      const strategyNodes = (snapshot.config.proxies ?? []).filter((p: any) => typeof p.name === 'string' && !/[,\r\n\x00-\x1f]/.test(p.name) && !proxies.proxies[p.name]?.all && resolveProxyOutlet(p.name, proxies.proxies).kind === 'proxy')
        .map((p: any) => { const outlet = resolveProxyOutlet(p.name, proxies.proxies); return { name: p.name as string, type: proxies.proxies[p.name].type, health: outlet.health, delay: outlet.health === 'unknown' ? undefined : outlet.delay } })
      const strategyLoaded = await this.strategyMatches(runtime, state.proxyStrategy)
      const custom = state.proxyStrategy?.mode !== 'existing' ? state.proxyStrategy : undefined
      const missing = custom?.nodes.filter(name => !strategyNodes.some((node: { name: string }) => node.name === name)) ?? []
      const strategyWarning = !strategyLoaded ? '专用代理策略未确认加载，请重新应用或恢复。' : missing.length ? `订阅中有 ${missing.length} 个候选节点已消失，请重新选择；全部消失时拒绝连接，不改为直连。`
        : custom?.nodes.every(name => resolveProxyOutlet(name, proxies.proxies).health === 'unhealthy') ? '所有候选节点最近探测均失败；等待内核重试或更换节点，不自动直连。' : undefined
      const choices = Object.values(proxies.proxies).filter(p => declared.has(p.name) && (isFollowGroup(p) || isProxyOnly(p.name, proxies.proxies)))
        .sort((a, b) => Number(Boolean(b.all)) - Number(Boolean(a.all)))
        .map(p => ({ name: p.name, type: p.type, current: p.now ?? p.name, udp: p.udp === true }))
      const groupChoices = choices.filter(p => isFollowGroup(proxies.proxies[p.name]))
      const targets = new Set([...state.managed.filter(app => app.mode === 'proxy').map(app => app.target!), ...groupChoices.map(p => p.name), ...(state.proxyGroup ? [state.proxyGroup] : [])])
      const outlets = Object.fromEntries([...targets].map(target => [target, resolveProxyOutlet(target, proxies.proxies)]))
      const changedTarget = state.managed.some(app => app.mode === 'proxy' && (!declared.has(app.target!) || ['missing', 'unknown'].includes(outlets[app.target!].kind)))
      const evidence = connections.connections.flatMap(connection => {
        const app = state.managed.find(app => managedProcessMatches(app, connection.metadata))
        if (!app || Date.parse(connection.start) < Date.parse(app.appliedAt ?? state.appliedAt ?? new Date().toISOString())) return []
        const chains = connection.chains ?? []
        const direct = chains.some(p => p === 'DIRECT')
        const currentRuleMatched = connection.rule.replaceAll('-', '').toLowerCase() === (app.processPaths ? 'processpath' : 'processname') && (app.processPaths ?? app.processes).some(p => p.toLowerCase() === connection.rulePayload.toLowerCase())
        const followsGroup = isFollowGroup(proxies.proxies[app.target ?? ''])
        const matched = currentRuleMatched && (app.mode === 'direct' ? direct : chains.includes(app.target ?? '') && (followsGroup || !direct))
        const node = chains[0]
        const currentNode = app.mode === 'direct' ? 'DIRECT' : outlets[app.target!]?.node
        return [{ applicationId: app.id, process: connection.metadata.process ?? '', destination: connection.metadata.host || connection.metadata.destinationIP || '未知目标', outbound: chains.join(' ← '), matched, currentRuleMatched, node,
          usesCurrentNode: currentNode && node ? currentNode === node : undefined, startedAt: connection.start }]
      }).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 50)
      const uncoveredProcesses = connections.connections.flatMap(connection => {
        if (!connection.metadata.processPath) return []
        // 共享目录中的其他程序不是辅助进程，不能因其建立连接而反复自动应用。
        const app = state.managed.find(app => app.processPaths?.length && isDedicatedApplicationDirectory(app.processPaths[0]) && normalizeProcessPath(connection.metadata.processPath!).startsWith(path.win32.dirname(normalizeProcessPath(app.processPaths[0])) + '\\'))
        if (!app || managedProcessMatches(app, connection.metadata)) return []
        return [{ applicationId: app.id, process: path.win32.basename(connection.metadata.processPath) }]
      }).filter((item, index, items) => items.findIndex(other => other.applicationId === item.applicationId && other.process === item.process) === index)
      return { ...base, connected: true, version: version.version, mode: config.mode, tun: config.tun?.enable ?? false, processMode: config['find-process-mode'], choices, rulesLoaded: rulesLoaded && config.mode === 'rule' && !untrackedRuleCount && !dataIssue, evidence, untrackedRuleCount,
        uncoveredProcesses, groupChoices, outlets, strategyNodes, strategyLoaded, strategyWarning,
        // 只有唯一组时才推荐；多个独立选择不能猜成同一个“当前代理”。已保存组失效时也不静默换组。
        suggestedTarget: state.proxyGroup ?? (groupChoices.length === 1 ? groupChoices[0].name : undefined),
        persistenceObserved,
        warning: dataIssue ? '本地管理记录需要核对。' : config.mode !== 'rule' ? '当前内核不是规则模式，应用规则不会按预期执行。' : untrackedRuleCount ? `检测到 ${untrackedRuleCount} 条历史 AppRoute 规则仍在运行，但本机管理记录为空。当前分流无法从列表确认；请核对记录，或使用恢复网络停用历史规则后重新设置。` : changedTarget ? '代理组已失效，请重新选择代理组；失效时的处理方式可在代理策略中查看。' : !rulesLoaded ? '规则与运行内核不一致，请检查覆写启用状态或恢复后重新应用。' : state.managed.length && !persistenceObserved ? '当前规则已加载，持久化尚未验证。首次登记后请正常退出并重新打开 Clash Party，再检查规则是否仍已加载。' : config.tun?.enable ? undefined : '当前使用系统代理；不遵循系统代理的软件可能不会进入 Clash，需以实际连接检查为准。' }
    } catch (e) { return { ...base, warning: (e as Error).message } }
  }
  async countUntrackedRules(runtime: MihomoRuntime, state: RoutingState, config: Record<string, any>): Promise<number> {
    const marker = config[markerKey]
    if (state.managed.length || marker?.owner !== ownerId || !Array.isArray(marker.rules) || !marker.rules.length) return 0
    // 正常恢复后磁盘生成文件可能尚未更新，必须核对内核前缀，避免把旧磁盘标记当成仍在生效。
    const actual = (await runtime.rules()).rules.slice(0, marker.rules.length)
    return runtimeRuleSignature(actual) === configRuleSignature(marker.rules) ? marker.rules.length : 0
  }
  async diagnose(): Promise<DiagnosticCheck[]> {
    const checks: DiagnosticCheck[] = []
    try {
      const runtime = await this.runtime()
      const cfg = await runtime.config()
      checks.push({ name: 'Clash Party 控制连接', ok: true, detail: `已连接，当前模式 ${cfg.mode}` })
      const state = await this.state()
      const untracked = await this.countUntrackedRules(runtime, state, (await this.party.snapshot()).config)
      checks.push({ name: '应用规则与代理策略加载', ok: !untracked && cfg.mode === 'rule' && await this.matches(runtime, state.managed, state.proxyStrategy), detail: untracked ? `${untracked} 条历史规则仍在内核运行，但缺少对应管理记录` : '核对专属规则和已保存的代理策略' })
      const probes = await Promise.allSettled([
        runtime.delay('DIRECT', 'https://www.baidu.com/'),
        runtime.delay(state.proxyGroup ?? state.managed.find(app => app.target)?.target ?? 'GLOBAL', strategyTestUrl),
      ])
      probes.forEach((probe, i) => checks.push({ name: i ? '当前出口 HTTPS 探测' : '国内直连 HTTPS 探测', ok: probe.status === 'fulfilled', detail: probe.status === 'fulfilled' ? `收到目标响应，${probe.value.delay} ms；不等同于所有应用均正常` : '探测失败：可能是网络、目标站点或出口异常' }))
    } catch (e) { checks.push({ name: 'Clash Party 控制连接', ok: false, detail: (e as Error).message }) }
    checks.push({ name: '独立离线恢复入口', ok: await fs.access(this.recoveryPath).then(() => true, () => false), detail: this.recoveryPath })
    return checks
  }
  async applyAutomatically(request: ApplyRequest): Promise<AutomaticApplyResult> {
    const previous = await this.state()
    let transactionId: string | undefined
    try {
      const nextStrategy = request.proxyStrategy === undefined ? undefined : validateProxyStrategy(request.proxyStrategy)
      // 先校验请求，再从操作系统重建进程身份；页面不能自行扩大辅助进程范围。
      if (!Array.isArray(request.applications) || (!request.applications.length && !request.proxyGroup) || request.applications.length > 100) throw new Error('一次请选择 1 至 100 个应用。')
      if (new Set(request.applications.map(app => app?.id)).size !== request.applications.length) throw new Error('请求包含重复应用。')
      request.applications.forEach(app => managedApplications([app], request.target))
      if (request.revision !== previous.revision || previous.pendingId) throw new Error('状态已变化或仍有恢复检查，请稍后重试。')
      const resolveApplications = () => Promise.all(request.applications.map(async app => {
        const clean = { ...app, processPaths: undefined, processWarnings: undefined }
        if (app.mode === 'rule') return clean
        return (this.options.resolveFamily ?? resolveProcessFamily)(clean, previous.managed.find(old => old.id === app.id)?.processPaths)
      }))
      const runtime = await this.runtime()
      const baseline = await runtime.proxies()
      const probes = [{ target: 'DIRECT', url: 'https://www.baidu.com/' }, { target: 'GLOBAL', url: 'https://www.gstatic.com/generate_204' }]
      const customStrategy = nextStrategy && nextStrategy.mode !== 'existing' ? nextStrategy : undefined
      if (!customStrategy && (request.proxyGroup || request.applications.some(app => app.mode === 'proxy'))) probes.push({ target: request.target!, url: strategyTestUrl })
      const probe = (p: typeof probes[number]) => this.options.probe ? this.options.probe(runtime, p.target, p.url) : runtime.delay(p.target, p.url).then(() => true, () => false)
      // 进程读取与基线探测相互独立；两者都成功后才进入写入事务。
      const [applications, before] = await Promise.all([this.timings.measure('进程识别', resolveApplications), this.timings.measure('网络基线', () => Promise.all(probes.map(probe)))])
      const candidateAvailable = customStrategy ? (await Promise.all(customStrategy.nodes.map(target => probe({ target, url: strategyTestUrl })))).some(Boolean) : false
      if (!before.some(Boolean) && !candidateAvailable) throw new Error('网络基线检查未通过，暂未修改设置。')
      if (customStrategy && !candidateAvailable) throw new Error('候选节点探测均未通过，原策略保留。')
      if (applications.some(app => app.mode === 'direct') && !before[0]) throw new Error('当前直连出口不可用，暂未修改设置。')
      if (!customStrategy && (request.proxyGroup || applications.some(app => app.mode === 'proxy')) && !before.at(-1)) throw new Error('所选代理出口不可用，请更换出口。')
      const pending = await this.apply({ ...request, applications })
      transactionId = pending.pending?.id
      if (!transactionId) throw new Error('未取得恢复事务，不能确认应用。')
      if (customStrategy) {
        await runtime.checkGroup(strategyOwnership.name)
        if (!await probe({ target: strategyOwnership.name, url: strategyTestUrl })) throw new Error('新代理策略的出口检查未通过。')
      }
      const after = await this.timings.measure('网络复查', () => Promise.all(probes.map(probe)))
      if (before.some((ok, i) => ok && !after[i])) throw new Error('应用后网络检查未通过。')
      const originalSelections = (entries: typeof baseline.proxies) => configuredProxySelections(Object.fromEntries(Object.entries(entries).filter(([name]) => name !== strategyOwnership.name)))
      if (originalSelections(baseline.proxies) !== originalSelections((await runtime.proxies()).proxies)) throw new Error('原有代理出口选择发生变化。')
      const observed = await this.status()
      if (observed.evidence.some(item => applications.some(app => app.id === item.applicationId) && !item.matched)) throw new Error('发现不符合设置的新连接。')
      const status = await this.confirm(transactionId)
      return { outcome: 'applied', message: '规则已加载并通过网络检查；实际分流以新连接证据为准。', status }
    } catch (error) {
      if (transactionId) {
        try { await this.rollback(transactionId) } catch { return { outcome: 'recovery-required', message: '自动恢复尚未确认，请使用“恢复网络”或桌面离线恢复入口。', status: await this.status() } }
      }
      const state = await this.state()
      const status = await this.status()
      const unchanged = JSON.stringify(state.managed) === JSON.stringify(previous.managed) && JSON.stringify(state.proxyStrategy) === JSON.stringify(previous.proxyStrategy) && state.proxyGroup === previous.proxyGroup && state.missingTargetAction === previous.missingTargetAction && !state.pendingId
      const restored = unchanged && status.connected && status.rulesLoaded && state.lastRecovery !== previous.lastRecovery
      const outcome = restored ? 'restored' : unchanged && state.lastRecovery === previous.lastRecovery ? 'unchanged' : 'recovery-required'
      return { outcome, message: `${error instanceof Error ? error.message : '操作失败。'}${restored ? '已自动恢复上一次设置。' : outcome === 'unchanged' ? '原设置保留。' : '请检查恢复状态。'}`, status }
    }
  }
  /** 一个组供所有代理应用共用；更换组走完整事务，节点切换本身完全由 Mihomo 执行。 */
  async setProxyGroup(request: { target: string; revision: string }): Promise<AutomaticApplyResult> {
    return this.setProxyStrategy({ revision: request.revision, strategy: { mode: 'existing', group: request.target } })
  }
  async setProxyStrategy(request: ProxyStrategyRequest): Promise<AutomaticApplyResult> {
    if (request.missingTargetAction !== undefined && !['block', 'original'].includes(request.missingTargetAction)) throw new Error('代理失效策略无效。')
    const strategy = validateProxyStrategy(request?.strategy)
    const state = await this.state()
    const target = strategy.mode === 'existing' ? strategy.group : strategyOwnership.name
    return this.applyAutomatically({ revision: request.revision, target, proxyGroup: target, proxyStrategy: strategy, missingTargetAction: request.missingTargetAction ?? state.missingTargetAction,
      applications: state.managed.filter(app => app.mode === 'proxy').map(app => ({ ...app, path: app.processPaths?.[0], source: 'manual', category: '已管理应用' })) })
  }
  async apply(request: ApplyRequest): Promise<IntegrationStatus> {
    await withLock(this.root, async () => {
      const previous = await this.state()
      if (request.missingTargetAction !== undefined && (!request.proxyGroup || !['block', 'original'].includes(request.missingTargetAction))) throw new Error('请在代理策略中统一设置失效行为。')
      const missingTargetAction = request.missingTargetAction ?? previous.missingTargetAction ?? 'original'
      const strategy = request.proxyStrategy === undefined ? previous.proxyStrategy : validateProxyStrategy(request.proxyStrategy)
      if (request.proxyStrategy !== undefined && (!request.proxyGroup || request.target !== (strategy!.mode === 'existing' ? strategy!.group : strategyOwnership.name))) throw new Error('代理策略必须同时更新全部代理应用。')
      if (previous.pendingId) throw new Error('请先保留或恢复上一轮试运行设置。')
      if (request.revision !== previous.revision) throw new Error('页面状态已过期，请刷新后重试。')
      if (!Array.isArray(request.applications) || (!request.applications.length && !request.proxyGroup)) throw new Error('请先选择应用。')
      const appliedAt = new Date().toISOString()
      const selected = managedApplications(request.applications, request.target).map(app => ({ ...app, appliedAt, ...(app.mode === 'proxy' ? { missingTargetAction } : {}) }))
      const selectedIds = new Set(request.applications.map(app => app.id))
      const managed = [...previous.managed.filter(app => !selectedIds.has(app.id)), ...selected]
      if (request.missingTargetAction !== undefined && managed.some(app => app.mode === 'proxy' && (app.missingTargetAction ?? 'original') !== missingTargetAction)) throw new Error('代理失效策略必须同时更新全部代理应用。')
      assertNoProcessOverlap(managed)
      const runtime = await this.runtime()
      const [cfg, proxies, snapshot] = await Promise.all([runtime.config(), runtime.proxies(), this.party.snapshot()])
      const rulesBefore = runtimeRuleSignature((await runtime.rules()).rules)
      const expectedBefore = configRuleSignature(addManagedRules(snapshot.config, previous.managed, previous.proxyStrategy).rules ?? [])
      if (rulesBefore !== expectedBefore) throw new Error('磁盘与运行中的规则不一致，已停止修改。请先在 Clash Party 重新加载配置，再重试。')
      // 新增策略会重载组定义：核对静态组，并阻止校验期间的外部改组被候选配置覆盖。
      const expectedGroups = addManagedRules(snapshot.config, previous.managed, previous.proxyStrategy)['proxy-groups'] ?? []
      const types: Record<string, string> = { select: 'Selector', fallback: 'Fallback', 'url-test': 'URLTest', 'load-balance': 'LoadBalance' }
      for (const group of expectedGroups) {
        if (!types[group.type] || group.use?.length || group['include-all'] || group['include-all-proxies'] || group['include-all-providers'] || !Array.isArray(group.proxies)) continue
        const actual = proxies.proxies[group.name]
        if (actual?.type !== types[group.type] || JSON.stringify(actual.all) !== JSON.stringify(group.proxies)) throw new Error('磁盘与运行中的代理组不一致，已停止修改。请先在 Clash Party 重新加载配置。')
      }
      const groupSignature = (entries: typeof proxies.proxies) => JSON.stringify(Object.values(entries).filter(entry => entry.all).map(entry => [entry.name, entry.type, entry.all]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
      const runtimeBefore = digest(JSON.stringify({ cfg, rules: rulesBefore, groups: groupSignature(proxies.proxies) }))
      if (cfg.mode !== 'rule' || cfg['find-process-mode'] === 'off') throw new Error('需要 Clash Party 的规则模式及进程识别；AppRoute 不会自动切换全局网络设置。')
      if (snapshot.config.mode !== cfg.mode || snapshot.config['mixed-port'] !== cfg['mixed-port']) throw new Error('磁盘配置与内核模式或代理端口不同，请先在 Clash Party 重新加载配置。')
      const declared = new Set([...(snapshot.config.proxies ?? []), ...(snapshot.config['proxy-groups'] ?? [])].map(p => p.name))
      const custom = strategy && strategy.mode !== 'existing' ? strategy : undefined
      if (custom) {
        const nodeNames = new Set((snapshot.config.proxies ?? []).map((node: any) => node.name))
        if (request.proxyStrategy !== undefined && custom.nodes.some(name => !nodeNames.has(name) || proxies.proxies[name]?.all || resolveProxyOutlet(name, proxies.proxies).kind !== 'proxy')) throw new Error('候选节点已经变化或不是远端节点，请刷新列表后重选。')
        declared.add(strategyOwnership.name)
      }
      const validGroup = (name: string) => custom && name === strategyOwnership.name || isFollowGroup(proxies.proxies[name])
      if (request.proxyGroup !== undefined && (typeof request.proxyGroup !== 'string' || request.proxyGroup !== request.target || !declared.has(request.proxyGroup) || !validGroup(request.proxyGroup) ||
          managed.some(app => app.mode === 'proxy' && app.target !== request.proxyGroup))) throw new Error('请选择有效代理组，并统一更新已有代理应用。')
      for (const app of managed) if (app.mode === 'proxy' && (!declared.has(app.target!) || !(validGroup(app.target!) || isProxyOnly(app.target!, proxies.proxies)))) throw new Error('代理出口不存在或类型不支持，请重新选择。')
      const candidate = YAML.stringify(addManagedRules(snapshot.config, managed, strategy))
      // 校验配置与准备离线恢复互不依赖，但必须等两者结束才能写配置或释放锁。
      const preparation = await Promise.allSettled([this.timings.measure('配置校验', () => this.validate(candidate, snapshot.workDir)), this.timings.measure('恢复工具', () => this.ensureRecovery())])
      for (const result of preparation) if (result.status === 'rejected') throw result.reason
      await this.party.assertSnapshot(snapshot)
      if (digest(JSON.stringify({ cfg: await runtime.config(), rules: runtimeRuleSignature((await runtime.rules()).rules), groups: groupSignature((await runtime.proxies()).proxies) })) !== runtimeBefore) throw new Error('内核运行配置发生变化，已取消本次应用。')
      const id = randomUUID()
      const tx: Transaction = { id, phase: 'prepared', deadline: Date.now() + (this.options.trialMs ?? 120000), previous, beforeScript: snapshot.script, nextScript: overrideScript(managed, strategy) }
      await atomicWrite(path.join(this.root, 'transactions', `${id}.baseline.yaml`), snapshot.workText)
      await atomicWrite(path.join(this.root, 'transactions', `${id}.registry.yaml`), snapshot.registry ?? 'items: []\n')
      await this.saveTransaction(tx)
      await this.save({ ...previous, revision: id, pendingId: id })
      try {
        if (this.options.guardian) await this.options.guardian(id); else await startGuardian(this.root, id)
        await this.party.assertSnapshot(snapshot)
        await this.timings.measure('规则写入', async () => { await writeIfUnchanged(this.party.scriptPath, snapshot.script, tx.nextScript); await this.party.register(snapshot) })
        await this.timings.measure('内核重载', () => runtime.reload(candidate))
        if (!await this.matches(runtime, managed, strategy)) throw new Error('内核未加载预期规则或代理策略。')
        if (runtimeRuleSignature((await runtime.rules()).rules) !== configRuleSignature(addManagedRules(snapshot.config, managed, strategy).rules ?? [])) throw new Error('原有规则未完整保留，正在恢复。')
        for (const app of selected) app.appliedAt = new Date().toISOString()
        tx.phase = 'pending'; await this.saveTransaction(tx)
        await this.save({ revision: id, managed, missingTargetAction, proxyGroup: request.proxyGroup ?? previous.proxyGroup, proxyStrategy: strategy, appliedAt: new Date().toISOString(), pendingId: id })
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
      if ((await runtime.config()).mode !== 'rule' || !await this.matches(runtime, state.managed, state.proxyStrategy)) throw new Error('规则或策略状态异常，不能确认保留。')
      tx.phase = 'confirmed'; await this.saveTransaction(tx)
      await this.save({ ...state, revision: randomUUID(), pendingId: undefined })
      await pruneCompletedTransactions(this.root).catch(() => {})
    })
    return this.status()
  }
  async rollbackInternal(tx: Transaction) {
    const script = await readOptional(this.party.scriptPath)
    if (script !== tx.nextScript && script !== tx.beforeScript && script !== (tx.beforeScript ?? overrideScript([]))) throw new Error('覆写脚本出现外部修改，已停止覆盖。')
    await writeIfUnchanged(this.party.scriptPath, script, tx.beforeScript ?? overrideScript([]))
    // 按当前订阅重新组合旧的应用策略，避免将过期完整快照覆盖到新订阅。
    try {
      const snapshot = await this.party.snapshot()
      const candidate = YAML.stringify(addManagedRules(snapshot.config, tx.previous.managed, tx.previous.proxyStrategy))
      const runtime = await this.runtime()
      await runtime.reload(candidate)
      if (!await this.matches(runtime, tx.previous.managed, tx.previous.proxyStrategy)) throw new Error('旧规则或代理策略未确认')
      tx.phase = 'rolled-back'; await this.saveTransaction(tx)
      await this.save({ ...tx.previous, revision: randomUUID(), pendingId: undefined, lastRecovery: new Date().toISOString() })
    } catch {
      tx.phase = 'recovery-required'; await this.saveTransaction(tx)
      await this.save({ ...tx.previous, revision: randomUUID(), pendingId: tx.id, lastRecovery: '持久化规则已恢复；内核未确认，请运行离线恢复或在 Clash Party 重新加载。' })
      throw new Error('持久化规则已恢复，但无法确认内核；请运行离线恢复工具。')
    }
  }
  async rollback(id: string) {
    await withLock(this.root, async () => {
      const state = await this.state(); const tx = await this.transaction(id)
      if (state.pendingId !== id || !['prepared', 'pending', 'recovery-required'].includes(tx.phase)) return
      await this.rollbackInternal(tx)
    })
    return this.status()
  }
  /** 启动、定时检查及唤醒后只处理未完成事务，绝不重放已保存的正常配置。 */
  async reconcileInterrupted() {
    return withLock(this.root, async () => {
      const state = await this.state()
      if (!state.pendingId) return
      const tx = await this.transaction(state.pendingId)
      if (tx.id !== state.pendingId) throw new Error('恢复记录编号不一致，请核对记录。')
      if (tx.phase === 'confirmed') {
        const runtime = await this.runtime()
        if ((await runtime.config()).mode !== 'rule' || !await this.matches(runtime, state.managed, state.proxyStrategy)) throw new Error('已确认事务与当前内核不一致，请检查恢复状态。')
        await this.save({ ...state, revision: randomUUID(), pendingId: undefined })
      } else if (tx.phase === 'rolled-back') {
        const runtime = await this.runtime()
        if (!await this.matches(runtime, tx.previous.managed, tx.previous.proxyStrategy)) throw new Error('恢复规则尚未确认，请使用离线恢复。')
        await this.save({ ...tx.previous, revision: randomUUID(), pendingId: undefined })
      } else if (tx.phase === 'recovery-required' || Date.now() >= tx.deadline) await this.rollbackInternal(tx)
    })
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
      await this.save({ revision: randomUUID(), managed: [], proxyGroup: previous.proxyStrategy?.mode === 'existing' || !previous.proxyStrategy ? previous.proxyGroup : undefined, lastRecovery: new Date().toISOString() })
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
