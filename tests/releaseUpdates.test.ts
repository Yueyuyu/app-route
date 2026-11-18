import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compareReleaseVersions, inspectReleases, parseReleaseVersion, releaseApi } from '../src/core/releaseUpdates.ts'
import { changedUpgradeSettings } from '../src/core/upgradeSettings.ts'
import { ReleaseUpdateService } from '../src/main/desktop/releaseUpdates.ts'
import { UpgradeVerificationService } from '../src/main/services/upgradeVerification.ts'
import { SettingsTransferService } from '../src/main/services/settingsTransfer.ts'
import { RoutingService } from '../src/main/services/routingService.ts'
import type { IntegrationStatus } from '../src/shared/integration.ts'
import type { SettingsSnapshot } from '../src/shared/settings.ts'

function release(version = '0.3.0-preview.10', suffix = 'setup-x64.exe') {
  const name = `AppRoute-${version}-${suffix}`
  return { draft: false, prerelease: version.includes('-'), tag_name: 'v' + version, published_at: '2026-11-12T00:00:00Z', body: '<img src="https://example.invalid">',
    assets: [{ name, browser_download_url: `https://github.com/Yueyuyu/app-route/releases/download/v${version}/${name}`, digest: 'sha256:' + 'a'.repeat(64), state: 'uploaded', size: 12345 }] }
}
test('发布版本按数字排序，稳定通道不混入预览、草稿、未知标签和回退版本', () => {
  assert.equal(compareReleaseVersions('0.3.0-preview.10', '0.3.0-preview.2'), 1)
  assert.equal(compareReleaseVersions('0.3.0', '0.3.0-preview.99'), 1)
  for (const value of ['v0.3.0', '0.3', '01.3.0', '0.3.0-beta.1', '../../x', '99999999999999999999.0.0', undefined]) assert.equal(parseReleaseVersion(value), undefined)
  const data = [release(), release('0.2.0'), { ...release('9.0.0'), draft: true }, { ...release('8.0.0'), tag_name: 'main' }]
  assert.equal(inspectReleases(data, '0.2.0-preview.2', 'stable', 'win32', 'x64').release?.version, '0.2.0')
  assert.equal(inspectReleases(data, '0.2.0-preview.2', 'preview', 'win32', 'x64').release?.version, '0.3.0-preview.10')
  assert.equal(inspectReleases([release('0.2.0')], '0.3.0', 'stable', 'win32', 'x64').state, 'current')
  assert.equal(inspectReleases([release()], '0.2.0', 'stable', 'win32', 'x64').state, 'no-release')
})
test('下载必须匹配系统架构、固定仓库与校验摘要，缺失附件不能假报最新', () => {
  for (const [platform, arch, suffix] of [['win32', 'x64', 'setup-x64.exe'], ['darwin', 'arm64', 'mac-arm64.dmg'], ['darwin', 'x64', 'mac-x64.dmg']]) {
    const result = inspectReleases([release('0.3.0', suffix)], '0.2.0', 'stable', platform, arch)
    assert.equal(result.state, 'available'); assert.ok(result.release!.assetName.endsWith(suffix))
    assert.equal(result.release!.notes, '<img src="https://example.invalid">', 'notes remain plain data')
  }
  for (const change of [{ browser_download_url: 'https://evil.invalid/install.exe' }, { digest: '' }, { state: 'new' }, { size: -1 }]) {
    const value = release(); Object.assign(value.assets[0], change)
    assert.equal(inspectReleases([value], '0.2.0', 'preview', 'win32', 'x64').reason, 'missing-package')
  }
  const duplicate = release(); duplicate.assets.push({ ...duplicate.assets[0] })
  assert.equal(inspectReleases([duplicate], '0.2.0', 'preview', 'win32', 'x64').state, 'unavailable')
  assert.equal(inspectReleases([release()], '0.2.0', 'preview', 'darwin', 'arm64').reason, 'missing-package')
  assert.equal(inspectReleases([release()], '0.2.0', 'preview', 'win32', 'arm64').state, 'unsupported')
})
test('更新请求合并并限频，过期检查与任意下载版本被拒绝，不发送用户配置或令牌', async () => {
  let now = Date.parse('2026-11-16T00:00:00Z'), calls = 0
  const service = new ReleaseUpdateService('0.2.0', 'win32', 'x64', async (url, options) => {
    calls++; assert.equal(url, releaseApi); assert.equal(options?.credentials, 'omit'); assert.equal(options?.body, undefined)
    assert.equal(new Headers(options?.headers).has('authorization'), false)
    return Response.json([release()])
  }, () => now)
  const [first, second] = await Promise.all([service.check('preview'), service.check('preview')])
  assert.equal(calls, 1); assert.deepEqual(first, second)
  await service.check('preview'); assert.equal(calls, 1)
  await service.check('preview', true); assert.equal(calls, 2, 'installation rechecks release metadata even while the display cache is fresh')
  assert.ok(service.selected('preview', '0.3.0-preview.10').downloadUrl.startsWith('https://github.com/Yueyuyu/app-route/releases/download/'))
  assert.throws(() => service.selected('preview', '9.0.0'))
  now += 16 * 60000; assert.throws(() => service.selected('preview', '0.3.0-preview.10'))
  await service.check('preview'); assert.equal(calls, 3)
  await assert.rejects(service.check('unknown'))
})
test('更新接口限流、网络错误和超大响应不伪装成已经最新', async () => {
  let now = 100000, count = 0
  const limited = new ReleaseUpdateService('0.2.0', 'win32', 'x64', async () => { count++; return new Response('', { status: 429 }) }, () => now)
  assert.equal((await limited.check('preview')).reason, 'rate-limit')
  now += 60000; await limited.check('preview'); assert.equal(count, 1)
  await limited.check('preview', true); assert.equal(count, 1, 'installation does not bypass a rate-limit cooldown')
  now += 15 * 60000; await limited.check('preview'); assert.equal(count, 2)
  for (const response of [new Response('{invalid'), new Response('x'.repeat(2 * 1024 * 1024 + 1)), new Response('', { status: 503 })]) {
    const service = new ReleaseUpdateService('0.2.0', 'win32', 'x64', async () => response)
    assert.equal((await service.check('preview')).state, 'unavailable')
  }
})
test('升级备份只追加本机备份，升级核对不重放配置，发现用户新选择时保留它', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-upgrade-')); t.after(() => fs.rm(root, { recursive: true, force: true }))
  const routing = new RoutingService({ root })
  const status: IntegrationStatus = { connected: true, revision: 'fixture', managed: [], choices: [], rulesLoaded: true, evidence: [], recoveryReady: true, recoveryPath: 'fixture' }
  routing.status = async () => status
  routing.applyAutomatically = async () => { assert.fail('upgrade checks cannot apply routing') }
  const settings = new SettingsTransferService(routing, async () => [])
  const application = { id: 'fixture', name: 'Fixture', path: 'C:\\Demo\\Fixture.exe', processes: ['Fixture.exe'], mode: 'rule' as const, source: 'scan' as const, category: '其他应用' }
  await settings.inventory.write({ version: 1, applications: [application], favorites: [] })
  const before = await fs.readFile(path.join(root, 'inventory.json'), 'utf8')
  const upgrade = new UpgradeVerificationService(settings)
  assert.equal((await upgrade.check('0.2.0')).state, 'none')
  await assert.rejects(upgrade.prepare('0.2.0', '0.1.0'))
  const result = await upgrade.prepare('0.2.0', '0.3.0')
  assert.equal((await settings.backups.read(result.backupId)).kind, 'before-upgrade')
  assert.equal(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'), before)
  assert.equal((await upgrade.check('0.2.0')).state, 'pending')
  assert.equal((await new UpgradeVerificationService(settings).check('0.3.0')).state, 'preserved')
  assert.equal((await upgrade.check('0.3.0')).rules, 'loaded')
  status.connected = false; assert.equal((await upgrade.check('0.3.0')).rules, 'waiting'); status.connected = true
  await settings.language.write('ja')
  const changes = await upgrade.check('0.3.0'); assert.equal(changes.state, 'changed'); assert.equal(changes.changedCount, 1)
  assert.equal(await settings.language.read(), 'ja'); assert.equal(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'), before)
  assert.equal(await fs.stat(routing.statePath).then(() => true, () => false), false)
  status.untrackedRuleCount = 121
  await assert.rejects(upgrade.prepare('0.2.0', '0.3.0'), /管理记录/)
  assert.equal((await upgrade.check('0.3.0')).state, 'unavailable')
  status.untrackedRuleCount = 0
  status.pending = { id: 'fixture', deadline: Date.now() + 60000 }
  await assert.rejects(upgrade.prepare('0.2.0', '0.3.0'), /尚未完成/)
  status.pending = undefined
  await fs.appendFile(path.join(root, 'backups', result.backupId), ' ')
  assert.equal((await upgrade.check('0.3.0')).state, 'unavailable', 'changed backup is never trusted')
})
test('升级核对区分新扫描应用与原有条目丢失，并保留策略、收藏和显示语言差异', () => {
  const snapshot: SettingsSnapshot = { app: 'AppRoute', kind: 'approute-settings', version: 1, createdAt: '2026-11-16T00:00:00Z', applications: [{ name: 'Example', path: 'C:\\Demo\\Example.exe', category: '其他应用', mode: 'direct', favorite: true }], proxyStrategy: { mode: 'existing', group: 'Group' } }
  assert.equal(changedUpgradeSettings(snapshot, { ...snapshot, applications: [...snapshot.applications, { ...snapshot.applications[0], path: 'C:\\New\\New.exe', mode: 'rule' }] }), 0)
  assert.equal(changedUpgradeSettings(snapshot, { ...snapshot, applications: [] }), 1)
  assert.equal(changedUpgradeSettings(snapshot, { ...snapshot, applications: [{ ...snapshot.applications[0], favorite: false }], proxyStrategy: { mode: 'existing', group: 'Other' }, language: 'ja', missingTargetAction: 'block' }), 4)
})
