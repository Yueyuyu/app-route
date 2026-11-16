import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseSettingsSnapshot, settingsFileLimit } from '../../core/settingsTransfer.ts'
import { processBasename, processPathKey } from '../../shared/applicationIdentity.ts'
import { assertNoSystemHostRouting, managedApplications } from '../../core/managedRouting.ts'
import { atomicWrite, digest, withLock } from '../storage/localState.ts'
import type { SettingsSnapshot } from '../../shared/settings.ts'
import type { ScenarioDraft, ScenarioList, ScenarioSave } from '../../shared/scenarios.ts'
import type { SettingsTransferService } from './settingsTransfer.ts'

const validId = (id: unknown): id is string => typeof id === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(id)
const validName = (name: unknown): name is string => typeof name === 'string' && name.trim().length > 0 && name.length <= 60 && !/[\x00-\x1f\x7f]/.test(name)

/** 方案只保存用户勾选的联网选择，使用时进入同一导入预览，不自行写代理配置。 */
export class SettingsScenarios {
  readonly settings: SettingsTransferService
  readonly folder: string
  private draft?: { view: ScenarioDraft; fingerprint: string; expires: number }
  constructor(settings: SettingsTransferService) { this.settings = settings; this.folder = path.join(settings.routing.root, 'scenarios') }
  private location(id: string) { if (!validId(id)) throw new Error('方案编号无效。'); return path.join(this.folder, id + '.json') }
  private async directory() {
    const stat = await fs.lstat(this.folder).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error })
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error('方案文件无法安全读取。')
  }
  private async fingerprint() { return digest(JSON.stringify(await Promise.all([this.settings.routing.state(), this.settings.inventory.read()]))) }
  private async read(id: string, fingerprint?: string) {
    const file = this.location(id); await this.directory()
    const stat = await fs.lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > settingsFileLimit) throw new Error('方案文件无法安全读取。')
    const text = await fs.readFile(file, 'utf8'), value = JSON.parse(text), actual = digest(text)
    if (fingerprint !== undefined && fingerprint !== actual) throw new Error('方案已变化，请刷新列表。')
    if (value.kind !== 'approute-scenario' || value.version !== 1 || !validName(value.name)) throw new Error('方案文件无法安全读取。')
    const snapshot = parseSettingsSnapshot(value.snapshot)
    if (snapshot.scope !== 'routing' || !snapshot.applications.length || snapshot.applications.length > 100 || snapshot.language || snapshot.proxyStrategy || snapshot.missingTargetAction) throw new Error('方案文件无法安全读取。')
    return { snapshot, summary: { id, name: value.name, createdAt: snapshot.createdAt, count: snapshot.applications.length, fingerprint: actual } }
  }
  async list(): Promise<ScenarioList> {
    await this.directory()
    const files = await fs.readdir(this.folder).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })
    const items: ScenarioList['items'] = []; let unreadable = 0
    for (const file of files.filter(file => file.endsWith('.json'))) {
      try { items.push((await this.read(file.slice(0, -5))).summary) } catch { unreadable++ }
    }
    return { items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), unreadable }
  }
  async prepare(): Promise<ScenarioDraft> {
    const fingerprint = await this.fingerprint(), snapshot = await this.settings.snapshot(), state = await this.settings.routing.state()
    if (fingerprint !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')
    const temporary = new Set(state.managed.filter(app => app.temporary).map(app => processPathKey(app.processPaths![0])))
    const view = { token: randomUUID(), rows: snapshot.applications.map((app, index) => {
      let blocked: string | undefined
      try {
        if (!app.path) throw new Error('missing')
        const candidate = { ...app, id: String(index), source: 'manual' as const, mode: 'direct' as const, processes: [processBasename(app.path)], processPaths: [app.path] }
        assertNoSystemHostRouting([candidate]); managedApplications([candidate])
      } catch { blocked = '该应用属于受保护或共享进程，不能导入分流设置。' }
      return { ...app, key: String(index), blocked, temporary: Boolean(app.path && temporary.has(processPathKey(app.path))) }
    }) }
    this.draft = { view, fingerprint, expires: Date.now() + 600000 }; return view
  }
  async save(request: ScenarioSave) {
    return withLock(path.join(this.settings.routing.root, 'scenarios-lock'), async () => {
      const draft = this.draft
      if (!draft || request?.token !== draft.view.token || draft.expires < Date.now()) throw new Error('方案编辑已过期，请重新创建。')
      if (!validName(request.name)) throw new Error('请输入 1 至 60 字的方案名称。')
      if (!Array.isArray(request.choices) || !request.choices.length || request.choices.length > 100 || new Set(request.choices.map(item => item.key)).size !== request.choices.length) throw new Error('请选择 1 至 100 个应用。')
      if (draft.fingerprint !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')
      const applications = request.choices.map(choice => {
        const app = draft.view.rows.find(row => row.key === choice.key)
        if (!app || app.temporary || app.blocked || !['rule', 'direct', 'proxy'].includes(choice.mode)) throw new Error('方案不能包含无效应用或临时设置。')
        return { name: app.name, path: app.path, category: app.category, mode: choice.mode }
      })
      const current = await this.list()
      if (current.items.length + current.unreadable >= 20) throw new Error('最多保存 20 个方案，请先删除不再使用的方案。')
      if (current.items.some(item => item.name.toLocaleLowerCase() === request.name.trim().toLocaleLowerCase())) throw new Error('方案名称已存在，请使用其他名称。')
      const snapshot: SettingsSnapshot = parseSettingsSnapshot({ app: 'AppRoute', kind: 'approute-settings', version: 1, scope: 'routing', createdAt: new Date().toISOString(), applications })
      const id = randomUUID()
      await this.directory(); await atomicWrite(this.location(id), JSON.stringify({ kind: 'approute-scenario', version: 1, name: request.name.trim(), snapshot }))
      this.draft = undefined; return (await this.read(id)).summary
    })
  }
  async preview(id: string, fingerprint: string) {
    if (typeof fingerprint !== 'string' || !fingerprint) throw new Error('方案已变化，请刷新列表。')
    return this.settings.preview((await this.read(id, fingerprint)).snapshot)
  }
  async remove(id: string, fingerprint: string) {
    return withLock(path.join(this.settings.routing.root, 'scenarios-lock'), async () => {
      if (typeof fingerprint !== 'string' || !fingerprint) throw new Error('方案已变化，请刷新列表。')
      await this.read(id, fingerprint); await fs.unlink(this.location(id)); return { deleted: true }
    })
  }
}
