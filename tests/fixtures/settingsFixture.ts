import fs from 'node:fs/promises'
import path from 'node:path'
import { SettingsTransferService } from '../../src/main/services/settingsTransfer.ts'
import type { Application } from '../../src/shared/application.ts'
import type { RoutingService } from '../../src/main/services/routingService.ts'

/** 真实导入/资料/备份服务 + 内存路由替身。此文件没有内核适配器，绝不连接真实代理。 */
export async function createSettingsFixture(root: string, applications: Application[], status: any) {
  const profile = process.env.APPROUTE_DATA_DIR!
  if (!path.resolve(profile).startsWith(path.resolve(root) + path.sep) || !path.basename(root).startsWith('settings-ui-')) throw new Error('设置验收必须使用独立目录')
  const state = { version: 1, revision: 'fixture', managed: status.managed, proxyGroup: 'Demo group', missingTargetAction: 'block' }
  const routing = { root: profile, state: async () => state, applyAutomatically: async (input: unknown) => {
    await fs.writeFile(path.join(root, 'routing-request.json'), JSON.stringify(input))
    return { outcome: 'applied' }
  } } as unknown as RoutingService
  const service = new SettingsTransferService(routing, async () => applications, async file => applications.some(app => app.path === file))
  await service.inventory.write({ version: 1, applications, favorites: [applications[0].path!.toLowerCase()] })
  return async (action: string, body: any) => {
    switch (action) {
      case 'inventory.read': return service.inventory.read()
      case 'inventory.write': return service.inventory.write(body)
      case 'settings.snapshot': return service.snapshot()
      case 'settings.preview': return service.previewText(body.text)
      case 'settings.import': return service.import(body)
      case 'settings.backups': return service.backups.list()
      case 'settings.backup-create': return { id: await service.backups.create(await service.snapshot(), 'manual') }
      case 'settings.backup-preview': {
        const backup = await service.backups.read(body.id)
        if (backup.fingerprint !== body.fingerprint) throw new Error('备份已变化或属于未完成事务，请刷新列表。')
        return service.preview(backup.snapshot)
      }
      case 'settings.backup-export': return (await service.backups.read(body.id)).snapshot
      case 'settings.backup-delete': return service.backups.remove(body.id, body.fingerprint)
      default: throw new Error('验收入口未实现')
    }
  }
}
