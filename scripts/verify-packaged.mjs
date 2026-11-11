import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright'
import { createHash } from 'node:crypto'

// 使用最终打包的主进程、预加载和后台；独立数据目录，CI 没有日常 Clash Party 配置。
if (!process.env.CI) throw new Error('干净环境验收只在 CI 执行。')
const mac = process.platform === 'darwin'
const folder = path.resolve('release', `AppRoute-${process.platform}-${process.arch}`)
const executablePath = path.join(folder, mac ? 'AppRoute.app/Contents/MacOS/AppRoute' : 'AppRoute.exe')
const resources = path.join(folder, mac ? 'AppRoute.app/Contents/Resources/app' : 'resources/app')
const profile = path.resolve('.runtime/packaged-verification')
const info = JSON.parse(await fs.readFile(path.join(resources, 'ui/build-info.json'), 'utf8'))
assert.equal(info.dirty, false, '发布产物必须来自干净提交')
const sourceHash = createHash('sha256').update(await fs.readFile(process.execPath)).digest('hex')
const bundledHash = createHash('sha256').update(await fs.readFile(path.join(resources, 'runtime', mac ? 'node' : 'node.exe'))).digest('hex')
// Mac ad-hoc 签名会改写 Mach-O 的签名段，运行时需以执行结果而非签名前哈希确认。
if (!mac) assert.equal(bundledHash, sourceHash)
let desktop
try {
  desktop = await electron.launch({ executablePath, env: { ...process.env, APPROUTE_DATA_DIR: profile, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  const page = await desktop.firstWindow()
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.locator('.sidebar .about-app-trigger').waitFor({ timeout: 60000 })
  const state = await page.evaluate(async () => ({ status: await window.appRoute.request('integration.status'), language: await window.appRoute.request('language.read'), platform: window.appRoute.platform }))
  assert.equal(state.status.connected, false); assert.equal(state.status.managed.length, 0)
  assert.equal(state.platform, process.platform); assert.equal(state.language.language, 'system')
  await page.locator('.sidebar .about-app-trigger').click(); await page.locator('.about-build-date').waitFor()
  assert.ok((await page.locator('.about-app-version').innerText()).includes(info.version))
  await page.keyboard.press('Escape'); await page.locator('.about-app-content').waitFor({ state: 'hidden' })
  assert.deepEqual(errors, [])
  await fs.mkdir('output', { recursive: true })
  await page.screenshot({ path: `output/packaged-${process.platform}-${process.arch}.png` })
  await fs.writeFile('output/packaged-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), platform: process.platform, architecture: process.arch, build: info, cleanStart: true, backendReachable: true, aboutAndEscape: true, realClashRoutingVerified: false }, null, 2))
} finally { await desktop?.close() }
