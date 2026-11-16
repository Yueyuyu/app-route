import fs from 'node:fs/promises'
import path from 'node:path'
import type { RoutingHistory, RoutingHistoryItem } from '../../shared/routingHistory.ts'
import { globalRoutingSignature, operationSources, routingChanges, routingUndoPlan } from '../../core/routingHistory.ts'
import { parseRoutingState } from '../storage/routingStateStore.ts'
import type { RoutingService, Transaction } from './routingService.ts'

/** 只读本机事务白名单字段，绝不向页面发送覆写脚本或完整配置。 */
export class RoutingHistoryService {
  readonly routing: RoutingService
  readonly available: (file: string) => Promise<boolean>
  constructor(routing: RoutingService, available = (file: string) => fs.access(file).then(() => true, () => false)) { this.routing = routing; this.available = available }
  private async transaction(id: string): Promise<Transaction> {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(id)) throw new Error('操作记录编号无效。')
    const directory = await fs.lstat(path.join(this.routing.root, 'transactions'))
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('操作记录无法读取。')
    const file = path.join(this.routing.root, 'transactions', id + '.json')
    const stat = await fs.lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) throw new Error('操作记录无法读取。')
    const tx = JSON.parse(await fs.readFile(file, 'utf8')) as Transaction
    if (tx.id !== id || !['prepared', 'pending', 'confirmed', 'rolled-back', 'recovery-required'].includes(tx.phase)) throw new Error('操作记录无法读取。')
    tx.previous = parseRoutingState(JSON.stringify(tx.previous))
    if (tx.after) tx.after = parseRoutingState(JSON.stringify(tx.after))
    if (tx.proposed) tx.proposed = parseRoutingState(JSON.stringify(tx.proposed))
    return tx
  }
  async list(): Promise<RoutingHistory> {
    const state = await this.routing.state(), items: RoutingHistoryItem[] = []
    let unreadable = 0
    const directory = path.join(this.routing.root, 'transactions')
    const stat = await fs.lstat(directory).catch(error => { if (error.code === 'ENOENT') return undefined; throw error })
    if (!stat) return { revision: state.revision, items, unreadable }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('操作记录无法读取。')
    for (const name of (await fs.readdir(directory)).filter(name => /^[\da-f-]{36}\.json$/.test(name))) {
      try {
        const tx = await this.transaction(name.slice(0, -5)), next = tx.after ?? tx.proposed
        items.push({ id: tx.id, at: tx.createdAt && Number.isFinite(Date.parse(tx.createdAt)) ? tx.createdAt : undefined,
          source: operationSources.includes(tx.source!) ? tx.source! : 'unknown', phase: tx.phase,
          changes: next ? routingChanges(tx.previous, next) : [], strategyChanged: Boolean(next && globalRoutingSignature(tx.previous) !== globalRoutingSignature(next)),
          undoReason: routingUndoPlan(tx, state).reason })
      } catch { unreadable++ }
    }
    items.sort((a, b) => (Date.parse(b.at ?? '') || 0) - (Date.parse(a.at ?? '') || 0))
    return { revision: state.revision, items: items.slice(0, 20), unreadable }
  }
  async undo(request: { id: string; revision: string }) {
    const state = await this.routing.state()
    if (request?.revision !== state.revision) throw new Error('设置已变化，请刷新操作记录。')
    const tx = await this.transaction(request.id), plan = routingUndoPlan(tx, state)
    if (plan.reason) throw new Error(plan.reason)
    for (const app of plan.applications) if (app.mode !== 'rule' && !await this.available(app.path!)) throw new Error('原程序路径已失效，请先核对应用。')
    // 常规事务再次检查 revision、原规则与配置所有权；中途失败按同一机制恢复。
    return this.routing.applyAutomatically({ revision: request.revision, applications: plan.applications, target: plan.target }, 'undo')
  }
}
