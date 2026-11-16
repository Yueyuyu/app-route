import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { nodeExecutableName } from '../platform/paths.ts'
import { atomicWrite, readOptional, withLock } from '../storage/localState.ts'
import type { RoutingService } from '../services/routingService.ts'
import { TemporaryRoutingService } from '../services/temporaryRouting.ts'
import { nextTemporaryDeadline } from '../../core/temporaryRouting.ts'

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
const directory = (root: string) => path.join(root, 'temporary-monitor')
async function readiness(root: string) {
  try {
    const folder = directory(root), ready = JSON.parse(await fs.readFile(path.join(folder, 'ready.json'), 'utf8'))
    const lock = JSON.parse(await fs.readFile(path.join(folder, 'operation.lock'), 'utf8'))
    if (!Number.isSafeInteger(ready.pid) || ready.pid <= 0 || ready.pid !== lock.pid || !Number.isFinite(ready.at) || typeof ready.revision !== 'string' || Math.abs(Date.now() - ready.at) > 20000) return
    process.kill(ready.pid, 0)
    return ready as { pid: number; at: number; revision: string }
  } catch { return }
}

/** 只启动安装在私有恢复目录中的固定脚本；等待它实际读到本次事务，避免退出边界的旧就绪文件。 */
export async function startTemporaryGuardian(root: string, revision: string): Promise<void> {
  let launched = false, failed = false
  for (let i = 0; i < 60; i++) {
    const ready = await readiness(root)
    if (ready?.revision === revision) return
    if (!ready && !launched) {
      const folder = path.join(root, 'recovery')
      const child = spawn(path.join(folder, nodeExecutableName()), [path.join(folder, 'recovery.cjs'), 'temporary-watch'], {
        detached: true, windowsHide: true, stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: undefined, ELECTRON_RUN_AS_NODE: undefined },
      })
      launched = true; child.on('error', () => { failed = true }); child.unref()
    }
    if (failed) break
    await pause(100)
  }
  throw new Error('临时分流守护未就绪，已取消应用。')
}

/** 每个数据目录最多一个期限守护。退出界面不影响它；重启后由桌面启动入口重新核对。 */
export async function watchTemporaryRouting(service: RoutingService, options: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {}): Promise<void> {
  const now = options.now ?? Date.now, sleep = options.sleep ?? pause, temporary = new TemporaryRoutingService(service, now)
  const folder = directory(service.root), readyFile = path.join(folder, 'ready.json')
  await withLock(folder, async () => {
    try {
      for (;;) {
        const state = await service.state(), deadline = nextTemporaryDeadline(state.managed)
        const pending = state.pendingId ? await service.transaction(state.pendingId) : undefined
        const preparedTemporary = pending?.proposed?.managed.some(app => app.temporary)
        if (deadline === undefined && !preparedTemporary) return
        await atomicWrite(readyFile, JSON.stringify({ pid: process.pid, at: Date.now(), revision: state.revision }))
        let failed = false
        try {
          if (state.pendingId) await service.reconcileInterrupted()
          else if (deadline !== undefined && deadline <= now()) failed = !await temporary.expireDue()
        } catch { failed = true /* 保留期限与当前选择，下次核对；不重置系统网络或覆盖外部配置。 */ }
        await sleep(failed ? 5000 : Math.max(100, Math.min(1000, (deadline ?? now() + 1000) - now())))
      }
    } finally {
      const ready = await readOptional(readyFile)
      if (ready && JSON.parse(ready).pid === process.pid) await fs.rm(readyFile, { force: true })
    }
  })
}
