import { setTimeout as wait } from 'node:timers/promises'

export function isBusyDmgDetach(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error)
  return /Unable to detach device cleanly/.test(text) && /hdiutil:[^\r\n]*Resource busy/i.test(text)
}

/** 仅 CI 的已知磁盘占用允许重建一次 DMG；不重跑测试、不强制卸载系统磁盘。 */
export async function buildDmgWithRetry<T>(build: () => Promise<T>, options: {
  ci: boolean
  onRetry: (error: unknown) => void
  delay?: () => Promise<void>
}): Promise<T> {
  try { return await build() }
  catch (error) {
    if (!options.ci || !isBusyDmgDetach(error)) throw error
    options.onRetry(error)
    await (options.delay ?? (() => wait(5000)))()
    return build()
  }
}
