/** 同一时刻只执行一份只读请求；不缓存已完成结果，也不合并任何写操作。 */
export class SingleFlight<T> {
  private pending?: Promise<T>
  run(operation: () => Promise<T>): Promise<T> {
    if (this.pending) return this.pending
    const request = Promise.resolve().then(operation)
    this.pending = request
    void request.finally(() => { if (this.pending === request) this.pending = undefined }).catch(() => {})
    return request
  }
}

type PollingTimer = ReturnType<typeof setTimeout> | number
export interface PollingOptions {
  read: () => Promise<boolean>
  visible: () => boolean
  schedule?: (callback: () => void, delay: number) => PollingTimer
  cancel?: (timer: PollingTimer) => void
}

/** 等本轮完成再计时。这里只调度界面读取，不影响后台辅助进程观察和恢复守护。 */
export function startStatusPolling(options: PollingOptions) {
  const schedule = options.schedule ?? setTimeout, cancel = options.cancel ?? clearTimeout
  let stopped = false, running = false, failures = 0, timer: PollingTimer | undefined
  async function tick() {
    if (stopped || running) return
    if (timer !== undefined) { cancel(timer); timer = undefined }
    running = true
    try { failures = await options.read() ? 0 : Math.min(failures + 1, 4) }
    catch { failures = Math.min(failures + 1, 4) }
    finally {
      running = false
      if (!stopped) timer = schedule(() => { void tick() }, Math.max(options.visible() ? 5000 : 30000, Math.min(60000, 5000 * 2 ** failures)))
    }
  }
  void tick()
  return { wake: () => { if (options.visible()) void tick() }, stop: () => { stopped = true; if (timer !== undefined) cancel(timer) } }
}
