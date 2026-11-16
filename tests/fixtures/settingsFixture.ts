import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { SettingsTransferService } from '../../src/main/services/settingsTransfer.ts'
import { SettingsScenarios } from '../../src/main/services/settingsScenarios.ts'
import { UpgradeVerificationService } from '../../src/main/services/upgradeVerification.ts'
import type { Application } from '../../src/shared/application.ts'
import type { RoutingService } from '../../src/main/services/routingService.ts'

/** 真实导入/资料/备份服务 + 内存路由替身。此文件没有内核适配器，绝不连接真实代理。 */
export async function createSettingsFixture(root: string, applications: Application[], status: any) {
  const profile = process.env.APPROUTE_DATA_DIR!
  if (!path.resolve(profile).startsWith(path.resolve(root) + path.sep) || !path.basename(root).startsWith('settings-ui-')) throw new Error('设置验收必须使用独立目录')
  const state = { version: 1, revision: 'fixture', managed: status.managed, proxyGroup: 'Demo group', missingTargetAction: 'block' }
  const routing = { root: profile, state: async () => state, status: async () => ({ ...status, dataIssue: await fs.access(path.join(root, 'block-upgrade')).then(() => true, () => false) }), applyAutomatically: async (input: unknown) => {
    await fs.writeFile(path.join(root, 'routing-request.json'), JSON.stringify(input))
    return { outcome: 'applied' }
  } } as unknown as RoutingService
  const moved = { ...applications[1], id: 'moved-demo', path: 'C:\\MovedDemo\\firefox.exe' }
  const missingPrimary = () => fs.access(path.join(root, 'missing-primary')).then(() => true, () => false)
  const service = new SettingsTransferService(routing, async () => await missingPrimary() ? [...applications, moved] : applications, async file =>
    await missingPrimary() ? file !== applications[1].path && (file === moved.path || applications.some(app => app.path === file)) : applications.some(app => app.path === file))
  const upgrade = new UpgradeVerificationService(service)
  const scenarios = new SettingsScenarios(service)
  await service.inventory.write({ version: 1, applications, favorites: [applications[0].path!.toLowerCase()] })
  const history = path.join(profile, 'backups/state')
  await fs.mkdir(history, { recursive: true })
  for (const [index, content] of [JSON.stringify(state), JSON.stringify({ ...state, pendingId: 'fixture-pending' }), '{broken'].entries()) {
    await fs.writeFile(path.join(history, `${Date.now() - (index + 1) * 1000}-${randomUUID()}.json`), content)
  }
  return async (action: string, body: any) => {
    switch (action) {
      case 'updates.prepare': return upgrade.prepare(body.fromVersion, body.targetVersion)
      case 'updates.status': return upgrade.check(body.currentVersion)
      case 'inventory.read': return service.inventory.read()
      case 'inventory.write': return service.inventory.write(body)
      case 'settings.snapshot': return service.snapshot()
      case 'settings.scenarios': return scenarios.list()
      case 'settings.scenario-prepare': return scenarios.prepare()
      case 'settings.scenario-save': return scenarios.save(body)
      case 'settings.scenario-preview': return scenarios.preview(body.id, body.fingerprint)
      case 'settings.scenario-delete': return scenarios.remove(body.id, body.fingerprint)
      case 'settings.preview': return service.previewText(body.text)
      case 'settings.path-preview': return service.previewMissingPaths()
      case 'settings.bind': return service.bind(body)
      case 'settings.import': return service.import(body)
      case 'settings.backups': return service.backups.list()
      case 'settings.backup-create': return { id: await service.backups.create(await service.snapshot(), 'manual') }
      case 'settings.backup-preview': {
        const backup = await service.backups.read(body.id)
        if (!backup.restorable || backup.fingerprint !== body.fingerprint) throw new Error('备份已变化或属于未完成事务，请刷新列表。')
        return service.preview(backup.snapshot)
      }
      case 'settings.backup-export': return (await service.backups.read(body.id)).snapshot
      case 'settings.backup-delete': return service.backups.remove(body.id, body.fingerprint)
      default: throw new Error('验收入口未实现')
    }
  }
}
