import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDmgWithRetry } from '../scripts/lib/dmg-retry.ts'

const busy = new Error('dmgbuild.core.DMGError: Unable to detach device cleanly: hdiutil: couldn\'t eject "disk2" - Resource busy')
test('仅 CI 的 DMG detach 临时占用重试一次并记录', async () => {
  let attempts = 0, retries = 0
  const result = await buildDmgWithRetry(async () => { if (++attempts === 1) throw busy; return ['fixture.dmg'] }, {
    ci: true, delay: async () => {}, onRetry: error => { assert.equal(error, busy); retries++ },
  })
  assert.deepEqual(result, ['fixture.dmg']); assert.equal(attempts, 2); assert.equal(retries, 1)
})
test('持续占用在第二次失败，不能无限重试或算作成功', async () => {
  let attempts = 0
  await assert.rejects(buildDmgWithRetry(async () => { attempts++; throw busy }, { ci: true, delay: async () => {}, onRetry: () => {} }), busy)
  assert.equal(attempts, 2)
})
test('签名、空间不足、普通 hdiutil 错误和本地构建不重试', async () => {
  for (const [ci, error] of [[true, new Error('Signing failed')], [true, new Error('No space left on device')], [true, new Error('hdiutil: Resource busy')], [false, busy]] as const) {
    let attempts = 0
    await assert.rejects(buildDmgWithRetry(async () => { attempts++; throw error }, { ci, onRetry: () => assert.fail('Unexpected retry') }), error)
    assert.equal(attempts, 1)
  }
})
