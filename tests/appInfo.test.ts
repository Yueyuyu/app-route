import test from 'node:test'
import assert from 'node:assert/strict'
import { projectLink, versionSummary } from '../src/shared/appInfo.ts'

test('关于入口只允许固定项目链接，版本复制不接受用户或网络信息', () => {
  assert.equal(projectLink('homepage'), 'https://github.com/Yueyuyu/app-route')
  assert.equal(projectLink('feedback'), 'https://github.com/Yueyuyu/app-route/issues/new/choose')
  for (const input of ['file:///C:/secret', 'javascript:alert(1)', 'https://example.org', '__proto__', {}, undefined]) assert.throws(() => projectLink(input))
  assert.equal(versionSummary({ version: '0.2.0-preview.1', builtAt: '2026-11-11T12:00:00Z', revision: 'abcdef123456', dirty: true }), 'AppRoute 0.2.0-preview.1\nBuild: 2026-11-11T12:00:00Z\nRevision: abcdef123456 (local changes)')
})
