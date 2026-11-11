export interface OperationTiming { phase: string; durationMs: number; ok: boolean; at: string }
/** 只保存阶段名与耗时，不保存应用身份、代理名、配置或错误原文。 */
export class OperationTimings {
  private entries: OperationTiming[] = []
  async measure<T>(phase: string, work: () => Promise<T>): Promise<T> {
    const start = performance.now()
    let ok = false
    try { const value = await work(); ok = true; return value }
    finally {
      this.entries.push({ phase, durationMs: Math.round(performance.now() - start), ok, at: new Date().toISOString() })
      this.entries = this.entries.slice(-40)
    }
  }
  snapshot() { return this.entries.map(entry => ({ ...entry })) }
}
