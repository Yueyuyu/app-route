import fs from 'node:fs/promises'
import path from 'node:path'
import { compareReleaseVersions, parseReleaseVersion } from '../../core/releaseUpdates.ts'
import { changedUpgradeSettings } from '../../core/upgradeSettings.ts'
import type { UpgradeVerification } from '../../shared/updates.ts'
import { atomicWrite, withLock } from '../storage/localState.ts'
import type { SettingsTransferService } from './settingsTransfer.ts'

interface UpgradeBaseline { version: 1; fromVersion: string; targetVersion: string; preparedAt: string; backupId: string; fingerprint: string }
export class UpgradeVerificationService {
  private file: string
  private settings: SettingsTransferService
  constructor(settings: SettingsTransferService) { this.settings = settings; this.file = path.join(settings.routing.root, 'upgrade.json') }
  async prepare(fromVersion: unknown, targetVersion: unknown) {
    if (typeof fromVersion !== 'string' || typeof targetVersion !== 'string' || !parseReleaseVersion(fromVersion) || !parseReleaseVersion(targetVersion) || compareReleaseVersions(targetVersion, fromVersion) <= 0) throw new Error('更新版本无效，请重新检查。')
    return withLock(path.join(this.settings.routing.root, 'settings-lock'), async () => {
      const status = await this.settings.routing.status()
      if (status.pending) throw new Error('有分流或设置操作尚未完成，请稍后更新。')
      if (status.dataIssue || status.untrackedRuleCount) throw new Error('管理记录待核对，请先处理后再创建升级备份。')
      const snapshot = await this.settings.snapshot()
      const backupId = await this.settings.backups.create(snapshot, 'before-upgrade')
      const backup = await this.settings.backups.read(backupId)
      const baseline: UpgradeBaseline = { version: 1, fromVersion, targetVersion, preparedAt: new Date().toISOString(), backupId, fingerprint: backup.fingerprint }
      await atomicWrite(this.file, JSON.stringify(baseline))
      return { backupId }
    })
  }
  async check(currentVersion: unknown): Promise<UpgradeVerification> {
    try {
      const stat = await fs.lstat(this.file).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error })
      if (!stat) return { state: 'none' }
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384 || typeof currentVersion !== 'string' || !parseReleaseVersion(currentVersion)) throw new Error('invalid baseline')
      const baseline: UpgradeBaseline = JSON.parse(await fs.readFile(this.file, 'utf8'))
      if (baseline.version !== 1 || !parseReleaseVersion(baseline.fromVersion) || !parseReleaseVersion(baseline.targetVersion) || compareReleaseVersions(baseline.targetVersion, baseline.fromVersion) <= 0 || !Number.isFinite(Date.parse(baseline.preparedAt)) || !/^[a-f0-9]{64}$/.test(baseline.fingerprint)) throw new Error('invalid baseline')
      const base = { targetVersion: baseline.targetVersion, checkedAt: new Date().toISOString(), backupId: baseline.backupId }
      const backup = await this.settings.backups.read(baseline.backupId)
      if (backup.kind !== 'before-upgrade' || backup.fingerprint !== baseline.fingerprint || !backup.restorable) throw new Error('changed baseline')
      if (compareReleaseVersions(currentVersion, baseline.targetVersion) < 0) return { ...base, state: 'pending' }
      const [snapshot, status] = await Promise.all([this.settings.snapshot(), this.settings.routing.status()])
      if (status.dataIssue || status.untrackedRuleCount || status.pending) throw new Error('unconfirmed records')
      const changedCount = changedUpgradeSettings(backup.snapshot, snapshot)
      // 只报告差异，不因升级或用户之后的修改重放备份。文件保留与内核加载分开核对。
      return { ...base, state: changedCount ? 'changed' : 'preserved', changedCount, rules: !status.connected ? 'waiting' : status.rulesLoaded ? 'loaded' : 'issue' }
    } catch { return { state: 'unavailable', checkedAt: new Date().toISOString() } }
  }
}
