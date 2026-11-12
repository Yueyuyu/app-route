import path from 'node:path'
import { atomicWrite, digest, readOptional, withLock } from '../storage/localState.ts'
import { migrateInventory } from '../../core/applicationInventory.ts'
import type { InventoryPreferences } from '../../shared/desktop.ts'

export function cleanInventoryPreferences(value: unknown): InventoryPreferences {
  const input = value as Partial<InventoryPreferences> | undefined
  if (!input || input.version !== 1 || !Array.isArray(input.applications) || input.applications.length > 5000 || !Array.isArray(input.favorites) || input.favorites.length > 5000 || input.favorites.some(key => typeof key !== 'string' || key.length > 2048)) throw new Error('应用列表资料无效。')
  return { version: 1, applications: migrateInventory(input), favorites: [...new Set(input.favorites)] }
}
export class InventoryPreferencesStore {
  readonly root: string
  constructor(root: string) { this.root = root }
  async read(): Promise<InventoryPreferences> {
    const content = await readOptional(path.join(this.root, 'inventory.json'))
    return { ...(content ? cleanInventoryPreferences(JSON.parse(content)) : { version: 1 as const, applications: [], favorites: [] }), revision: digest(content ?? '') }
  }
  async write(value: unknown) {
    const clean = cleanInventoryPreferences(value)
    return withLock(path.join(this.root, 'inventory-lock'), async () => {
      // 旧界面缓存不能覆盖无法读取或来自更高版本的资料。
      const current = await this.read()
      if ((value as InventoryPreferences).revision !== undefined && (value as InventoryPreferences).revision !== current.revision) throw new Error('应用资料已变化，请重新读取后再保存。')
      const content = JSON.stringify(clean)
      await atomicWrite(path.join(this.root, 'inventory.json'), content)
      return { saved: true, revision: digest(content) }
    })
  }
}
