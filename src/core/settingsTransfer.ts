import { processPathKey } from '../shared/applicationIdentity.ts'
import { isLanguagePreference } from '../shared/i18n/index.ts'
import { validateProxyStrategy } from './proxyStrategy.ts'
import { validProcessPath } from './processFamily.ts'
import type { SettingsSnapshot } from '../shared/settings.ts'

export const settingsFileLimit = 2 * 1024 * 1024
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\x00-\x1f]/.test(value)

/** 只接收声明的数据字段，绝不执行导入文件；历史导出缺少路径时留给预览明确标为不可匹配。 */
export function parseSettingsSnapshot(input: unknown): SettingsSnapshot {
  const value = input as Record<string, any> | null
  if (!value || value.app !== 'AppRoute' || value.version !== 1 || !['approute-settings', 'application-routing-snapshot'].includes(value.kind) ||
      !Array.isArray(value.applications) || value.applications.length > 5000 || (value.scope !== undefined && value.scope !== 'routing')) throw new Error('不是支持的 AppRoute 设置文件。')
  const createdAt = value.createdAt ?? value.exportedAt
  if (typeof createdAt !== 'string' || createdAt.length > 40 || !Number.isFinite(Date.parse(createdAt))) throw new Error('设置文件的时间格式无效。')
  const paths = new Set<string>()
  const applications = value.applications.map((item: any) => {
    if (!item || !text(item.name, 200) || !text(item.category, 100) || !['rule', 'direct', 'proxy'].includes(item.mode) ||
        (item.path !== undefined && !validProcessPath(item.path)) || (item.favorite !== undefined && typeof item.favorite !== 'boolean')) throw new Error('设置文件含有无效的应用资料。')
    if (item.path) { const key = processPathKey(item.path); if (paths.has(key)) throw new Error('设置文件含有重复的应用路径。'); paths.add(key) }
    return { name: item.name, category: item.category, mode: item.mode, ...(item.path ? { path: item.path } : {}), ...(item.favorite === undefined ? {} : { favorite: item.favorite }) }
  })
  if (value.language !== undefined && !isLanguagePreference(value.language)) throw new Error('设置文件的显示语言无效。')
  if (value.missingTargetAction !== undefined && !['block', 'original'].includes(value.missingTargetAction)) throw new Error('设置文件的代理失效策略无效。')
  return { app: 'AppRoute', kind: 'approute-settings', version: 1, createdAt, applications,
    ...(value.scope === 'routing' ? { scope: 'routing' as const } : {}),
    ...(value.language === undefined ? {} : { language: value.language }),
    ...(value.proxyStrategy === undefined ? {} : { proxyStrategy: validateProxyStrategy(value.proxyStrategy) }),
    ...(value.missingTargetAction === undefined ? {} : { missingTargetAction: value.missingTargetAction }) }
}

export function parseSettingsText(value: unknown): SettingsSnapshot {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > settingsFileLimit) throw new Error('设置文件过大，最多支持 2 MB。')
  try { return parseSettingsSnapshot(JSON.parse(value.replace(/^\uFEFF/, ''))) }
  catch (error) { if (error instanceof SyntaxError) throw new Error('设置文件不是有效的 JSON。'); throw error }
}
