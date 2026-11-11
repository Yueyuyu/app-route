import type { Application, RouteMode } from '../shared/application.ts'
import type { AutomaticApplyResult } from '../shared/integration.ts'

export interface RoutingIntent { application: Application; mode: RouteMode; target?: string }
export interface PendingRoute { mode: RouteMode; phase: 'queued' | 'applying' }
interface QueueOptions {
  execute: (applications: Application[], target?: string) => Promise<AutomaticApplyResult>
  onChange: (pending: Record<string, PendingRoute>) => void
  onResult: (result: AutomaticApplyResult, intents: RoutingIntent[]) => void
  onFailure: (message: string, intents: RoutingIntent[]) => void
  debounceMs?: number
}

/** UI 意图立即更新，配置事务串行执行；尚未发送的同一应用只保留最后一次选择。 */
export class RoutingQueue {
  private queued = new Map<string, RoutingIntent>()
  private active = new Map<string, RoutingIntent>()
  private timer?: ReturnType<typeof setTimeout>
  private running = false
  private options: QueueOptions
  constructor(options: QueueOptions) { this.options = options }
  snapshot(): Record<string, PendingRoute> {
    return Object.fromEntries([
      ...[...this.active].map(([id, item]) => [id, { mode: item.mode, phase: 'applying' as const }]),
      ...[...this.queued].map(([id, item]) => [id, { mode: item.mode, phase: 'queued' as const }]),
    ])
  }
  enqueue(applications: Application[], mode: RouteMode, target?: string) {
    for (const application of applications) this.queued.set(application.id, { application, mode, ...(mode === 'proxy' ? { target } : {}) })
    this.options.onChange(this.snapshot())
    if (this.running) return
    // 固定短窗口而非不断延后的防抖，持续点击也不会无限推迟应用。
    this.timer ??= setTimeout(() => { this.timer = undefined; void this.flush() }, this.options.debounceMs ?? 180)
  }
  cancelWaiting() {
    clearTimeout(this.timer); this.timer = undefined; this.queued.clear()
    this.options.onChange(this.snapshot())
  }
  async flush(): Promise<void> {
    if (this.running) return
    clearTimeout(this.timer); this.timer = undefined; this.running = true
    try {
      while (this.queued.size) {
        const target = [...this.queued.values()].find(item => item.mode === 'proxy')?.target
        const batch = [...this.queued.values()].filter(item => item.mode !== 'proxy' || item.target === target).slice(0, 100)
        for (const item of batch) { this.queued.delete(item.application.id); this.active.set(item.application.id, item) }
        this.options.onChange(this.snapshot())
        let stopReason: string | undefined
        try {
          const result = await this.options.execute(batch.map(item => ({ ...item.application, mode: item.mode })), target)
          this.options.onResult(result, batch)
          if (result.outcome !== 'applied') this.options.onFailure(result.message, batch)
          if (result.outcome === 'recovery-required' || result.status.pending || !result.status.connected || !result.status.rulesLoaded) stopReason = '上一项状态尚未确认，已停止后续操作；请检查恢复状态后重新选择。'
        } catch (error) {
          stopReason = error instanceof Error ? error.message : '请求中断，请检查恢复状态后重新选择。'
          this.options.onFailure(stopReason, batch)
        }
        this.active.clear()
        if (stopReason) {
          const waiting = [...this.queued.values()]; this.queued.clear()
          if (waiting.length) this.options.onFailure(stopReason, waiting)
        }
        this.options.onChange(this.snapshot())
      }
    } finally { this.running = false }
  }
}
