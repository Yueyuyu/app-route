import type { Application } from '../shared/application.ts'
import type { ManagedApplication } from '../shared/integration.ts'
import type { HistoryRoutingState, RoutingChange, RoutingOperationSource } from '../shared/routingHistory.ts'
import { assertNoSystemHostRouting } from './managedRouting.ts'

export const operationSources: RoutingOperationSource[] = ['application', 'strategy', 'import', 'helper', 'undo']
export function globalRoutingSignature(state: HistoryRoutingState) {
  return JSON.stringify([state.proxyGroup, state.proxyStrategy, state.missingTargetAction ?? 'original'])
}
export function historyStateSignature(state: HistoryRoutingState) {
  return JSON.stringify([globalRoutingSignature(state), [...state.managed].sort((a, b) => a.id.localeCompare(b.id))])
}
const routeSignature = (app?: ManagedApplication) => JSON.stringify(app && [app.mode, app.target, app.processes, app.processPaths])
export function routingChanges(before: HistoryRoutingState, after: HistoryRoutingState): RoutingChange[] {
  const old = new Map(before.managed.map(app => [app.id, app])), next = new Map(after.managed.map(app => [app.id, app]))
  const view = (app?: ManagedApplication) => ({ mode: app?.mode ?? 'rule' as const, target: app?.mode === 'proxy' ? app.target : undefined, processes: app?.processes.length ?? 0 })
  return [...new Set([...old.keys(), ...next.keys()])].filter(id => routeSignature(old.get(id)) !== routeSignature(next.get(id)))
    .map(id => ({ id, name: (next.get(id) ?? old.get(id))!.name, before: view(old.get(id)), after: view(next.get(id)) }))
}
export function routingUndoPlan(tx: { phase: string; source?: RoutingOperationSource; previous: HistoryRoutingState; after?: HistoryRoutingState }, current: HistoryRoutingState): { applications: Application[]; target?: string; reason?: string } {
  const blocked = (reason: string) => ({ applications: [], reason })
  if (tx.phase !== 'confirmed' || !tx.after) return blocked('这条记录没有完整的成功快照。')
  if (current.pendingId) return blocked('请先完成当前分流或恢复。')
  if (tx.after.revision !== current.revision || historyStateSignature(tx.after) !== historyStateSignature(current)) return blocked('此后已有新修改，不能覆盖当前选择。')
  if (globalRoutingSignature(tx.previous) !== globalRoutingSignature(tx.after)) return blocked('这次涉及代理策略，请通过策略或备份预览恢复。')
  if (tx.source === 'helper' || tx.source === 'undo') return blocked('自动补充和撤销记录仅供查看。')
  if (tx.source !== 'application' && tx.source !== 'import') return blocked('这次操作不适合单步撤销，请通过备份预览恢复。')
  const changes = routingChanges(tx.previous, tx.after).filter(change => change.before.mode !== change.after.mode || change.before.target !== change.after.target)
  if (!changes.length || changes.length > 100) return blocked('这次操作不适合单步撤销，请通过备份预览恢复。')
  if (changes.some(change => {
    const before = tx.previous.managed.find(app => app.id === change.id), after = tx.after!.managed.find(app => app.id === change.id)
    return before && after && before.processPaths?.[0] !== after.processPaths?.[0]
  })) return blocked('程序路径已变化，请通过备份预览核对。')
  const applications: Application[] = changes.map(change => {
    const previous = tx.previous.managed.find(app => app.id === change.id), next = tx.after!.managed.find(app => app.id === change.id), app = (previous ?? next)!
    return { id: app.id, name: app.name, processes: app.processes, path: app.processPaths?.[0], mode: previous?.mode ?? 'rule', category: '已管理应用', source: 'manual' }
  })
  if (applications.some(app => app.mode !== 'rule' && !app.path)) return blocked('原记录缺少精确程序路径，请先核对应用。')
  try { assertNoSystemHostRouting(applications) } catch { return blocked('原记录包含系统共享进程，不能重新启用。') }
  const targets = [...new Set(changes.flatMap(change => change.before.mode === 'proxy' ? [change.before.target] : []))]
  if (targets.length > 1) return blocked('原记录使用多个出口，请通过备份预览恢复。')
  return { applications, target: targets[0] }
}
