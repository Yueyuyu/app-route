import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseSettingsText, parseSettingsSnapshot } from '../../core/settingsTransfer.ts'
import { assertNoSystemHostRouting, managedApplications } from '../../core/managedRouting.ts'
import { strategyOwnership } from '../../core/proxyStrategy.ts'
import { processPathKey } from '../../shared/applicationIdentity.ts'
import { atomicWrite, digest, readOptional, withLock } from '../storage/localState.ts'
import { InventoryPreferencesStore, cleanInventoryPreferences } from './inventoryPreferences.ts'
import { LanguagePreferencesStore } from '../desktop/languagePreferences.ts'
import { SettingsBackupStore } from './settingsBackups.ts'
import type { RoutingService } from './routingService.ts'
import type { Application } from '../../shared/application.ts'
import type { SettingsImportRequest, SettingsImportResult, SettingsPreview, SettingsSnapshot } from '../../shared/settings.ts'

interface ImportSession { snapshot: SettingsSnapshot; fingerprint: string; expires: number; applications: Map<string, Application>; preview: SettingsPreview }
export class SettingsTransferService {
  readonly inventory: InventoryPreferencesStore
  readonly language: LanguagePreferencesStore
  readonly backups: SettingsBackupStore
  readonly routing: RoutingService
  readonly scan: () => Promise<Application[]>
  readonly available: (file: string) => Promise<boolean>
  private session?: ImportSession
  constructor(routing: RoutingService, scan: () => Promise<Application[]>, available: (file: string) => Promise<boolean> = async file => fs.stat(file).then(stat => stat.isFile(), () => false)) {
    this.routing = routing; this.scan = scan; this.available = available
    this.inventory = new InventoryPreferencesStore(routing.root)
    this.language = new LanguagePreferencesStore(routing.root)
    this.backups = new SettingsBackupStore(routing.root)
  }
  private async fingerprint() {
    return digest(JSON.stringify(await Promise.all(['state.json', 'inventory.json', 'preferences.json'].map(file => readOptional(path.join(this.routing.root, file))))))
  }
  async snapshot(): Promise<SettingsSnapshot> {
    const before = await this.fingerprint()
    const [state, inventory, language] = await Promise.all([this.routing.state(), this.inventory.read(), this.language.read()])
    if (state.pendingId) throw new Error('请等待分流操作或恢复检查完成。')
    const applications = new Map(inventory.applications.filter(app => app.path).map(app => [processPathKey(app.path!), { name: app.name, path: app.path, category: app.category || '其他应用', mode: 'rule' as Application['mode'], favorite: inventory.favorites.includes(processPathKey(app.path!)) }]))
    for (const app of state.managed) {
      const primary = app.processPaths?.[0]
      if (!primary) continue // 旧进程名规则不能在其他电脑猜测为同名程序。
      const key = processPathKey(primary), previous = applications.get(key)
      applications.set(key, { name: previous?.name ?? app.name, path: primary, category: previous?.category ?? '其他应用', mode: app.mode, favorite: previous?.favorite ?? false })
    }
    if (before !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')
    return parseSettingsSnapshot({ app: 'AppRoute', kind: 'approute-settings', version: 1, createdAt: new Date().toISOString(), applications: [...applications.values()], language,
      proxyStrategy: state.proxyStrategy ?? (state.proxyGroup ? { mode: 'existing', group: state.proxyGroup } : undefined), missingTargetAction: state.missingTargetAction })
  }
  async previewText(text: unknown) { return this.preview(parseSettingsText(text)) }
  async preview(snapshot: SettingsSnapshot): Promise<SettingsPreview> {
    snapshot = parseSettingsSnapshot(snapshot)
    const before = await this.fingerprint()
    const [state, inventory, scanned] = await Promise.all([this.routing.state(), this.inventory.read(), this.scan()])
    if (state.pendingId) throw new Error('请等待分流操作或恢复检查完成。')
    const local = new Map([...scanned, ...inventory.applications].filter(app => app.path).map(app => [processPathKey(app.path!), app]))
    const applications = new Map<string, Application>()
    const rows = await Promise.all(snapshot.applications.map(async (item, i) => {
      const key = String(i), found = item.path ? local.get(processPathKey(item.path)) : undefined
      const configured = found && state.managed.find(app => app.id === found.id || app.processPaths?.some(file => processPathKey(file) === processPathKey(found.path!)))
      let reason: string | undefined
      if (!found || !await this.available(found.path!)) reason = '本机未找到对应路径，请先扫描或添加应用。'
      else {
        // 导入 ID 和辅助进程不可信；只用本机确认的主程序，应用时后台再次识别组件。
        const application = { ...found, id: configured?.id ?? found.id, name: snapshot.scope === 'routing' ? found.name : item.name, category: snapshot.scope === 'routing' ? found.category : item.category, mode: item.mode, source: 'manual' as const, processPaths: undefined, processWarnings: undefined }
        try { assertNoSystemHostRouting([application]); managedApplications([application], 'preview-target'); applications.set(key, application) }
        catch { reason = '该应用属于受保护或共享进程，不能导入分流设置。' }
      }
      return { ...item, key, currentMode: configured?.mode ?? 'rule' as const, configured: Boolean(configured), available: !reason, ...(reason ? { reason } : {}) }
    }))
    if (before !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')
    const preview: SettingsPreview = { token: randomUUID(), createdAt: snapshot.createdAt, rows, language: snapshot.language, proxyStrategy: snapshot.proxyStrategy, currentGroup: state.proxyGroup, affectedProxyCount: state.managed.filter(app => app.mode === 'proxy').length }
    this.session = { snapshot, fingerprint: before, expires: Date.now() + 10 * 60_000, applications, preview }
    return preview
  }
  async import(request: SettingsImportRequest): Promise<SettingsImportResult> {
    return withLock(path.join(this.routing.root, 'settings-lock'), () => withLock(path.join(this.routing.root, 'inventory-lock'), async () => {
      const session = this.session
      if (!request || !session || request.token !== session.preview.token || session.expires < Date.now()) throw new Error('导入预览已过期，请重新选择文件。')
      if (!Array.isArray(request.keys) || request.keys.length > 100 || new Set(request.keys).size !== request.keys.length || request.keys.some(key => !session.applications.has(key)) ||
          [request.applyRouting, request.restoreStrategy, request.restoreLanguage].some(value => typeof value !== 'boolean') || (request.restoreStrategy && !request.applyRouting) ||
          (!request.keys.length && !request.restoreLanguage && !request.restoreStrategy)) throw new Error('请选择有效的导入项目，一次最多 100 个应用。')
      if (session.fingerprint !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')
      if (request.restoreStrategy && !session.snapshot.proxyStrategy) throw new Error('文件中没有可恢复的代理策略。')
      if (request.restoreLanguage && !session.snapshot.language) throw new Error('文件中没有可恢复的显示语言。')
      const state = await this.routing.state(), inventory = await this.inventory.read()
      if (state.pendingId) throw new Error('请等待分流操作或恢复检查完成。')
      const selected = request.keys.map(key => session.applications.get(key)!)
      for (const app of selected) if (!await this.available(app.path!)) throw new Error('应用路径已失效，请重新预览。')
      const candidate = new Map(inventory.applications.map(app => [app.path ? processPathKey(app.path) : app.id, app]))
      const favorites = new Set(inventory.favorites)
      for (const key of request.keys) {
        const app = session.applications.get(key)!, identity = processPathKey(app.path!)
        candidate.set(identity, { ...app, mode: 'rule' })
        // 只恢复用户明确选中的条目，未选中应用的收藏保持原样。
        const favorite = session.snapshot.applications[Number(key)].favorite
        if (session.snapshot.scope !== 'routing') {
          if (favorite === true) favorites.add(identity); else if (favorite === false) favorites.delete(identity)
        }
      }
      const nextInventory = cleanInventoryPreferences({ version: 1, applications: [...candidate.values()], favorites: [...favorites] })
      const before = await this.snapshot()
      const backupId = await this.backups.create(before, 'before-import')
      let routingApplied = false
      const warnings: string[] = []
      if (request.applyRouting && (selected.length || request.restoreStrategy)) {
        const strategy = request.restoreStrategy ? session.snapshot.proxyStrategy : undefined
        const target = strategy ? strategy.mode === 'existing' ? strategy.group : strategyOwnership.name : state.proxyGroup
        const migrated = strategy ? state.managed.filter(app => app.mode === 'proxy' && !selected.some(item => item.id === app.id)).map(app => ({ ...app, path: app.processPaths?.[0], source: 'manual' as const, category: '已管理应用' })) : []
        if (selected.length + migrated.length > 100) throw new Error('同时应用的项目超过 100 个，请分批导入或单独恢复代理策略。')
        const result = await this.routing.applyAutomatically({ applications: [...selected, ...migrated], revision: state.revision, target,
          ...(strategy ? { proxyStrategy: strategy, proxyGroup: target, missingTargetAction: session.snapshot.missingTargetAction ?? state.missingTargetAction } : {}) })
        if (result.outcome !== 'applied') throw new Error(result.message)
        routingApplied = true
      }
      // 多文件不能宣称跨网络原子提交；路由成功后资料保存失败必须显式报告，保留导入前备份。
      let imported = 0
      try { await atomicWrite(path.join(this.routing.root, 'inventory.json'), JSON.stringify(nextInventory)); imported = selected.length }
      catch { warnings.push('应用资料保存失败；已保留导入前备份，请重新预览后重试。') }
      if (request.restoreLanguage) {
        try { await this.language.write(session.snapshot.language, before.language) }
        catch { warnings.push('显示语言未能恢复，请在语言菜单重新选择。') }
      }
      this.session = undefined
      return { imported, routingApplied, backupId, warnings }
    }))
  }
}
