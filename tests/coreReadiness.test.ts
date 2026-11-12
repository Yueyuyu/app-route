import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForCoreRules } from '../scripts/lib/core-readiness.ts'

const expected = ['PROCESS-NAME,Fixture.exe,DIRECT', 'MATCH,DIRECT']
const rules = [{ type: 'ProcessName', payload: 'Fixture.exe', proxy: 'DIRECT' }, { type: 'Match', payload: '', proxy: 'DIRECT' }]
test('隔离内核接口已响应但规则尚未加载时继续等待完整规则', async () => {
  let calls = 0
  await waitForCoreRules(async () => {
    calls++
    if (calls === 1) throw new Error('socket not ready')
    return { rules: calls === 2 ? [] : calls === 3 ? rules.slice(0, 1) : rules }
  }, expected, { intervalMs: 1, timeoutMs: 1000 })
  assert.equal(calls, 4)
})
test('错误出口、禁用规则、缺失规则和规则顺序错误必须超时失败', async () => {
  for (const actual of [[], [...rules].reverse(), [{ ...rules[0], proxy: 'REJECT' }, rules[1]], [{ ...rules[0], extra: { disabled: true } }, rules[1]]]) {
    await assert.rejects(waitForCoreRules(async () => ({ rules: actual }), expected, { timeoutMs: 0 }), /expected=.*observed=/)
  }
})
test('内核退出直接失败，不能把版本可达当作规则就绪', async () => {
  await assert.rejects(waitForCoreRules(async () => ({ rules }), expected, { exited: () => true }), /exited/)
})
