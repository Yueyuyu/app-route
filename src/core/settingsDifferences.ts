import type { SettingsApplication, SettingsDifference } from '../shared/settings.ts'

/** 只描述实际会导入的字段；历史规则和缺省收藏不清空当前资料。 */
export function settingsDifferences(current: SettingsApplication, incoming: SettingsApplication, scope?: 'routing'): SettingsDifference[] {
  const fields = scope === 'routing' ? ['mode'] as const : ['mode', 'name', 'category', 'favorite'] as const
  return fields.flatMap(field => {
    if (field === 'favorite' && incoming.favorite === undefined) return []
    const before = current[field] ?? false, after = incoming[field] ?? false
    return before === after ? [] : [{ field, before, after }]
  })
}
