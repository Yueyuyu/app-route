import path from 'node:path'
import type { RoutingService } from '../services/routingService.ts'
import { atomicWrite } from '../storage/localState.ts'

/** CLI 与隔离实进程验收共用守护循环；服务决定固定数据目录和内核，不接受界面参数。 */
export async function watchTransaction(service: RoutingService, id: string): Promise<void> {
  await service.transaction(id)
  await atomicWrite(path.join(service.root, 'transactions', `${id}.ready`), JSON.stringify({ pid: process.pid }))
  while (true) {
    const tx = await service.transaction(id)
    if (!['prepared', 'pending'].includes(tx.phase)) return
    if (Date.now() >= tx.deadline) { await service.rollback(id); return }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, tx.deadline - Date.now())))
  }
}
