import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { _electron as electron } from 'playwright'
import { waitForState } from './lib/testSandbox.mjs'

// 仅在全新 CI 用户下验证真实安装器；合成旧版本标识与发布响应，不触及用户电脑。
if (process.env.GITHUB_ACTIONS !== 'true' || process.platform !== 'win32') throw new Error('自动安装验收只允许 Windows CI。')
const installer = path.resolve(process.argv[2] || '')
const installerRoot = path.resolve('release/installer') + path.sep
assert.ok(installer.startsWith(installerRoot) && installer.endsWith('-setup-x64.exe'))
const directory = path.join(process.env.LOCALAPPDATA, 'Programs', 'AppRoute')
const executablePath = path.join(directory, 'AppRoute.exe')
const metadataFile = path.join(directory, 'resources/app/ui/build-info.json')
const dataRoot = path.join(process.env.LOCALAPPDATA, 'AppRoute')
const sentinel = path.join(dataRoot, 'installation-sentinel.json')
const sentinelBefore = await fs.readFile(sentinel)
const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'))
const bytes = await fs.readFile(installer)
const digest = createHash('sha256').update(bytes).digest('hex')
const name = path.basename(installer), version = metadata.version
assert.equal(name, `AppRoute-${version}-setup-x64.exe`)
const downloadUrl = `https://github.com/Yueyuyu/app-route/releases/download/v${version}/${name}`
await fs.writeFile(metadataFile, JSON.stringify({ ...metadata, version: '0.0.0' }))
// 使用固定路径，只终止此 CI 安装目录内由本测试启动的主程序。
function installedProcesses(stop = false) {
  const command = "$p = Get-Process -Name AppRoute -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $env:LOCALAPPDATA 'Programs\\AppRoute\\AppRoute.exe') }; " +
    (stop ? '$p | Stop-Process -Force' : "$p | Select-Object Id,@{Name='MainWindowHandle';Expression={$_.MainWindowHandle.ToInt64()}} | ConvertTo-Json -Compress")
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true }).trim()
  return stop || !output ? [] : [].concat(JSON.parse(output))
}
let desktop, handoff = false, relaunchObserved = false
try {
  assert.equal(installedProcesses().length, 0)
  desktop = await electron.launch({ executablePath, env: { ...process.env, APPROUTE_DATA_DIR: dataRoot, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  const page = await desktop.firstWindow()
  await page.locator('.sidebar .about-app-trigger').waitFor({ timeout: 60000 })
  assert.equal((await page.evaluate(() => window.appRoute.request('updates.download-state'))).installation, 'automatic')
  const oldPids = installedProcesses().map(item => item.Id)
  await desktop.evaluate(async ({ net }, fixture) => {
    const { createReadStream } = process.getBuiltinModule('node:fs')
    const { Readable } = process.getBuiltinModule('node:stream')
    net.fetch = async (url, options) => {
      if (options.credentials !== 'omit') throw new Error('unexpected credentials')
      if (url === 'https://api.github.com/repos/Yueyuyu/app-route/releases?per_page=100') return Response.json([{
        tag_name: 'v' + fixture.version, draft: false, prerelease: fixture.version.includes('-'), published_at: '2026-11-18T00:00:00Z', body: 'CI update fixture',
        assets: [{ name: fixture.name, browser_download_url: fixture.downloadUrl, size: fixture.size, state: 'uploaded', digest: 'sha256:' + fixture.digest }],
      }])
      if (url === fixture.downloadUrl && options.redirect === 'manual') return new Response(Readable.toWeb(createReadStream(fixture.installer)), { headers: { 'Content-Length': String(fixture.size) } })
      throw new Error('unexpected update URL')
    }
  }, { installer, version, name, downloadUrl, size: bytes.length, digest })
  const check = await page.evaluate(() => window.appRoute.request('updates.check', { channel: 'preview' }))
  assert.equal(check.state, 'available')
  await page.evaluate(version => window.appRoute.request('updates.download', { channel: 'preview', version }), version)
  await waitForState('native update download', async () => {
    const state = await page.evaluate(() => window.appRoute.request('updates.download-state'))
    if (state.phase === 'error') throw new Error(state.message)
    return state.phase === 'ready'
  }, value => value, { timeout: 120000, interval: 250 })
  const prepared = JSON.parse(await fs.readFile(path.join(dataRoot, 'upgrade.json'), 'utf8'))
  assert.equal(prepared.targetVersion, version)
  const closed = new Promise(resolve => desktop.once('close', resolve))
  const result = await page.evaluate(version => window.appRoute.request('updates.install', { channel: 'preview', version }), version)
  assert.equal(result.started, true); assert.equal(result.manual, false); handoff = true
  await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('Old app did not exit after update handoff')), 20000).unref())])
  desktop = undefined
  await waitForState('NSIS installation and automatic relaunch', async () => {
    // 安装器替换文件时可能短暂读到不完整 JSON；只等待完整的新元数据。
    let current
    try { current = JSON.parse(await fs.readFile(metadataFile, 'utf8')) }
    catch (error) { if (error instanceof SyntaxError || ['ENOENT', 'EBUSY', 'EPERM'].includes(error.code)) return false; throw error }
    return current.version === version && installedProcesses().some(item => !oldPids.includes(item.Id) && item.MainWindowHandle !== 0)
  }, value => value, { timeout: 120000, interval: 1000 })
  relaunchObserved = true
  assert.deepEqual(await fs.readFile(sentinel), sentinelBefore)
  for (const relative of ['main.cjs', 'backend.mjs', 'preload.cjs', 'ui/build-info.json']) {
    assert.deepEqual(await fs.readFile(path.join(directory, 'resources/app', relative)), await fs.readFile(path.resolve('release/AppRoute-win32-x64/resources/app', relative)))
  }
  const refreshed = JSON.parse(await fs.readFile(path.join(dataRoot, 'upgrade.json'), 'utf8'))
  assert.notEqual(refreshed.backupId, prepared.backupId)
  installedProcesses(true)
  await waitForState('CI app exit', () => installedProcesses().length === 0, value => value, { timeout: 20000, interval: 250 })
  desktop = await electron.launch({ executablePath, env: { ...process.env, APPROUTE_DATA_DIR: dataRoot, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  const updatedPage = await desktop.firstWindow()
  await updatedPage.locator('.sidebar .about-app-trigger').waitFor({ timeout: 60000 })
  const preserved = await updatedPage.evaluate(() => window.appRoute.request('updates.status'))
  assert.equal(preserved.state, 'preserved')
  await fs.writeFile('output/auto-update-check.json', JSON.stringify({ platform: 'win32', version, sourceRevision: metadata.revision, nativeDownloadAndDigest: true, freshBackup: true, installerStarted: true, oldAppExited: true, automaticRelaunch: true, installedPayloadMatches: true, settingsPreserved: true, fixture: 'synthetic old version identity and GitHub response; actual NSIS installer and installed app; empty CI profile', checkedAt: new Date().toISOString() }, null, 2))
} finally {
  if (desktop) await desktop.close().catch(() => {})
  if (relaunchObserved) installedProcesses(true)
  if (!handoff) await fs.writeFile(metadataFile, JSON.stringify(metadata))
}
