import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright'
import executablePath from 'electron'
import { createDesktopSandbox } from './lib/testSandbox.mjs'
import { startUiEvidence } from './lib/uiEvidence.mjs'

const root = process.cwd(), stage = path.join(root, '.runtime/desktop-stage')
const sandbox = await createDesktopSandbox('startup')
const { fixture, env } = sandbox
const output = path.join(root, 'output/playwright/startup')
const finishEvidence = await startUiEvidence('startup')
let passed = false
await fs.mkdir(env.APPROUTE_DATA_DIR, { recursive: true })
await fs.writeFile(path.join(env.APPROUTE_DATA_DIR, 'preferences.json'), JSON.stringify({ version: 1, language: 'zh-CN' }))
await fs.writeFile(path.join(fixture, 'hold-scan'), 'fixture only')
const manifest = JSON.parse(await fs.readFile(path.join(stage, 'ui/.vite/manifest.json'), 'utf8'))
const settingsChunk = manifest['src/renderer/components/SettingsPage.tsx'].file
const damagedFile = path.join(fixture, 'ui', settingsChunk), saved = await fs.readFile(damagedFile)
await fs.unlink(damagedFile) // 仅破坏本次临时夹具，验证局部错误不会使整个桌面空白。
const errors = [], checks = []
let desktop
try {
  desktop = await sandbox.launch(electron, executablePath)
  const page = await desktop.firstWindow(); page.on('pageerror', error => errors.push(error.message))
  // 自定义本地协议不保证进入 Resource Timing；用 CDP 观察完整受控导航的实际请求。
  const network = await page.context().newCDPSession(page), requests = new Set()
  await network.send('Network.enable'); await network.send('Network.setCacheDisabled', { cacheDisabled: true })
  network.on('Network.requestWillBeSent', ({ request }) => { if (request.url.startsWith('approute://app/')) requests.add(new URL(request.url).pathname.replace(/^\//, '')) })
  const started = performance.now()
  await page.reload()
  await page.locator('.application-table button.application-name').first().waitFor()
  const cachedListMs = Math.round(performance.now() - started)
  assert.equal(await fs.access(path.join(fixture, 'scan-completed')).then(() => true, () => false), false)
  assert.equal(await page.locator('.application-table .ant-spin-spinning').count(), 0, 'cached list stays usable during scanning')
  await page.locator('.list-search input').fill('Chrome')
  await page.locator('.application-table button.application-name').getByText('Google Chrome').waitFor()
  for (const name of ['SettingsPage', 'IconManagement', 'SecondaryPages', 'ApplicationEditor', 'ApplicationDetails', 'ConnectionInspector']) {
    assert.equal(requests.has(manifest[`src/renderer/components/${name}.tsx`].file), false, `${name} loaded before use`)
  }
  checks.push('cached inventory is interactive before scan completes; secondary views are not requested')
  await fs.unlink(path.join(fixture, 'hold-scan'))
  await page.waitForFunction(() => !document.querySelector('.heading-actions .ant-btn-loading'))
  await page.locator('.sidebar').getByText('设置与备份', { exact: true }).click()
  await page.getByText('页面加载失败，请重试；其他页面和恢复入口仍可使用。', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'module-failure.png'), animations: 'disabled' })
  await page.locator('.sidebar').getByText('应用管理', { exact: true }).click()
  await page.getByRole('button', { name: /恢复网络/ }).waitFor()
  assert.equal(await page.getByRole('button', { name: /恢复网络/ }).isEnabled(), true)
  checks.push('missing optional module leaves navigation, application list and recovery available')
  await page.locator('.sidebar').getByText('设置与备份', { exact: true }).click()
  await page.getByText('页面加载失败，请重试；其他页面和恢复入口仍可使用。', { exact: true }).waitFor()
  await fs.writeFile(damagedFile, saved)
  await page.locator('.deferred-feature').getByRole('button').click()
  await page.getByRole('heading', { name: '设置与备份', exact: true }).waitFor()
  checks.push('optional module can be retried after its local file is restored')
  await page.locator('.sidebar').getByText('使用帮助', { exact: true }).click()
  await page.getByRole('heading', { name: '使用帮助', exact: true }).waitFor()
  assert.ok(requests.has(manifest['src/renderer/components/SecondaryPages.tsx'].file))
  checks.push('help module loads when selected')
  assert.deepEqual(errors, [], 'chunk failures are handled locally')
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ fixture: 'isolated desktop with synthetic inventory and deliberately delayed scan; controlled reload, not a cold-start benchmark; no user proxy access', cachedListMs, checks, errors }, null, 2))
  console.log(JSON.stringify({ cachedListMs, checks, output }))
  passed = true
} catch (error) {
  if (desktop) await desktop.firstWindow().then(page => page.screenshot({ path: path.join(output, 'failure.png') })).catch(() => {})
  throw error
} finally {
  try { await sandbox.dispose() } catch (error) { passed = false; throw error }
  finally { await finishEvidence(passed) }
}
