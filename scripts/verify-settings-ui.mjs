import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { build } from 'rolldown'
import { _electron as electron } from 'playwright'
import executablePath from 'electron'
import { translate } from '../src/shared/i18n/index.ts'

// 真实 Electron 主进程、文件对话框调用、IPC、设置存储；路由只记录到隔离夹具。
const root = process.cwd(), stage = path.join(root, '.runtime/desktop-stage')
const fixture = path.join(root, '.runtime', `settings-ui-${Date.now()}`)
const output = path.join(root, 'output/playwright/settings')
await fs.mkdir(fixture, { recursive: true }); await fs.mkdir(output, { recursive: true })
for (const file of ['main.cjs', 'preload.cjs', 'package.json']) await fs.copyFile(path.join(stage, file), path.join(fixture, file))
await fs.cp(path.join(stage, 'ui'), path.join(fixture, 'ui'), { recursive: true })
await fs.mkdir(path.join(fixture, 'runtime')); await fs.copyFile(process.execPath, path.join(fixture, process.platform === 'win32' ? 'runtime/node.exe' : 'runtime/node'))
await fs.copyFile(path.join(root, 'tests/fixtures/documentationBackend.mjs'), path.join(fixture, 'backend.mjs'))
await fs.copyFile(path.join(root, 'resources/application-icons/catalog.json'), path.join(fixture, 'catalog.json'))
await build({ input: 'tests/fixtures/settingsFixture.ts', platform: 'node', output: { file: path.join(fixture, 'settings-fixture.mjs'), format: 'esm' } })
const env = { ...process.env, APPROUTE_DATA_DIR: path.join(fixture, 'profile/AppRoute'), LOCALAPPDATA: path.join(fixture, 'profile'), APPDATA: path.join(fixture, 'roaming'), ELECTRON_RUN_AS_NODE: undefined }
const importedFile = path.join(fixture, 'import.json'), exportedFile = path.join(fixture, 'export.json')
const errors = [], checks = []
let desktop
try {
  desktop = await electron.launch({ executablePath, args: [fixture], env, timeout: 30000 })
  const page = await desktop.firstWindow()
  page.on('pageerror', error => errors.push(error.message))
  await page.locator('.application-table button.application-name').first().waitFor()
  await desktop.evaluate(({ dialog, BrowserWindow }, files) => {
    BrowserWindow.getAllWindows()[0].setContentSize(1440, 1000)
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [files.importedFile] })
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: files.exportedFile })
  }, { importedFile, exportedFile })
  for (const [locale, label] of [['zh-CN', '简体中文'], ['en', 'English'], ['ja', '日本語'], ['fr', 'Français']]) {
    const tr = source => translate(locale, source)
    await page.locator('.language-switcher').click()
    await page.locator('.ant-select-item-option-content').getByText(label, { exact: true }).click()
    await page.locator('.sidebar').getByText(tr('设置与备份'), { exact: true }).click()
    await page.getByRole('heading', { name: tr('设置与备份'), exact: true }).waitFor()
    await page.getByRole('button', { name: new RegExp(tr('导出设置')) }).click()
    await page.getByRole('button', { name: new RegExp(tr('导入设置')) }).waitFor({ state: 'visible' })
    await page.waitForFunction(() => !document.querySelector('.settings-transfer-card button[disabled]'))
    const snapshot = JSON.parse(await fs.readFile(exportedFile, 'utf8'))
    assert.equal(snapshot.kind, 'approute-settings'); assert.equal(snapshot.applications.length, 8)
    snapshot.applications[0].mode = 'direct'; snapshot.applications[0].name = 'Imported browser'
    snapshot.applications.push({ ...snapshot.applications[0], path: 'C:\\Missing\\Missing.exe', name: 'Missing app' })
    await fs.writeFile(importedFile, JSON.stringify(snapshot))
    await page.getByRole('button', { name: new RegExp(tr('导入设置')) }).click()
    const drawer = page.locator('.ant-drawer-content-wrapper:visible')
    await drawer.locator('.settings-preview-table').waitFor()
    assert.equal(await drawer.locator('tbody input[type=checkbox]:checked').count(), 1, 'configured apps remain unchecked')
    assert.equal(await drawer.locator('tbody input[type=checkbox]:disabled').count(), 1, 'missing path cannot be selected')
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1000, 760))
    await page.waitForFunction(() => innerWidth === 1000 && [...document.querySelectorAll('.settings-import-footer button')].every(button => button.getBoundingClientRect().right <= innerWidth))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    const clippedButtons = await drawer.locator('.ant-drawer-footer button').evaluateAll(buttons => buttons.some(button => { const rect = button.getBoundingClientRect(); return rect.right > innerWidth || rect.left < 0 }))
    assert.equal(clippedButtons, false, locale + ' import footer fits')
    await page.screenshot({ path: path.join(output, locale + '-import.png'), animations: 'disabled' })
    await drawer.getByRole('button', { name: tr('仅导入资料'), exact: true }).click()
    await drawer.waitFor({ state: 'hidden' })
    await page.waitForFunction(() => !document.querySelector('.settings-transfer-card button[disabled]'))
    const inventory = JSON.parse(await fs.readFile(path.join(env.APPROUTE_DATA_DIR, 'inventory.json'), 'utf8'))
    assert.equal(inventory.applications.find(app => app.id === 'chrome').name, 'Imported browser')
    assert.equal(inventory.applications.find(app => app.id === 'chrome').mode, 'rule')
    assert.equal(await fs.stat(path.join(fixture, 'routing-request.json')).then(() => true, () => false), false)
    checks.push(locale + ': export, preview, protected defaults, metadata-only import, narrow layout')
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1440, 1000))
  }
  const tr = source => translate('fr', source)
  await page.getByRole('button', { name: new RegExp(tr('导入设置')) }).click()
  await page.locator('.settings-preview-table').waitFor()
  await page.locator('.settings-import-footer').getByRole('button', { name: tr('导入并应用'), exact: true }).click()
  const confirm = page.locator('.ant-modal:visible')
  await confirm.getByRole('button', { name: tr('导入并应用'), exact: true }).click()
  await page.locator('.ant-drawer-content-wrapper:visible').waitFor({ state: 'hidden' })
  const request = JSON.parse(await fs.readFile(path.join(fixture, 'routing-request.json'), 'utf8'))
  assert.equal(request.applications.length, 1); assert.equal(request.applications[0].id, 'chrome')
  assert.equal(request.applications[0].mode, 'direct'); assert.equal(request.target, 'Demo group')
  checks.push('explicit routing confirmation passes only selected local identity and current group')
  await fs.writeFile(importedFile, '{invalid')
  await page.getByRole('button', { name: new RegExp(tr('导入设置')) }).click()
  await page.getByText(tr('设置文件不是有效的 JSON。'), { exact: true }).waitFor()
  assert.equal(await page.locator('.ant-drawer-content-wrapper:visible').count(), 0)
  checks.push('invalid JSON is visible without opening preview')
  assert.deepEqual(errors, [])
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ fixture: 'real desktop and storage; synthetic routing; no user proxy changes', checks, errors }, null, 2))
  console.log(JSON.stringify({ checks, output }))
} catch (error) {
  if (desktop) await desktop.firstWindow().then(page => page.screenshot({ path: path.join(output, 'failure.png') })).catch(() => {})
  throw error
} finally { await desktop?.close() }
