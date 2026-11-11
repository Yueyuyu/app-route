import path from 'node:path'
import type { Application } from '../shared/application.ts'
import { macApplicationBundle, processBasename, processPathKey } from '../shared/applicationIdentity.ts'

export interface RunningProcess { pid: number; parentPid: number; path: string }
export const normalizeProcessPath = (value: string) => value.startsWith('/') ? value : processPathKey(path.win32.normalize(value))
export function validProcessPath(value: unknown): value is string {
  return typeof value === 'string' && ((/^[a-z]:\\/i.test(value) && /\.exe$/i.test(value)) || Boolean(macApplicationBundle(value) && !value.includes('\\') && !value.endsWith('/'))) &&
    !/[,\r\n\x00-\x1f*?"<>|]/.test(value) && value.length <= 1000 &&
    !value.split(/[\\/]/).includes('..')
}

/** 只有主程序的后代且位于同一安装目录内才归入该应用；共享宿主不按名称扩张。 */
export function identifyProcessFamily(app: Application, running: RunningProcess[], previousPaths: string[] = []): Application {
  if (!validProcessPath(app.path)) throw new Error('无法确认主程序路径，请重新扫描或填写完整 exe 路径。')
  const primary = normalizeProcessPath(app.path)
  const directory = macApplicationBundle(primary) ? macApplicationBundle(primary)! + '/' : path.win32.dirname(primary) + '\\'
  const familyIds = new Set(running.filter(p => normalizeProcessPath(p.path) === primary).map(p => p.pid))
  for (let pass = 0; pass < running.length; pass++) {
    let changed = false
    for (const p of running) if (!familyIds.has(p.pid) && familyIds.has(p.parentPid)) { familyIds.add(p.pid); changed = true }
    if (!changed) break
  }
  const paths = new Map<string, string>([[primary, app.path]])
  // 仅延续本工具曾核实过的同目录身份；不信任页面传来的 processPaths。
  for (const value of previousPaths) if (validProcessPath(value) && normalizeProcessPath(value).startsWith(directory)) paths.set(normalizeProcessPath(value), value)
  const warnings: string[] = []
  for (const p of running) {
    if (!familyIds.has(p.pid) || normalizeProcessPath(p.path) === primary) continue
    if (validProcessPath(p.path) && normalizeProcessPath(p.path).startsWith(directory)) paths.set(normalizeProcessPath(p.path), p.path)
    else warnings.push('发现目录外的辅助进程，未自动接管共享程序。')
  }
  if (paths.size > 40) throw new Error('辅助进程数量异常，未修改规则。')
  const processPaths = [...paths.values()]
  return { ...app, processPaths, processes: [...new Set(processPaths.map(processBasename))],
    processWarnings: [...new Set([...warnings, '按父子关系识别运行中的辅助进程；页面开启时检测进入 Clash 的新辅助进程，失败后可手动重新识别。'])] }
}
