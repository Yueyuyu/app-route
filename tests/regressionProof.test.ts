import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error 开发工具直接执行 JavaScript。
import { breakOnce, verifyTestResult } from '../scripts/lib/regressionProof.mjs'
const scenario = { id: 'fixture', before: 'guard()', after: 'false', name: 'protects data' }
test('反向验证拒绝破坏点遗漏或多处命中', () => {
  assert.equal(breakOnce('if (guard()) return', scenario), 'if (false) return')
  assert.throws(() => breakOnce('no match', scenario))
  assert.throws(() => breakOnce('guard(); guard()', scenario))
})
test('编译错误、超时、跳过与意外通过都不能算反向验证成功', () => {
  const result = { status: 1, stdout: "not ok 1 - protects data\n  code: 'ERR_ASSERTION'", stderr: '' }
  verifyTestResult(result, scenario, true)
  for (const bad of [{ ...result, status: 0 }, { ...result, signal: 'SIGTERM' }, { ...result, stdout: 'SyntaxError: bad syntax' }, { ...result, stdout: '# skipped 1' }]) assert.throws(() => verifyTestResult(bad, scenario, true))
})
