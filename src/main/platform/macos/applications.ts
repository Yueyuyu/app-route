import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Application, ApplicationScanResult } from '../../../shared/application.ts'
import { digest } from '../../storage/localState.ts'
import { validProcessName } from '../../../core/applicationRules.ts'
import { validProcessPath, identifyProcessFamily, type RunningProcess } from '../../../core/processFamily.ts'
import { macApplicationBundle, processBasename } from '../../../shared/applicationIdentity.ts'
import { protectedProcessPath } from '../../../core/managedRouting.ts'

const run = promisify(execFile)
const commandOptions = { timeout: 10000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' as const }

/** 只解析应用包元数据，不执行所选应用；拒绝逃出包目录的链接和可执行路径。 */
export async function readMacApplication(bundle: string, includeIcon = false): Promise<Application> {
  if (!path.posix.isAbsolute(bundle) || !bundle.endsWith('.app') || /[,\x00-\x1f]/.test(bundle)) throw new Error('请选择有效的 macOS 应用包。')
  const canonicalBundle = await fs.realpath(bundle)
  const { stdout } = await run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path.join(canonicalBundle, 'Contents', 'Info.plist')], commandOptions)
  const info = JSON.parse(stdout)
  if (typeof info.CFBundleExecutable !== 'string' || !validProcessName(info.CFBundleExecutable, true)) throw new Error('应用包没有有效的主程序。')
  const executable = await fs.realpath(path.join(canonicalBundle, 'Contents', 'MacOS', info.CFBundleExecutable))
  if (!executable.startsWith(canonicalBundle + '/') || !validProcessPath(executable) || !(await fs.stat(executable)).isFile()) throw new Error('应用主程序超出应用包范围。')
  const app: Application = { id: 'mac-' + digest(executable).slice(0, 32), name: String(info.CFBundleDisplayName || info.CFBundleName || path.basename(bundle, '.app')).slice(0, 80), path: executable,
    processes: [processBasename(executable)], source: 'scan', discovery: 'installed', category: '', mode: 'rule' }
  if (includeIcon && typeof info.CFBundleIconFile === 'string' && !/[\/\\]/.test(info.CFBundleIconFile)) {
    const name = info.CFBundleIconFile.endsWith('.icns') ? info.CFBundleIconFile : info.CFBundleIconFile + '.icns'
    let temporary: string | undefined
    try {
      const input = await fs.realpath(path.join(canonicalBundle, 'Contents', 'Resources', name))
      if (!input.startsWith(canonicalBundle + '/')) return app
      temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-icon-'))
      const output = path.join(temporary, 'icon.png')
      await run('/usr/bin/sips', ['-s', 'format', 'png', '-Z', '64', input, '--out', output], commandOptions)
      const image = await fs.readFile(output)
      if (image.length < 512 * 1024) { app.icon = 'data:image/png;base64,' + image.toString('base64'); app.iconMethod = 'bundle' }
    } catch { /* 无图标的应用仍可扫描，图标服务负责公共图标或默认图标。 */ }
    finally { if (temporary) await fs.rm(temporary, { recursive: true, force: true }) }
  }
  return app
}

export function parseMacProcesses(text: string): RunningProcess[] {
  return text.split('\n').flatMap(line => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line)
    return match && validProcessPath(match[3]) ? [{ pid: Number(match[1]), parentPid: Number(match[2]), path: match[3] }] : []
  })
}
let pendingProcesses: Promise<RunningProcess[]> | undefined
export function runningMacApplications(): Promise<RunningProcess[]> {
  if (process.platform !== 'darwin') return Promise.resolve([])
  // comm 只读取程序身份，不采集进程参数、窗口标题或访问内容。
  pendingProcesses ??= run('/bin/ps', ['-axww', '-o', 'pid=,ppid=,comm='], commandOptions).then(async ({ stdout }) => {
    // /var、/tmp 等系统别名与扫描所得 realpath 必须使用同一身份。
    const records = await Promise.all(parseMacProcesses(stdout).map(async item => {
      const canonical = await fs.realpath(item.path).catch(() => undefined)
      return canonical && validProcessPath(canonical) ? { ...item, path: canonical } : undefined
    }))
    return records.filter((item): item is RunningProcess => Boolean(item))
  }).finally(() => { pendingProcesses = undefined })
  return pendingProcesses
}

let pendingScan: Promise<ApplicationScanResult> | undefined
export function scanMacApplications(): Promise<ApplicationScanResult> {
  if (process.platform !== 'darwin') return Promise.reject(new Error('扫描 macOS 应用需要在 Mac 本机运行。'))
  pendingScan ??= scan().finally(() => { pendingScan = undefined })
  return pendingScan
}
async function scan(): Promise<ApplicationScanResult> {
  const bundles = new Set<string>(), warnings: string[] = []
  async function visit(folder: string, depth: number) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith('.') || bundles.size >= 2000) continue
      const file = path.join(folder, entry.name)
      if (entry.name.endsWith('.app')) bundles.add(file)
      else if (depth < 2) await visit(file, depth + 1)
    }
  }
  for (const folder of ['/Applications', path.join(os.homedir(), 'Applications'), '/System/Applications']) await visit(folder, 0)
  for (const process of await runningMacApplications()) { const bundle = macApplicationBundle(process.path); if (bundle) bundles.add(bundle) }
  const applications: Application[] = []
  for (const bundle of bundles) {
    try { applications.push(await readMacApplication(bundle, true)) } catch { /* 无权限或损坏的包不阻断其余应用。 */ }
  }
  if (applications.length < bundles.size) warnings.push('部分应用包不可读取，已跳过；可稍后重新扫描。')
  return { applications: [...new Map(applications.map(app => [app.path, app])).values()], scannedAt: new Date().toISOString(), warnings }
}

export async function resolveMacProcessFamily(app: Application, previousPaths: string[] = []): Promise<Application> {
  const bundle = macApplicationBundle(app.path ?? '')
  if (!bundle || !validProcessPath(app.path)) throw new Error('请选择 macOS 应用包内的主程序。')
  const identity = await readMacApplication(bundle)
  if (identity.path !== app.path) throw new Error('主程序身份已改变，请重新扫描应用。')
  const verified: string[] = []
  const running = await runningMacApplications()
  for (const value of [...previousPaths, ...running.map(p => p.path)]) {
    if (!validProcessPath(value) || !value.startsWith(bundle + '/') || protectedProcessPath(value)) continue
    if (await fs.realpath(value).then(p => p === value, () => false) && await fs.stat(value).then(s => s.isFile() && Boolean(s.mode & 0o111), () => false)) verified.push(value)
  }
  // 包边界比相邻安装目录更明确；运行中的包内 helper 可在父进程退出后继续归属本应用。
  return identifyProcessFamily(app, running, verified)
}
