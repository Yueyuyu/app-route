import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright'
import executablePath from 'electron'
import { createDesktopSandbox } from './lib/testSandbox.mjs'
import { startUiEvidence } from './lib/uiEvidence.mjs'
import { resolveLocale, translate } from '../src/shared/i18n/index.ts'
import { setDesktopViewport } from './lib/desktopViewport.mjs'

// 使用真实的桌面主进程/preload/UI 与独立演示后台，不接触用户配置或真实代理。
const root = process.cwd()
const sandbox = await createDesktopSandbox('localization')
const { fixture, env } = sandbox
const output = path.join(root, 'output/playwright/localization')
const finishEvidence = await startUiEvidence('localization')
let passed = false
const results = [], errors = []
const translations = {
 'zh-CN': ['简体中文', '应用管理', '分流规则', '图标管理', '使用帮助', '连接详情', '代理策略', '恢复网络', '取消', '添加应用'],
 en: ['English', 'Applications', 'Routing rules', 'Icon library', 'Help', 'Connection details', 'Proxy strategy', 'Restore network', 'Cancel', 'Add app'],
 ja: ['日本語', 'アプリ管理', '振り分けルール', 'アイコン管理', 'ヘルプ', '接続詳細', 'プロキシ戦略', 'ネットワークを復旧', 'キャンセル', 'アプリを追加'],
 fr: ['Français', 'Applications', 'Règles de routage', 'Bibliothèque d’icônes', 'Aide', 'Détails de connexion', 'Stratégie proxy', 'Restaurer le réseau', 'Annuler', 'Ajouter une application'],
}
let desktop
try {
 desktop = await sandbox.launch(electron, executablePath)
 const page = await desktop.firstWindow(); page.on('pageerror', e => errors.push(e.message))
 await desktop.evaluate(({ shell, clipboard }) => {
   globalThis.appRouteTestLinks = []; globalThis.appRouteTestCopy = ''
   shell.openExternal = async url => { globalThis.appRouteTestLinks.push(url) }
   // 人为延迟回执，持续覆盖“点击返回但复制还没完成”的跨平台时序。
   clipboard.writeText = async value => { await new Promise(resolve => setTimeout(resolve, 120)); globalThis.appRouteTestCopy = value }
 })
 await page.locator('.language-switcher').waitFor(); await page.locator('.application-table button.application-name').first().waitFor()
 await setDesktopViewport(page, { width: 1440, height: 1000 })
 async function screenshot(name) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' }) }
 async function layout(label) {
   const state = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1,
     missingImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.getAttribute('src')) }))
   assert.equal(state.overflow, false, label + ' horizontal overflow'); assert.deepEqual(state.missingImages, [], label + ' images'); results.push({ label, ...state })
 }
 for (const [locale, labels] of Object.entries(translations)) {
   await page.locator('.list-search input').fill('Chrome')
   await page.locator('.language-switcher').click()
   await page.locator('.ant-select-item-option-content').getByText(labels[0], { exact: true }).click()
   await page.waitForFunction(expected => document.documentElement.lang === expected, locale)
   assert.equal(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu().items[1].label), { 'zh-CN': '编辑', en: 'Edit', ja: '編集', fr: 'Édition' }[locale])
   assert.equal(await page.locator('.list-search input').inputValue(), 'Chrome', 'language switch preserves the current filter')
   await page.locator('.list-search input').fill('')
   await page.locator('.sidebar').getByText(labels[1], { exact: true }).click()
   await page.getByRole('heading', { name: labels[1], exact: true }).waitFor()
   await layout(locale + '-apps'); await screenshot(locale + '-applications')
   assert.equal(await page.locator('.ant-breadcrumb').count(), 0)
   const tableTop = await page.locator('.application-table').evaluate(element => element.getBoundingClientRect().top)
   assert.ok(tableTop < 390, `${locale} compact application header: table top ${tableTop}, viewport ${JSON.stringify(page.viewportSize())}`)
   const about = page.locator('.sidebar .about-app-trigger')
   await about.click()
   await page.locator('.about-app-content').waitFor()
   assert.ok((await page.locator('.about-build-date').innerText()).match(/\d{4}/))
   await desktop.evaluate(() => { globalThis.appRouteTestCopy = ''; globalThis.appRouteTestLinks = [] })
   for (const button of await page.locator('.about-app-links button').all()) await button.click()
   await page.getByText(translate(locale, '版本信息已复制'), { exact: true }).waitFor()
   const aboutActions = await desktop.evaluate(() => ({ links: globalThis.appRouteTestLinks, copied: globalThis.appRouteTestCopy }))
   assert.deepEqual(aboutActions.links.slice(-2), ['https://github.com/Yueyuyu/app-route', 'https://github.com/Yueyuyu/app-route/issues/new/choose'])
   assert.match(aboutActions.copied, /^AppRoute \d+\.\d+\.\d+-preview\.\d+\nBuild: .+\nRevision: /)
   assert.equal(aboutActions.copied.includes('Demo group'), false)
   await layout(locale + '-about'); await screenshot(locale + '-about')
   await page.keyboard.press('Escape'); await page.locator('.about-app-content').waitFor({ state: 'hidden' })
   assert.equal(await about.evaluate(element => element === document.activeElement), true)
   await page.keyboard.press('Enter'); await page.locator('.about-app-content').waitFor()
   await page.keyboard.press('Escape'); await page.locator('.about-app-content').waitFor({ state: 'hidden' })
   const connection = page.locator('.sidebar .integration-status')
   await connection.click(); await page.locator('.connection-quick').waitFor()
   await page.locator('.connection-quick-actions button').last().click()
   await page.locator('.connection-quick .diagnostic-report-time').waitFor()
   await page.waitForFunction(() => !document.querySelector('.connection-quick-actions .ant-btn-loading'))
   assert.equal(await page.locator('.connection-quick .is-stale').count(), 0)
   const reportTime = await page.locator('.connection-quick .diagnostic-report-time').innerText()
   await screenshot(locale + '-diagnostics-time')
   await page.locator('.diagnostic-summary').click()
   await page.locator('.ant-drawer-body:visible').waitFor()
   assert.equal(await page.locator('.ant-drawer-body:visible .diagnostic-report-time').innerText(), reportTime)
   await screenshot(locale + '-shared-report')
   await page.waitForFunction(() => Boolean(document.activeElement?.closest('[role=dialog]')))
   await page.keyboard.press('Escape'); await page.locator('.ant-drawer-body:visible').waitFor({ state: 'hidden' })
   if (locale === 'zh-CN') {
     await connection.click(); await page.locator('.connection-quick').waitFor()
     await fs.writeFile(path.join(fixture, 'scenario.json'), JSON.stringify({ offline: true }))
     await page.locator('.connection-quick .diagnostic-report-time.is-stale').waitFor({ timeout: 15000 })
     await fs.writeFile(path.join(fixture, 'scenario.json'), '{}')
     await page.locator('.sidebar .connection-dot.connected').waitFor({ timeout: 15000 })
     assert.equal(await page.locator('.connection-quick .diagnostic-report-time.is-stale').count(), 1, 'reconnect must not revive old report')
     await page.locator('.connection-quick-actions button').last().click()
     await page.locator('.connection-quick .diagnostic-report-time:not(.is-stale)').waitFor()
     await fs.writeFile(path.join(fixture, 'scenario.json'), JSON.stringify({ node: 'Demo node B' }))
     await page.locator('.connection-quick .diagnostic-report-time.is-stale').waitFor({ timeout: 15000 })
     await fs.writeFile(path.join(fixture, 'scenario.json'), '{}')
     await page.locator('.connection-quick dd').last().getByText('Demo node A', { exact: true }).waitFor({ timeout: 15000 })
     await page.locator('.connection-quick-actions button').last().click()
     await page.locator('.connection-quick .diagnostic-report-time:not(.is-stale)').waitFor()
     await fs.writeFile(path.join(fixture, 'scenario.json'), JSON.stringify({ configuration: 'demo-config-b' }))
     await page.locator('.connection-quick .diagnostic-report-time.is-stale').waitFor({ timeout: 15000 })
     await page.locator('.connection-quick-actions button').last().click()
     await page.locator('.connection-quick .diagnostic-report-time:not(.is-stale)').waitFor()
     await desktop.evaluate(({ powerMonitor }) => powerMonitor.emit('resume'))
     await page.locator('.connection-quick .diagnostic-report-time.is-stale').waitFor()
     await page.keyboard.press('Escape'); await page.locator('.connection-quick').waitFor({ state: 'hidden' })
     assert.equal(await connection.evaluate(element => element === document.activeElement), true)
     results.push({ label: 'diagnostics-disconnect-reconnect-node-configuration-resume', passed: true, resume: 'synthetic event, not physical sleep' })
   }
   results.push({ label: locale + '-about-and-shared-diagnostics', passed: true })
   const favoriteButton = page.locator('.view-filters button[aria-pressed]')
   await favoriteButton.click()
   await page.waitForFunction(() => document.querySelectorAll('.application-table button.application-name').length === 1)
   assert.equal(await page.locator('.application-table button.application-name').count(), 1)
   assert.ok((await page.locator('.application-table button.application-name').innerText()).includes('Google Chrome'))
   await favoriteButton.click()
   await page.locator('.list-toolbar [role=tab]').first().click()
   assert.equal(await page.locator('.application-table button.application-name').count(), 7)
   results.push({ label: locale + '-configured-and-favorites', passed: true })
   for (const [index, slug] of [[2, 'rules'], [3, 'icons'], [4, 'help']]) {
     await page.locator('.sidebar').getByText(labels[index], { exact: true }).click()
     await page.getByRole('heading', { name: labels[index], exact: true }).waitFor()
     await layout(locale + '-' + slug); await screenshot(locale + '-' + slug)
     if (slug === 'help') {
       const questions = page.locator('.help-questions .ant-collapse-header')
       for (let i = 0; i < await questions.count(); i++) await questions.nth(i).click()
       await layout(locale + '-help-expanded'); await screenshot(locale + '-help-expanded')
     }
   }
   await page.locator('.sidebar').getByText(labels[1], { exact: true }).click()
   await page.locator('.application-table button.application-name').first().click()
   await page.locator('.ant-drawer-body:visible').waitFor()
   await layout(locale + '-application-details'); await screenshot(locale + '-application-details')
   await page.keyboard.press('Escape'); await page.locator('.ant-drawer-body:visible').waitFor({ state: 'hidden' })
   await page.getByRole('button', { name: labels[5], exact: true }).click()
   await page.locator('.ant-drawer-body:visible').waitFor(); await screenshot(locale + '-connection')
   const connectionTabs = page.locator('.ant-drawer-body:visible [role=tab]')
   for (const index of [1, 2]) { await connectionTabs.nth(index).click(); await layout(locale + '-connection-tab-' + index); await screenshot(locale + '-connection-tab-' + index) }
   await page.keyboard.press('Escape'); await page.locator('.ant-drawer-body:visible').waitFor({ state: 'hidden' })
   await page.getByRole('button', { name: labels[6], exact: true }).click()
   const strategy = page.locator('.ant-drawer-body:visible')
   await strategy.waitFor()
   await strategy.getByRole('radio').nth(1).check()
   await strategy.getByRole('checkbox', { name: 'Demo node A', exact: true }).check()
   await strategy.getByRole('checkbox', { name: 'Demo node B', exact: true }).check()
   assert.equal(await strategy.locator('.strategy-node').count(), 2)
   await screenshot(locale + '-strategy')
   await strategy.locator('.ant-collapse-header').click()
   await strategy.getByRole('radio').nth(2).check()
   await layout(locale + '-strategy-advanced'); await screenshot(locale + '-strategy-advanced')
   await page.keyboard.press('Escape'); await page.locator('.ant-drawer-body:visible').waitFor({ state: 'hidden' })
   await page.locator('.routing-summary-actions button').filter({ hasText: labels[7] }).click()
   await page.locator('.ant-modal-container:visible').waitFor(); await screenshot(locale + '-recovery')
   await page.locator('.ant-modal-container:visible').getByRole('button', { name: new RegExp(labels[8].split('').join('\\s*')) }).click()
   await page.locator('.heading-actions button').filter({ hasText: labels[9] }).click()
   await page.locator('.ant-drawer-body:visible').waitFor(); await screenshot(locale + '-add')
   await page.keyboard.press('Escape'); await page.locator('.ant-drawer-body:visible').waitFor({ state: 'hidden' })
   await setDesktopViewport(page, { width: 1000, height: 760 })
   await layout(locale + '-narrow'); await screenshot(locale + '-narrow')
   await setDesktopViewport(page, { width: 1440, height: 1000 })
 }
 await sandbox.close(desktop); desktop = undefined
 desktop = await sandbox.launch(electron, executablePath)
 const reopened = await desktop.firstWindow(); await reopened.locator('.language-switcher').waitFor()
 assert.equal(await reopened.locator('html').getAttribute('lang'), 'fr')
 assert.equal(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu().items[1].label), 'Édition')
 results.push({ label: 'restart-language-persistence', passed: true })
 const systemLanguages = await desktop.evaluate(({ app }) => app.getPreferredSystemLanguages())
 await reopened.locator('.language-switcher').click()
 await reopened.locator('.ant-select-item-option').first().click()
 await reopened.waitForFunction(expected => document.documentElement.lang === expected, resolveLocale('system', systemLanguages))
 const preference = JSON.parse(await fs.readFile(path.join(env.LOCALAPPDATA, 'AppRoute/preferences.json'), 'utf8'))
 assert.equal(preference.language, 'system')
 results.push({ label: 'return-to-system-language', passed: true })
 const requests = (await fs.readFile(path.join(fixture, 'requests.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line).action)
 assert.deepEqual(requests.filter(action => action.startsWith('integration.') && !['integration.status', 'integration.diagnose', 'integration.reconcile'].includes(action)), [])
 assert.deepEqual(errors, [])
 await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ fixture: 'synthetic data; real desktop UI, IPC and language persistence; controlled content viewport, not native window sizing; no real routing changes', results, errors }, null, 2))
 console.log(JSON.stringify({ checks: results.length, output, errors }))
 passed = true
} catch (error) {
  const page = desktop?.windows()[0]
  if (page) { await page.screenshot({ path: path.join(output, 'failure.png') }); await fs.writeFile(path.join(output, 'failure.html'), await page.content()) }
  throw error
} finally {
  try { await sandbox.dispose() } catch (error) { passed = false; throw error }
  finally { await finishEvidence(passed) }
}
