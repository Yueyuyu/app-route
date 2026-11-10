import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, protocol, session, shell, nativeImage } from 'electron'
import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { desktopAssetPath, desktopOrigin, isTrustedDesktopSender, validateDesktopRequest } from './boundary.ts'
import type { DesktopAction } from '../../shared/desktop.ts'

app.setName('AppRoute')
app.setPath('userData', path.join(process.env.LOCALAPPDATA!, 'AppRoute', 'desktop'))
app.setAppUserModelId('com.approute.desktop')
protocol.registerSchemesAsPrivileged([{ scheme: 'approute', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])
let window: BrowserWindow | undefined, tray: Tray | undefined, worker: ChildProcess | undefined, quitting = false, sequence = 0
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>()
const resources = app.getAppPath()
const icon = path.join(resources, 'ui', 'favicon.ico')
function startBackend() {
  if (worker?.connected) return
  const child = fork(path.join(resources, 'backend.mjs'), [], { execPath: path.join(resources, 'runtime', 'node.exe'), execArgv: [], windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, NODE_OPTIONS: undefined } })
  worker = child
  child.on('message', (response: any) => { const task = pending.get(response.id); if (!task) return; clearTimeout(task.timer); pending.delete(response.id); response.error ? task.reject(new Error(response.error)) : task.resolve(response.value) })
  const failed = () => { if (worker !== child) return; worker = undefined; for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('桌面后台已退出，已开始的分流仍有独立恢复保护。请重试。')) } pending.clear() }
  child.on('error', failed); child.on('exit', failed)
}
function request<T = any>(action: DesktopAction, body?: unknown): Promise<T> {
  validateDesktopRequest(action, body); startBackend()
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('操作超时，请检查当前状态；不要重复执行恢复中的分流。')) }, 150000)
    pending.set(id, { resolve, reject, timer }); worker!.send({ id, action, body }, error => { if (error) { clearTimeout(timer); pending.delete(id); reject(new Error('无法连接桌面后台。')) } })
  })
}
function showWindow() { if (!window || window.isDestroyed()) createWindow(); if (window!.isMinimized()) window!.restore(); window!.show(); window!.focus(); window!.webContents.send('approute:refresh') }
function createWindow() {
  window = new BrowserWindow({ title: 'AppRoute 应用分流', width: 1440, height: 980, minWidth: 960, minHeight: 640, show: false, icon,
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
  showWindow()
  const answer = await dialog.showMessageBox(window!, { type: 'question', title: '恢复网络', message: '停用全部 AppRoute 专属分流？', detail: '保留 Clash Party 原有规则和代理配置。收藏与应用列表保留。', buttons: ['取消', '恢复网络'], defaultId: 0, cancelId: 0 })
  if (answer.response !== 1) return
  try { const result = await request('integration.recover', {}); await dialog.showMessageBox(window!, { type: result.restored ? 'info' : 'warning', message: result.message }) }
  catch { await dialog.showMessageBox(window!, { type: 'error', message: '尚未确认恢复，请使用桌面上的 AppRoute - Restore Network 独立入口。' }) }
  window?.webContents.send('approute:refresh')
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', showWindow)
  app.on('before-quit', () => { quitting = true })
  app.on('will-quit', () => { tray?.destroy(); worker?.disconnect() })
  app.on('activate', showWindow)
  void app.whenReady().then(async () => {
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
      if (event.sender !== window?.webContents || !isTrustedDesktopSender(event.senderFrame?.url ?? '', event.senderFrame === event.sender.mainFrame)) throw new Error('桌面请求来源无效。')
      validateDesktopRequest(action, body)
      if (action === 'application.choose') {
        const result = await dialog.showOpenDialog(window!, { title: '选择应用主程序', filters: [{ name: 'Windows 应用', extensions: ['exe'] }], properties: ['openFile'] })
        if (result.canceled) return null
        const file = result.filePaths[0]
        if (!/^[a-z]:\\.+\.exe$/i.test(file) || !(await fs.stat(file)).isFile()) throw new Error('请选择本机 exe 程序。')
        return { path: file, name: path.basename(file, '.exe'), processes: [path.basename(file)] }
      }
      if (action === 'icons.image') throw new Error('请通过本机图片地址读取图标。')
      return request(action, body)
    })
    startBackend(); createWindow()
    tray = new Tray(nativeImage.createFromPath(icon))
    tray.setToolTip('AppRoute 应用分流 · 双击打开')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '打开 AppRoute', click: showWindow },
      { label: '检查新应用', click: () => { showWindow(); window!.webContents.send('approute:refresh') } },
      { type: 'separator' }, { label: '恢复网络…', click: () => void restoreFromTray() },
      { label: '打开独立恢复工具目录', click: () => void shell.openPath(path.join(process.env.LOCALAPPDATA!, 'AppRoute', 'recovery')) },
      { type: 'separator' }, { label: '退出 AppRoute（保留分流规则）', click: () => app.quit() },
    ]))
    tray.on('double-click', showWindow)
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'AppRoute', submenu: [
      { label: '收至托盘', click: () => window?.hide() },
      { label: '打开托盘菜单', click: () => tray?.popUpContextMenu() },
      { type: 'separator' }, { label: '退出（保留分流规则）', accelerator: 'CommandOrControl+Q', click: () => app.quit() },
    ] }, { label: '编辑', submenu: [{ label: '撤销', role: 'undo' }, { label: '复制', role: 'copy' }, { label: '粘贴', role: 'paste' }, { label: '全选', role: 'selectAll' }] }]))
  }).catch(() => { dialog.showErrorBox('AppRoute 启动失败', '请保留现有数据并重新打开应用。网络异常时可使用独立恢复入口。'); app.quit() })
}
