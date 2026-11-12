import { setTimeout as wait } from 'node:timers/promises'
import { configRuleSignature, runtimeRuleSignature } from '../../src/main/adapters/runtimeRules.ts'
import type { RuntimeRule } from '../../src/main/adapters/mihomoRuntime.ts'

/** 控制接口先于规则初始化；只在隔离验收中等待，不重载或修改被测内核。 */
export async function waitForCoreRules(
  readRules: () => Promise<{ rules: RuntimeRule[] }>,
  expectedRules: string[],
  options: { timeoutMs?: number; intervalMs?: number; exited?: () => boolean } = {},
) {
  const deadline = Date.now() + (options.timeoutMs ?? 15_000)
  const expected = configRuleSignature(expectedRules)
  let observed = 'control interface unavailable'
  do {
    if (options.exited?.()) throw new Error('Isolated core exited before loading rules')
    try {
      observed = runtimeRuleSignature((await readRules()).rules)
      if (observed === expected) return
    } catch (error) { observed = (error as Error).message }
    if (Date.now() >= deadline) break
    await wait(options.intervalMs ?? 100)
  } while (true)
  throw new Error(`Isolated core rules not ready: expected=${expected}; observed=${observed}`)
}
