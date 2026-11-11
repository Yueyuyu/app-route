import catalog from '../../resources/application-icons/catalog.json' with { type: 'json' }

export const applicationIconCatalog = catalog
export type CatalogApplication = typeof catalog.applications[number]
const normalize = (value: string) => value.toLowerCase().replace(/[\s_\-·]/g, '')

/** 精确进程名优先；通用进程名还须产品名或发布者一致。不做模糊包含匹配。 */
export function matchApplicationIcon(app: { name: string; processes: string[]; publisher?: string }): CatalogApplication | undefined {
  const identity = (entry: CatalogApplication) => [entry.name, ...entry.aliases].some(name => normalize(name) === normalize(app.name))
  const matches = catalog.applications.filter(entry => entry.processes.some(process => app.processes.some(value => value.toLowerCase() === process.toLowerCase())) &&
    (!entry.requireIdentity || identity(entry) || entry.publishers?.some(publisher => publisher.toLowerCase() === app.publisher?.toLowerCase())))
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) return undefined
  const names = catalog.applications.filter(identity)
  return names.length === 1 ? names[0] : undefined
}

export const catalogIconUrl = (id: string) => `/icons/apps/${id}.svg`
/** 这里只关联显示资源，绝不据此修改应用的进程或分流规则。 */
export function matchLocalApplicationIcon<T extends { name: string; processes: string[] }>(app: { name: string; processes: string[] }, local: T[]): T | undefined {
  const processes = local.filter(entry => entry.processes.some(p => app.processes.some(value => value.toLowerCase() === p.toLowerCase())))
  const genericProcess = app.processes.some(p => ['code.exe', 'chatgpt.exe', 'electron.exe'].includes(p.toLowerCase()))
  if (processes.length === 1 && !genericProcess) return processes[0]
  const names = (processes.length ? processes : local).filter(entry => normalize(entry.name) === normalize(app.name))
  return names.length === 1 ? names[0] : undefined
}
export function fallbackIconUrl(category: string): string {
  const key = ({ '浏览器': 'browser', '音乐娱乐': 'media', '社交通讯': 'chat', '开发工具': 'code', '游戏平台': 'game', '办公效率': 'office' } as Record<string, string>)[category] ?? 'application'
  return `/icons/fallbacks/${key}.svg`
}
