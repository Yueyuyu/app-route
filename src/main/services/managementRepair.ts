import { randomUUID } from 'node:crypto'
import { effectiveApplications, markerKey, ownerId, ruleStrings, scriptHeader } from '../../core/managedRouting.ts'
import { configRuleSignature, runtimeRuleSignature } from '../adapters/runtimeRules.ts'
import { digest, readOptional, withLock } from '../storage/localState.ts'
import { parseRoutingState } from '../storage/routingStateStore.ts'
import type { RoutingService, RoutingState } from './routingService.ts'

export interface ManagementRepairPreview { fingerprint: string; applications: { name: string; mode: string; processCount: number }[]; state: RoutingState }
/** 只解析 JSON 数据，绝不执行覆写脚本。核对磁盘标记及内核完整规则后才允许恢复记录。 */
export async function inspectManagementRepair(service: RoutingService): Promise<ManagementRepairPreview> {
  const original = await readOptional(service.statePath)
  if (original) {
    let version: unknown
    try { version = JSON.parse(original).version } catch { /* 损坏原文可通过严格核对后备份修复。 */ }
    if (version !== undefined && version !== 1) throw new Error('管理记录来自不支持的版本，请升级 AppRoute 后再核对。')
  }
  const current = await service.state().catch(() => undefined)
  if (current?.managed.length || current?.pendingId) throw new Error('已有管理记录或恢复事务，请先完成当前操作。')
  const snapshot = await service.party.snapshot()
  if (!snapshot.script?.startsWith(scriptHeader)) throw new Error('找不到可核对的 AppRoute 覆写记录。')
  const metadata = snapshot.script.split('\n').find(line => line.startsWith('// AppRoute record: '))
  const legacy = snapshot.script.match(/^  var apps = (\[.*\]);$/m)?.[1]
  const record = metadata ? JSON.parse(metadata.slice('// AppRoute record: '.length)) : { apps: legacy ? JSON.parse(legacy) : [] }
  if (!Array.isArray(record.apps) || !record.apps.length) throw new Error('找不到可核对的 AppRoute 覆写记录。')
  const targets = [...new Set(record.apps.filter((a: any) => a.mode === 'proxy').map((a: any) => a.target))]
  // 旧自动策略没有可独立验证的元数据，不能猜测其节点策略。
  if (!metadata && targets.some(target => String(target).startsWith('AppRoute'))) throw new Error('旧版自动策略记录不完整，请使用离线恢复后重新设置。')
  const recovered = parseRoutingState(JSON.stringify({ revision: randomUUID(), managed: record.apps, proxyStrategy: record.strategy,
    proxyGroup: targets.length === 1 ? targets[0] : undefined,
    missingTargetAction: record.apps.find((a: any) => a.mode === 'proxy')?.missingTargetAction ?? 'original' }))
  const runtime = await service.runtime()
  const rules = (await runtime.rules()).rules
  const prefix = ruleStrings(effectiveApplications(recovered.managed, Object.keys((await runtime.proxies()).proxies)))
  const marker = snapshot.config[markerKey]
  if (!prefix.length || marker?.owner !== ownerId || JSON.stringify(marker.rules) !== JSON.stringify(prefix) ||
      runtimeRuleSignature(rules) !== configRuleSignature(snapshot.config.rules ?? []) ||
      runtimeRuleSignature(rules.slice(0, prefix.length)) !== configRuleSignature(prefix) || !await service.strategyMatches(runtime, recovered.proxyStrategy)) throw new Error('记录、磁盘与内核规则不一致，未修改任何设置。')
  const fingerprint = digest(JSON.stringify([snapshot.script, snapshot.workText, await readOptional(service.statePath), runtimeRuleSignature(rules)]))
  return { fingerprint, state: recovered, applications: recovered.managed.map(app => ({ name: app.name, mode: app.mode, processCount: app.processes.length })) }
}

export async function repairManagementRecords(service: RoutingService, fingerprint: unknown) {
  return withLock(service.root, async () => {
    const preview = await inspectManagementRepair(service)
    if (typeof fingerprint !== 'string' || preview.fingerprint !== fingerprint) throw new Error('核对后配置发生变化，请重新核对。')
    // 时间从本次核对起算，不把旧连接误判为修复后的验证证据；不重载任何规则。
    const at = new Date().toISOString()
    await service.save({ ...preview.state, managed: preview.state.managed.map(app => ({ ...app, appliedAt: at })), appliedAt: at })
    return service.status()
  })
}
