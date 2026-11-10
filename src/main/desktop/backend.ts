import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ApplicationIconService } from '../services/applicationIconService.ts'
import { InventoryPreferencesStore } from '../services/inventoryPreferences.ts'
import { RoutingService } from '../services/routingService.ts'
import { scanApplications } from '../platform/windows/scanApplications.ts'
import { runningApplications } from '../platform/windows/runningApplications.ts'
import { validateDesktopRequest } from './boundary.ts'
import type { ApplicationScanResult } from '../../shared/application.ts'
import type { DesktopAction } from '../../shared/desktop.ts'

// 后台使用随桌面包携带的真正 Node 运行时，离线恢复复制同一运行时，不复制 Electron.exe。
const resources = path.dirname(fileURLToPath(import.meta.url))
const service = new RoutingService({ kitBundle: path.join(resources, 'recovery.cjs') })
const icons = new ApplicationIconService({ scan: () => scanApplications(path.join(resources, 'windows', 'scan-applications.ps1')) })
const inventory = new InventoryPreferencesStore(service.root)
let cachedScan: ApplicationScanResult | undefined
let lastScan = 0, mutations = 0, disconnected = false
const attempts = new Set<string>()
async function scan(force = false) {
  if (!force && cachedScan && Date.now() - lastScan < 60000) return cachedScan
  const result = await icons.scanApplications(); cachedScan = result; lastScan = Date.now(); return result
}
async function dispatch(action: DesktopAction, body: any = {}) {
  switch (action) {
    case 'applications.scan': return scan(body.force === true)
    case 'applications.running': return runningApplications()
    case 'inventory.read': return inventory.read()
    case 'inventory.write': return inventory.write(body)
    case 'integration.status': return service.status()
    case 'integration.apply-automatic': return service.applyAutomatically(body)
    case 'integration.apply': return service.apply(body)
    case 'integration.confirm': return service.confirm(body.id)
    case 'integration.rollback': return service.rollback(body.id)
    case 'integration.recover': return service.recoverAll()
    case 'integration.diagnose': return service.diagnose()
    case 'icons.state': return icons.state()
    case 'icons.scan': await scan(true); return icons.state()
    case 'icons.register': return icons.register(body.applications)
    case 'icons.replace': return icons.replace(body.key, body.data)
    case 'icons.reset': return icons.reset(body.key)
    case 'icons.image': return (await icons.image(body.directory, body.hash)).toString('base64')
    default: throw new Error('不支持的后台操作。')
  }
}
export function safeDesktopError(error: unknown) {
  return error instanceof Error && !(error as NodeJS.ErrnoException).code && !(error instanceof SyntaxError) && /^[\u4e00-\u9fff]/.test(error.message) ? error.message : '本机操作失败，请重试；网络异常时可使用独立恢复入口。'
}
process.on('message', async (request: { id: number; action: DesktopAction; body?: unknown }) => {
  if (!request || !Number.isSafeInteger(request.id)) return
  const mutation = request.action?.startsWith('integration.') && !['integration.status', 'integration.diagnose'].includes(request.action)
  if (mutation) mutations++
  try { validateDesktopRequest(request.action, request.body); const value = await dispatch(request.action, request.body); if (process.connected) process.send?.({ id: request.id, value }) }
  catch (error) { if (process.connected) process.send?.({ id: request.id, error: safeDesktopError(error) }) }
  finally { if (mutation) mutations--; if (disconnected && !mutations) process.exit(0) }
})
// 托盘隐藏时仍补充已经明确设置过的应用；不为新扫描应用自动设置网络。
let checking = false
const monitor = setInterval(async () => {
  if (mutations || checking || disconnected) return
  checking = true
  try {
    const status = await service.status()
    if (!status.connected || status.pending || !status.rulesLoaded) return
    const missing = status.uncoveredProcesses ?? []
    const app = status.managed.find(item => missing.some(p => p.applicationId === item.id) && item.processPaths?.length)
    if (!app) return
    const key = JSON.stringify([app.id, missing.filter(p => p.applicationId === app.id).map(p => p.process).sort()])
    if (attempts.has(key) || mutations) return
    attempts.add(key); mutations++
    try { await service.applyAutomatically({ revision: status.revision, target: app.target, applications: [{ ...app, path: app.processPaths![0], source: 'scan', category: '已管理应用' }] }) }
    finally { mutations-- }
  } catch { /* 状态接口继续显示未覆盖/恢复结果，用户可手动重试；不无限重放。 */ }
  finally { checking = false; if (disconnected && !mutations) process.exit(0) }
}, 10000)
process.on('disconnect', () => { disconnected = true; clearInterval(monitor); if (!mutations && !checking) process.exit(0) })
