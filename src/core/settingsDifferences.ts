import type { SettingsApplication, SettingsDifference } from '../shared/settings.ts'

/** 只描述实际会导入的字段；历史规则和缺省收藏不清空当前资料。 */
export function settingsDifferences(current: SettingsApplication, incoming: SettingsApplication, scope?: 'routing'): SettingsDifference[] {
  const fields = scope === 'routing' ? ['mode'] as const : ['mode', 'name', 'category', 'favorite'] as const
  const differences: SettingsDifference[] = fields.flatMap(field => {
    if (field === 'favorite' && incoming.favorite === undefined) return []
    const before = current[field] ?? false, after = incoming[field] ?? false
    return before === after ? [] : [{ field, before, after }]
  })
  if (incoming.domainExceptions !== undefined || incoming.mode === 'rule' && current.domainExceptions?.length) {
    const display = (items: SettingsApplication['domainExceptions']) => (items ?? []).map(item => `${item.kind}:${item.domain} → ${item.mode}`).join('; ')
    const before = display(current.domainExceptions), after = display(incoming.mode === 'rule' ? [] : incoming.domainExceptions)
    if (before !== after) differences.push({ field: 'domainExceptions', before, after })
  }
  return differences
}
