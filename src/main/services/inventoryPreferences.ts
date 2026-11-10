import path from 'node:path'
import { atomicWrite, readOptional, withLock } from '../storage/localState.ts'
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
    return content ? cleanInventoryPreferences(JSON.parse(content)) : { version: 1, applications: [], favorites: [] }
  }
  async write(value: unknown) {
    const clean = cleanInventoryPreferences(value)
    await withLock(path.join(this.root, 'inventory-lock'), () => atomicWrite(path.join(this.root, 'inventory.json'), JSON.stringify(clean)))
    return { saved: true }
  }
}
