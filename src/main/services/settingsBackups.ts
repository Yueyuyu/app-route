import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { atomicWrite, digest } from '../storage/localState.ts'
import { parseSettingsSnapshot, parseSettingsText, settingsFileLimit } from '../../core/settingsTransfer.ts'
import { parseRoutingState } from '../storage/routingStateStore.ts'
import type { SettingsBackup, SettingsSnapshot } from '../../shared/settings.ts'

/** 备份仅保存 AppRoute 的白名单设置，不包含订阅、完整内核配置或事务原始文件。 */
export class SettingsBackupStore {
  readonly root: string
  constructor(root: string) { this.root = root }
  private location(id: string) {
    if (!/^(settings|state)\/\d{13}-[\da-f-]{36}\.json$/.test(id)) throw new Error('备份编号无效。')
    return path.join(this.root, 'backups', ...id.split('/'))
  }
  private async assertDirectories(folder: string) {
    for (const directory of [path.join(this.root, 'backups'), path.join(this.root, 'backups', folder)]) {
      const stat = await fs.lstat(directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error })
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error('备份文件无法安全读取。')
    }
  }
  async read(id: string) {
    const file = this.location(id)
    await this.assertDirectories(id.split('/')[0])
    const stat = await fs.lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > settingsFileLimit) throw new Error('备份文件无法安全读取。')
    const content = await fs.readFile(file, 'utf8')
    const fingerprint = digest(content)
    if (id.startsWith('state/')) {
      const state = parseRoutingState(content)
      const snapshot = parseSettingsSnapshot({ app: 'AppRoute', kind: 'approute-settings', version: 1,
        createdAt: new Date(Number(id.split('/')[1].slice(0, 13))).toISOString(),
        applications: state.managed.map(app => ({ name: app.name, path: app.processPaths?.[0], category: '其他应用', mode: app.mode, favorite: false })),
        proxyStrategy: state.proxyStrategy ?? (state.proxyGroup ? { mode: 'existing', group: state.proxyGroup } : undefined), missingTargetAction: state.missingTargetAction })
      return { snapshot, fingerprint, kind: 'routing' as const, restorable: !state.pendingId, bytes: stat.size }
    }
    const snapshot = parseSettingsText(content), value = JSON.parse(content)
    return { snapshot, fingerprint, kind: value.backupKind === 'before-import' ? 'before-import' as const : 'manual' as const, restorable: true, bytes: stat.size }
  }
  async create(snapshot: SettingsSnapshot, kind: 'manual' | 'before-import') {
    const clean = parseSettingsSnapshot(snapshot)
    const content = JSON.stringify({ ...clean, backupKind: kind }, null, 2)
    if (Buffer.byteLength(content) > settingsFileLimit) throw new Error('设置文件过大，最多支持 2 MB。')
    const id = `settings/${Date.now()}-${randomUUID()}.json`
    await this.assertDirectories('settings')
    await atomicWrite(this.location(id), content)
    return id
  }
  async list(): Promise<SettingsBackup[]> {
    const entries: SettingsBackup[] = []
    for (const folder of ['settings', 'state']) {
      await this.assertDirectories(folder)
      const names = await fs.readdir(path.join(this.root, 'backups', folder)).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })
      for (const name of names.filter(name => /^\d{13}-[\da-f-]{36}\.json$/.test(name))) {
        const id = `${folder}/${name}`, createdAt = new Date(Number(name.slice(0, 13))).toISOString()
        try { const value = await this.read(id); entries.push({ id, createdAt, count: value.snapshot.applications.length, bytes: value.bytes, kind: value.kind, restorable: value.restorable, fingerprint: value.fingerprint, valid: true }) }
        catch { entries.push({ id, createdAt, count: 0, bytes: 0, kind: folder === 'state' ? 'routing' : 'manual', valid: false, restorable: false, fingerprint: '' }) }
      }
    }
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async remove(id: string, fingerprint: string) {
    // 不删除无法核对的损坏/未知文件，不触碰待恢复事务及独立恢复工具。
    const current = await this.read(id)
    if (!current.restorable || current.fingerprint !== fingerprint) throw new Error('备份已变化或属于未完成事务，请刷新列表。')
    await fs.unlink(this.location(id))
    return { deleted: true }
  }
}
