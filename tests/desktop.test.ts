import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applicationKey, applicationView, isSystemTool, isRunningApplication, mergeScannedApplications } from '../src/core/applicationViews.ts'
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
