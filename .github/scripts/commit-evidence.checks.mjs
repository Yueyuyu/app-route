import test from 'node:test'
import assert from 'node:assert/strict'
import { attachEvidence, validateBody, validateEvidence } from './commit-evidence.mjs'
const tree = 'a'.repeat(40)
const body = 'test: 验收记录\n\n变更：校验实际提交内容。\n验证：node --test；隔离夹具通过。\n未验证：真实代理环境，本检查不访问它。\n'
test('空泛记录与缺项不能伪装成验收', () => {
  assert.throws(() => validateBody('test: only subject'))
  assert.throws(() => validateBody(body.replace('node --test；隔离夹具通过。', '已测试')))
  assert.throws(() => validateBody(body.replace('未验证：', '备注：')))
})
test('自动附加精确树和命令，重复执行不累积旧证据', () => {
  const receipt = { version: 1, tree, checks: [['node', '--test']] }
  const message = attachEvidence(body, receipt, tree)
  validateEvidence(message, tree)
  assert.equal(attachEvidence(message, receipt, tree), message)
  assert.throws(() => validateEvidence(message, 'b'.repeat(40)), /不一致/)
  assert.throws(() => attachEvidence(body, { ...receipt, tree: 'b'.repeat(40) }, tree), /没有匹配/)
})
