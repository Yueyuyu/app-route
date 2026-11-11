import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applicationKey, applicationView, filterApplications, isSystemTool, isRunningApplication, mergeScannedApplications } from '../src/core/applicationViews.ts'
import { desktopAssetPath, isTrustedDesktopSender, validateDesktopRequest } from '../src/main/desktop/boundary.ts'
import { InventoryPreferencesStore } from '../src/main/services/inventoryPreferences.ts'
import type { Application } from '../src/shared/application.ts'

const app = (id: string, file: string, mode: Application['mode'] = 'rule'): Application => ({ id, name: id, path: file, processes: [path.win32.basename(file)], mode, source: 'scan', category: '其他应用' })
test('我的应用由收藏及实际分流组成，正在运行只按精确路径匹配', () => {
  const apps = [app('music', 'C:\\Apps\\Music\\music.exe', 'direct'), app('browser', 'C:\\Apps\\Browser\\browser.exe'), app('other', 'D:\\Tools\\browser.exe')]
  const favorites = [applicationKey(apps[1])]
  assert.deepEqual(applicationView(apps, 'mine', favorites, []).map(a => a.id), ['browser', 'music'])
  const running = [{ path: 'c:\\apps\\browser\\BROWSER.EXE', pid: 10, parentPid: 1 }]
  assert.deepEqual(applicationView(apps, 'running', [], running).map(a => a.id), ['browser'])
  assert.equal(isRunningApplication({ ...apps[0], processPaths: ['C:\\Apps\\Music\\helper.exe'] }, [{ path: 'C:\\Apps\\Music\\helper.exe', pid: 11, parentPid: 10 }]), true)
  assert.equal(apps[1].mode, 'rule')
})
test('折叠系统维护工具，不凭未知发布者或共享宿主名隐藏普通应用', () => {
  assert.equal(isSystemTool(app('控制面板', 'C:\\Windows\\System32\\control.exe')), true)
  assert.equal(isSystemTool(app('AMD Bug Report Tool', 'C:\\AMD\\AMDBugReportTool.exe')), true)
  assert.equal(isSystemTool(app('音乐', 'C:\\Apps\\Music\\music.exe')), false)
  assert.equal(isSystemTool(app('商店软件', 'C:\\Program Files\\WindowsApps\\Example\\app.exe')), false)
})
test('搜索跨越我的应用和运行视图，支持空格大小写及辅助进程，同时保留显式筛选', () => {
  const music = { ...app('music', 'C:\\Apps\\Music\\QQMusic.exe', 'direct'), name: 'QQ 音乐', processes: ['QQMusic.exe', 'qmbrowser.exe'], category: '音乐娱乐' }
  const browser = { ...app('browser', 'C:\\Apps\\Browser\\chrome.exe'), name: 'Google Chrome' }
  const tool = app('control', 'C:\\Windows\\System32\\control.exe')
  const apps = [music, browser, tool]
  const options = { view: 'mine' as const, favorites: [] as string[], running: [], query: '', mode: 'all', category: 'all', favoritesOnly: false }
  assert.deepEqual(filterApplications(apps, options).map(a => a.id), ['music'])
  for (const query of ['google chrome', 'GOOGLECHROME', 'Chrome.exe']) assert.deepEqual(filterApplications(apps, { ...options, query }).map(a => a.id), ['browser'])
  for (const query of ['QQ音乐', 'ＱＱ 音乐', 'QMBROWSER.EXE']) assert.deepEqual(filterApplications(apps, { ...options, query }).map(a => a.id), ['music'])
  assert.deepEqual(filterApplications(apps, { ...options, view: 'running', query: 'control.exe' }).map(a => a.id), ['control'])
  assert.equal(filterApplications(apps, { ...options, query: 'chrome', mode: 'direct' }).length, 0)
  assert.equal(filterApplications(apps, { ...options, query: 'music', category: '开发工具' }).length, 0)
  assert.equal(filterApplications(apps, { ...options, query: 'chrome', favoritesOnly: true }).length, 0)
  assert.deepEqual(filterApplications(apps, { ...options, query: 'chrome', favoritesOnly: true, favorites: [applicationKey(browser)] }).map(a => a.id), ['browser'])
  assert.equal(browser.mode, 'rule')
})
test('重扫增加新应用并保持默认规则，保留手动和便携资料，不重放缓存代理设置', () => {
  const original = { ...app('manual', 'C:\\Apps\\Music\\music.exe', 'proxy'), source: 'manual' as const, name: '我的音乐', category: '音乐娱乐' }
  const portable = { ...app('portable', 'D:\\Portable\\tool.exe', 'direct'), discovery: 'running' as const }
  const removed = app('uninstalled', 'C:\\Apps\\Removed\\removed.exe')
  const result = mergeScannedApplications([original, portable, removed], [app('new-id', 'c:\\apps\\music\\music.exe'), app('new', 'C:\\Apps\\New\\new.exe')])
  assert.equal(result.length, 3)
  assert.equal(result[0].name, '我的音乐')
  assert.equal(result[0].category, '音乐娱乐')
  assert.ok(result.every(app => app.mode === 'rule'))
})
test('桌面 IPC 限制来源、子框架、操作名和请求大小，资源不能越出 UI 目录', () => {
  assert.equal(isTrustedDesktopSender('approute://app/index.html', true), true)
  for (const url of ['https://app/index.html', 'approute://evil/index.html', 'approute://app/other.html', 'approute://user@app/index.html']) assert.equal(isTrustedDesktopSender(url, true), false)
  assert.equal(isTrustedDesktopSender('approute://app/index.html', false), false)
  assert.doesNotThrow(() => validateDesktopRequest('integration.status'))
  assert.throws(() => validateDesktopRequest('shell.execute'))
  assert.throws(() => validateDesktopRequest('inventory.write', 'x'.repeat(5 * 1024 * 1024)))
  const root = path.resolve('fixture-ui')
  assert.equal(desktopAssetPath(root, 'approute://app/assets/main.js'), path.join(root, 'assets/main.js'))
  for (const url of ['file:///private/config.yaml', 'approute://evil/index.html', 'approute://app/%2e%2e%5csecret', 'approute://app/a%2f..%2f..%2fsecret']) assert.throws(() => desktopAssetPath(root, url))
})
test('桌面收藏持久化，读写资料不会写入联网状态，也不会覆盖损坏文件', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-desktop-test-'))
  try {
    const store = new InventoryPreferencesStore(root)
    assert.deepEqual((await store.read()).favorites, [])
    const application = app('music', 'C:\\Apps\\Music\\music.exe', 'proxy')
    await store.write({ version: 1, applications: [application], favorites: [applicationKey(application)] })
    const reopened = await new InventoryPreferencesStore(root).read()
    assert.equal(reopened.applications[0].mode, 'rule')
    assert.deepEqual(reopened.favorites, [applicationKey(application)])
    assert.equal(await fs.stat(path.join(root, 'state.json')).then(() => true, () => false), false)
    await fs.writeFile(path.join(root, 'inventory.json'), '{bad data')
    await assert.rejects(store.read())
    assert.equal(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'), '{bad data')
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
