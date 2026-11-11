import type { Application } from '../shared/application.ts'
import type { RunningApplicationProcess } from '../shared/desktop.ts'
import { processPathKey } from '../shared/applicationIdentity.ts'

export type ApplicationView = 'configured' | 'running' | 'all'
export const applicationKey = (app: Application) => processPathKey(app.path || app.id)
export function isRunningApplication(app: Application, running: RunningApplicationProcess[]): boolean {
  const paths = new Set([app.path, ...(app.processPaths ?? [])].filter(Boolean).map(p => processPathKey(p!)))
  return running.some(process => paths.has(processPathKey(process.path)))
}
/** 仅影响折叠展示；未知软件保持展开，不用发布者或名字推断联网策略。 */
export function isSystemTool(app: Application): boolean {
  const executable = app.processes[0]?.toLowerCase() ?? ''
  return /^[a-z]:\\windows\\(?:system32|syswow64)\\/i.test(applicationKey(app)) ||
    /^(?:control|regedit|mmc|msconfig|taskmgr|eventvwr|services|perfmon|resmon|appverif|cmd|powershell|pwsh)\.exe$/.test(executable) ||
    /(?:uninstall|unins\d*|installer|installmanager|updater|bugreport|crashreport|diagnostic)/i.test(executable)
}
export function applicationView(apps: Application[], view: ApplicationView, favorites: string[], running: RunningApplicationProcess[]) {
  return apps.filter(app => view === 'all' || (view === 'configured' ? app.mode !== 'rule' : isRunningApplication(app, running)))
    .sort((a, b) => Number(favorites.includes(applicationKey(b))) - Number(favorites.includes(applicationKey(a))) || a.name.localeCompare(b.name, 'zh-CN'))
}

const searchText = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[\s_-]+/g, '')
/** 搜索始终覆盖全部应用；用户显式选择的分类、联网方式和收藏条件仍然有效。 */
export function filterApplications(apps: Application[], options: {
  view: ApplicationView; favorites: string[]; running: RunningApplicationProcess[]
  query: string; mode: string; category: string; favoritesOnly: boolean
}): Application[] {
  const query = searchText(options.query)
  return applicationView(apps, options.query.trim() ? 'all' : options.view, options.favorites, options.running).filter(app =>
    (options.mode === 'all' || app.mode === options.mode) &&
    (options.category === 'all' || app.category === options.category) &&
    (!options.favoritesOnly || options.favorites.includes(applicationKey(app))) &&
    (!query || [app.name, ...app.processes, app.path ?? '', ...(app.processPaths ?? [])].some(value => searchText(value).includes(query))))
}
/** 扫描只更新资料，不重放联网方式；保留便携/手动条目及用户编辑过的分类。 */
export function mergeScannedApplications(current: Application[], scanned: Application[]): Application[] {
  const next = scanned.map(app => {
    const previous = current.find(old => applicationKey(old) === applicationKey(app))
    return { ...app, ...(previous?.source === 'manual' ? { name: previous.name, source: previous.source } : {}), category: previous?.category || app.category, mode: 'rule' as const, discoveredAt: previous?.discoveredAt ?? (current.length && !previous ? new Date().toISOString() : undefined) }
  })
  return [...next, ...current.filter(old => (old.source === 'manual' || old.discovery === 'running') && !next.some(app => applicationKey(app) === applicationKey(old))).map(app => ({ ...app, mode: 'rule' as const }))]
}
