import { processPathKey } from '../shared/applicationIdentity.ts'
import type { SettingsApplication, SettingsSnapshot } from '../shared/settings.ts'

const settingsFields = (app: SettingsApplication) => [app.mode, app.name, app.category, Boolean(app.favorite)]
/** 新扫描出的默认应用不算丢设置；原有条目的资料、分流、收藏和全局策略分别核对。 */
export function changedUpgradeSettings(before: SettingsSnapshot, current: SettingsSnapshot): number {
  const currentApps = new Map(current.applications.filter(app => app.path).map(app => [processPathKey(app.path!), app]))
  let changed = 0
  for (const app of before.applications) {
    const found = app.path ? currentApps.get(processPathKey(app.path)) : undefined
    if (!found || JSON.stringify(settingsFields(found)) !== JSON.stringify(settingsFields(app))) changed++
  }
  if (JSON.stringify(current.proxyStrategy) !== JSON.stringify(before.proxyStrategy)) changed++
  if ((current.missingTargetAction ?? 'original') !== (before.missingTargetAction ?? 'original')) changed++
  if ((current.language ?? 'system') !== (before.language ?? 'system')) changed++
  return changed
}
