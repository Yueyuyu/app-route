import { appRouteDataDirectory, nodeExecutableName } from '../platform/paths.ts'
import { readMacApplication } from '../platform/macos/applications.ts'
import { resolveLocale, translate, type LanguagePreference } from '../../shared/i18n/index.ts'
import { LanguagePreferencesStore } from './languagePreferences.ts'
import { inspectMihomoFile } from '../adapters/mihomoEndpointInspector.ts'
import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, protocol, session, shell, nativeImage, powerMonitor, clipboard, net } from 'electron'
import { ReleaseUpdateService } from './releaseUpdates.ts'
import { UpdateInstaller } from './updateInstaller.ts'
import { launchWindowsUpdate, updateInstallation } from './windowsUpdate.ts'
import { projectLink, versionSummary, type BuildInfo } from '../../shared/appInfo.ts'
import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { desktopAssetPath, desktopOrigin, isTrustedDesktopSender, validateDesktopRequest } from './boundary.ts'
import type { DesktopAction, DesktopDestination } from '../../shared/desktop.ts'
import type { SettingsImportResult } from '../../shared/settings.ts'
import type { UpdateChannel } from '../../shared/updates.ts'
import { settingsFileLimit } from '../../core/settingsTransfer.ts'

app.setName('AppRoute')
app.setPath('userData', path.join(appRouteDataDirectory(), 'desktop'))
app.setAppUserModelId('com.approute.desktop')
protocol.registerSchemesAsPrivileged([{ scheme: 'approute', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])
let window: BrowserWindow | undefined, tray: Tray | undefined, worker: ChildProcess | undefined, quitting = false, sequence = 0
const languageStore = new LanguagePreferencesStore(appRouteDataDirectory())
let language: LanguagePreference = 'system'
let systemLanguages: string[] = []
const tr = (source: string) => translate(resolveLocale(language, systemLanguages), source)
const languageSettings = () => ({ language, systemLanguages })
let languageWrite: Promise<unknown> = Promise.resolve()
const pending = new Map<number, { action: DesktopAction; resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>()
const resources = app.getAppPath()
let updates: ReleaseUpdateService, updateInstaller: UpdateInstaller, installedBuild: BuildInfo
let installingUpdate = false, installerStarted = false
const icon = path.join(resources, 'ui', process.platform === 'darwin' ? 'brand/app-route-512.png' : 'favicon.ico')
function startBackend() {
  if (worker?.connected) return
  if (worker && worker.exitCode === null) throw new Error(tr('桌面后台正在结束，请稍后重试。'))
  const child = fork(path.join(resources, 'backend.mjs'), [], { execPath: path.join(resources, 'runtime', nodeExecutableName()), execArgv: [], windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, NODE_OPTIONS: undefined } })
  worker = child
  child.on('message', (response: any) => { const task = pending.get(response.id); if (!task) return; clearTimeout(task.timer); pending.delete(response.id); response.error ? task.reject(new Error(response.error)) : task.resolve(response.value) })
  const failed = () => { if (worker !== child) return; worker = undefined; for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error(tr("桌面后台已退出，已开始的分流仍有独立恢复保护。请重试。"))) } pending.clear() }
  child.on('error', failed); child.on('exit', failed)
}
function request<T = any>(action: DesktopAction, body?: unknown): Promise<T> {
  if (installingUpdate && action !== 'updates.prepare') return Promise.reject(new Error(tr('正在准备安装更新，请稍后操作。')))
  validateDesktopRequest(action, body); startBackend()
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(tr("操作超时，请检查当前状态；不要重复执行恢复中的分流。"))) }, 150000)
    pending.set(id, { action, resolve, reject, timer }); worker!.send({ id, action, body }, error => { if (error) { clearTimeout(timer); pending.delete(id); reject(new Error(tr("无法连接桌面后台。"))) } })
  })
}
async function stopBackendForUpdate() {
  const child = worker
  if (!child || child.exitCode !== null) return
  await new Promise<void>((resolve, reject) => {
    const stopped = () => { clearTimeout(timer); resolve() }
    const timer = setTimeout(() => { child.removeListener('exit', stopped); reject(new Error('后台操作尚未结束，请稍后更新。')) }, 10000)
    child.once('exit', stopped)
    if (child.connected) child.disconnect()
  })
}
function updateHasPendingMutation() {
  return [...pending.values()].some(task => task.action.startsWith('settings.') || task.action === 'inventory.write' || task.action === 'language.write' || task.action === 'updates.prepare' || task.action.startsWith('integration.') && !['integration.status', 'integration.diagnose', 'integration.history'].includes(task.action))
}
function updateNativeLanguage() {
    const navigate = (destination: DesktopDestination) => { showWindow(); window!.webContents.send('approute:navigate', destination) }
    const shortcuts = () => [
      { label: tr('查看已设置应用'), click: () => navigate('configured') },
      { label: tr('查看正在运行'), click: () => navigate('running') },
      { label: tr('查看连接检查'), click: () => navigate('connection') },
    ]
    window?.setTitle(tr('AppRoute 应用分流'))
    tray!.setToolTip(tr("AppRoute 应用分流 · 双击打开"))
    tray!.setContextMenu(Menu.buildFromTemplate([
      { label: tr("打开 AppRoute"), click: showWindow },
      { label: tr("检查新应用"), click: () => { showWindow(); window!.webContents.send('approute:refresh') } },
      ...shortcuts(),
      { type: 'separator' }, { label: tr("恢复网络…"), click: () => void restoreFromTray() },
      { label: tr("打开独立恢复工具目录"), click: () => void shell.openPath(path.join(appRouteDataDirectory(), 'recovery')) },
      { type: 'separator' }, { label: tr("退出 AppRoute（保留分流规则）"), click: () => app.quit() },
    ]))
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'AppRoute', submenu: [
      { label: tr("收至托盘"), click: () => window?.hide() },
      { label: tr("打开托盘菜单"), click: () => tray?.popUpContextMenu() },
      ...shortcuts(),
      { type: 'separator' }, { label: tr("退出（保留分流规则）"), accelerator: 'CommandOrControl+Q', click: () => app.quit() },
    ] }, { label: tr("编辑"), submenu: [{ label: tr("撤销"), role: 'undo' }, { label: tr("复制"), role: 'copy' }, { label: tr("粘贴"), role: 'paste' }, { label: tr("全选"), role: 'selectAll' }] }]))
}
function showWindow() { if (!window || window.isDestroyed()) createWindow(); if (window!.isMinimized()) window!.restore(); window!.show(); window!.focus(); window!.webContents.send('approute:refresh') }
function createWindow() {
  window = new BrowserWindow({ title: tr("AppRoute 应用分流"), width: 1440, height: 980, minWidth: 960, minHeight: 640, show: false, icon,
    backgroundColor: '#ffffff', autoHideMenuBar: true,
    webPreferences: { preload: path.join(resources, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, backgroundThrottling: false, spellcheck: false } })
  window.on('close', event => { if (!quitting) { event.preventDefault(); window!.hide() } })
  window.on('focus', () => window!.webContents.send('approute:refresh'))
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  window.webContents.on('will-attach-webview', event => event.preventDefault())
  window.once('ready-to-show', () => window!.show())
  void window.loadURL(`${desktopOrigin}/index.html`)
}
async function restoreFromTray() {
  if (installingUpdate) return
  showWindow()
  const answer = await dialog.showMessageBox(window!, { type: 'question', title: tr("恢复网络"), message: tr("停用全部 AppRoute 专属分流？"), detail: tr("保留 Clash Party 原有规则和代理配置。收藏与应用列表保留。"), buttons: [tr("取消"), tr("恢复网络")], defaultId: 0, cancelId: 0 })
  if (answer.response !== 1) return
  try { const result = await request('integration.recover', {}); await dialog.showMessageBox(window!, { type: result.restored ? 'info' : 'warning', message: tr(result.message) }) }
  catch { await dialog.showMessageBox(window!, { type: 'error', message: tr("尚未确认恢复，请使用桌面上的 AppRoute - Restore Network 独立入口。") }) }
  window?.webContents.send('approute:refresh')
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', showWindow)
  app.on('before-quit', event => { if (installingUpdate && !installerStarted) { event.preventDefault(); return }; quitting = true })
  app.on('will-quit', () => { tray?.destroy(); if (worker?.connected) worker.disconnect() })
  app.on('activate', showWindow)
  void app.whenReady().then(async () => {
    systemLanguages = app.getPreferredSystemLanguages()
    language = await languageStore.read().catch(() => 'system' as const)
    installedBuild = await fs.readFile(path.join(resources, 'ui', 'build-info.json'), 'utf8').then(text => JSON.parse(text)).catch(() => ({ version: app.getVersion(), builtAt: '', revision: 'unknown', dirty: false }))
    updates = new ReleaseUpdateService(installedBuild.version, process.platform, process.arch, (input, init) => net.fetch(input as string, init))
    const installation = await updateInstallation(process.platform, app.isPackaged, process.execPath)
    updateInstaller = new UpdateInstaller({ root: appRouteDataDirectory(), platform: process.platform, arch: process.arch, installation,
      fetch: (input, init) => net.fetch(input as string, init),
      changed: value => { if (window && !window.isDestroyed()) window.webContents.send('approute:update-download', value) },
      prepare: async (version, installing) => {
        if (updateHasPendingMutation()) throw new Error('有分流或设置操作尚未完成，请稍后更新。')
        await languageWrite
        await request('updates.prepare', { fromVersion: installedBuild.version, targetVersion: version, installing: installing && installation === 'automatic' })
        if (installing && installation === 'automatic') await stopBackendForUpdate()
      },
    })
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    session.defaultSession.setPermissionCheckHandler(() => false)
    protocol.handle('approute', async req => {
      try {
        if (req.method !== 'GET') return new Response(null, { status: 405 })
        const url = new URL(req.url)
        if (url.host !== 'app') return new Response(null, { status: 403 })
        const match = /^\/api\/icons\/image\/(cache|custom)\/([a-f0-9]{64})\.png$/.exec(url.pathname)
        if (match) return new Response(Buffer.from(await request<string>('icons.image', { directory: match[1], hash: match[2] }), 'base64'), { headers: { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff' } })
        const asset = desktopAssetPath(path.join(resources, 'ui'), req.url)
        const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' }
        return new Response(await fs.readFile(asset), { headers: { 'Content-Type': mime[path.extname(asset)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'" } })
      } catch { return new Response(null, { status: 404 }) }
    })
    ipcMain.handle('approute:request', async (event, action: unknown, body?: unknown) => {
      if (event.sender !== window?.webContents || !isTrustedDesktopSender(event.senderFrame?.url ?? '', event.senderFrame === event.sender.mainFrame)) throw new Error(tr("桌面请求来源无效。"))
      validateDesktopRequest(action, body)
      if (installingUpdate && action !== 'updates.download-state') throw new Error(tr('正在准备安装更新，请稍后操作。'))
      if (action === 'updates.check') return updates.check((body as { channel?: unknown } | undefined)?.channel)
      if (action === 'updates.status') return request(action, { currentVersion: installedBuild.version })
      if (action === 'updates.download-state') return updateInstaller.snapshot()
      if (action === 'updates.cancel') return updateInstaller.cancel()
      if (action === 'updates.reveal') { await updateInstaller.showFile(file => shell.showItemInFolder(file)); return { opened: true } }
      if (action === 'updates.download') {
        const input = body as { channel?: unknown; version?: unknown } | undefined
        const release = updates.selected(input?.channel, input?.version)
        return updateInstaller.start(release, input!.channel as UpdateChannel)
      }
      if (action === 'updates.install') {
        if (updateHasPendingMutation()) throw new Error(tr('有分流或设置操作尚未完成，请稍后更新。'))
        const input = body as { channel?: unknown; version?: unknown } | undefined
        installingUpdate = true
        try {
          await updates.check(input?.channel, true)
          const release = updates.selected(input?.channel, input?.version)
          await updateInstaller.install(release, async (file, mode) => {
            if (mode === 'automatic') {
              await launchWindowsUpdate(file)
              installerStarted = true
              setTimeout(() => app.quit(), 100)
            } else if (process.platform === 'darwin') {
              if (await shell.openPath(file)) throw new Error('安装包未能打开，请在下载目录中手动安装。')
            } else shell.showItemInFolder(file)
          })
          return { started: installerStarted, manual: !installerStarted }
        } finally {
          if (!installerStarted) { installingUpdate = false; window?.webContents.send('approute:refresh') }
        }
      }
      if (action === 'updates.prepare') throw new Error(tr('不支持的桌面操作。'))
      if (action === 'backend.pick-mihomo') {
        try {
          const chosen = await dialog.showOpenDialog(window!, { title: tr('选择运行配置并检查'), filters: [{ name: 'YAML / JSON', extensions: ['yaml', 'yml', 'json'] }], properties: ['openFile'] })
          if (chosen.canceled || !chosen.filePaths[0]) return null
          return await inspectMihomoFile(chosen.filePaths[0])
        } catch { throw new Error(tr('操作失败')) }
      }
      if (action === 'settings.pick-import') {
        const chosen = await dialog.showOpenDialog(window!, { title: tr('导入设置'), filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] })
        if (chosen.canceled || !chosen.filePaths[0]) return null
        const stat = await fs.stat(chosen.filePaths[0])
        if (!stat.isFile() || stat.size > settingsFileLimit) throw new Error(tr('设置文件过大，最多支持 2 MB。'))
        return request('settings.preview', { text: await fs.readFile(chosen.filePaths[0], 'utf8') })
      }
      if (action === 'settings.export' || action === 'settings.backup-export') {
        const snapshot = await request(action === 'settings.export' ? 'settings.snapshot' : action, body)
        const chosen = await dialog.showSaveDialog(window!, { title: tr('导出设置'), defaultPath: 'AppRoute-settings.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
        if (chosen.canceled || !chosen.filePath) return { saved: false }
        await fs.writeFile(chosen.filePath, JSON.stringify(snapshot, null, 2), { mode: 0o600 })
        return { saved: true }
      }
      if (action === 'settings.import') {
        const result = await request<SettingsImportResult>(action, body)
        try { language = await languageStore.read(); updateNativeLanguage() }
        catch { result.warnings.push('显示语言未能恢复，请在语言菜单重新选择。') }
        return result
      }
      if (action === 'app.open-link') {
        await shell.openExternal(projectLink((body as { target?: unknown } | undefined)?.target))
        return { opened: true }
      }
      if (action === 'app.copy-version') {
        const info: BuildInfo = JSON.parse(await fs.readFile(path.join(resources, 'ui', 'build-info.json'), 'utf8'))
        await clipboard.writeText(versionSummary(info))
        return { copied: true }
      }
      if (action === 'language.read') {
        const previousLocale = resolveLocale(language, systemLanguages)
        systemLanguages = app.getPreferredSystemLanguages()
        if (tray && previousLocale !== resolveLocale(language, systemLanguages)) updateNativeLanguage()
        return languageSettings()
      }
      if (action === 'language.write') {
        const input = body as { language?: unknown } | undefined
        const task = languageWrite.catch(() => {}).then(async () => {
          language = await languageStore.write(input?.language)
          updateNativeLanguage()
          return languageSettings()
        })
        languageWrite = task
        return task
      }
      if (action === 'integration.diagnostics-export') {
        const result = await dialog.showSaveDialog(window!, { title: tr('导出脱敏诊断'), defaultPath: 'AppRoute-diagnostics.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
        if (result.canceled || !result.filePath) return { saved: false }
        const data = await request(action)
        await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), { mode: 0o600 })
        return { saved: true }
      }
      if (action === 'application.choose') {
        const result = await dialog.showOpenDialog(window!, { title: tr("选择应用主程序"), filters: [{ name: process.platform === 'darwin' ? 'macOS' : tr("Windows 应用"), extensions: [process.platform === 'darwin' ? 'app' : 'exe'] }], properties: ['openFile'] })
        if (result.canceled) return null
        const file = result.filePaths[0]
        if (process.platform === 'darwin') { const app = await readMacApplication(file); return { path: app.path, name: app.name, processes: app.processes } }
        if (!/^[a-z]:\\.+\.exe$/i.test(file) || !(await fs.stat(file)).isFile()) throw new Error(tr("请选择本机 exe 程序。"))
        return { path: file, name: path.basename(file, '.exe'), processes: [path.basename(file)] }
      }
      if (action === 'icons.image') throw new Error(tr("请通过本机图片地址读取图标。"))
      return request(action, body)
    })
    startBackend(); createWindow()
    void request('updates.status', { currentVersion: installedBuild.version }).catch(() => {})
    powerMonitor.on('resume', () => { window?.webContents.send('approute:resume'); void request('integration.reconcile').catch(() => {}).finally(() => window?.webContents.send('approute:refresh')) })
    tray = new Tray(process.platform === 'darwin' ? nativeImage.createFromPath(icon).resize({ width: 18, height: 18 }) : nativeImage.createFromPath(icon))
    tray.on('double-click', showWindow)
    updateNativeLanguage()
  }).catch(() => { dialog.showErrorBox(tr("AppRoute 启动失败"), tr("请保留现有数据并重新打开应用。网络异常时可使用独立恢复入口。")); app.quit() })
}
