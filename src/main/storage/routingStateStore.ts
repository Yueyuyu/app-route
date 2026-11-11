import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { atomicWrite, readOptional } from './localState.ts'
import { assertNoProcessOverlap, managedApplications } from '../../core/managedRouting.ts'
import { validateProxyStrategy } from '../../core/proxyStrategy.ts'
import type { RoutingState } from '../services/routingService.ts'

export const routingStateVersion = 1
/** 旧版无版本号的记录只做内存迁移；高版本或损坏文件绝不静默清空。 */
export function parseRoutingState(text: string): RoutingState {
  const value = JSON.parse(text)
  if (!value || (value.version !== undefined && value.version !== routingStateVersion) || typeof value.revision !== 'string' || !value.revision || !Array.isArray(value.managed) || value.managed.length > 5000 ||
      (value.pendingId !== undefined && !/^[\w-]{1,80}$/.test(value.pendingId)) ||
      (value.missingTargetAction !== undefined && !['block', 'original'].includes(value.missingTargetAction))) throw new Error('本地管理记录需要核对。')
  if (new Set(value.managed.map((item: any) => item?.id)).size !== value.managed.length) throw new Error('本地管理记录需要核对。')
  value.managed.forEach((item: any) => {
    if (!item || !['direct', 'proxy'].includes(item.mode)) throw new Error('本地管理记录需要核对。')
    managedApplications([{ ...item, source: 'manual', category: '' }], item.target)
    if (item.missingTargetAction !== undefined && !['block', 'original'].includes(item.missingTargetAction)) throw new Error('本地管理记录需要核对。')
  })
  assertNoProcessOverlap(value.managed)
  if (value.proxyStrategy) validateProxyStrategy(value.proxyStrategy)
  return { ...value, version: routingStateVersion }
}

export async function saveRoutingState(root: string, state: RoutingState) {
  const destination = path.join(root, 'state.json')
  const text = JSON.stringify({ ...state, version: routingStateVersion }, null, 2)
  parseRoutingState(text)
  const previous = await readOptional(destination)
  if (previous && previous !== text) {
    // 备份包含本机身份信息，仅保存在本机；修复前也保留损坏原文。
    const directory = path.join(root, 'backups', 'state')
    await atomicWrite(path.join(directory, `${Date.now()}-${randomUUID()}.json`), previous)
    const files = (await fs.readdir(directory)).filter(name => /^\d{13}-[\da-f-]{36}\.json$/.test(name)).sort().reverse()
    for (const name of files.slice(20)) await fs.rm(path.join(directory, name), { force: true })
  }
  await atomicWrite(destination, text)
}

/** 只清理已结束的自有事务；待恢复、未知或损坏记录永久留给核对。 */
export async function pruneCompletedTransactions(root: string, activeId?: string) {
  const directory = path.join(root, 'transactions')
  const files = await fs.readdir(directory).catch(() => [])
  const completed: { id: string; deadline: number }[] = []
  for (const name of files) {
    if (!/^[\da-f-]{36}\.json$/.test(name)) continue
    const id = name.slice(0, -5)
    if (id === activeId) continue
    try {
      const tx = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))
      if (tx.id === id && ['confirmed', 'rolled-back'].includes(tx.phase) && Number.isFinite(tx.deadline)) completed.push({ id, deadline: tx.deadline })
    } catch { /* 不能确认的文件不清理。 */ }
  }
  completed.sort((a, b) => b.deadline - a.deadline)
  for (const { id } of completed.slice(20)) for (const suffix of ['.json', '.baseline.yaml', '.registry.yaml', '.ready']) await fs.rm(path.join(directory, id + suffix), { force: true })
}
