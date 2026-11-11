import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Application } from '../../../shared/application.ts'
import { identifyProcessFamily, validProcessPath, type RunningProcess } from '../../../core/processFamily.ts'
import { protectedProcesses } from '../../../core/managedRouting.ts'

/** 只预识别名称明确属于该程序的独立安装目录，不递归 Desktop/Tools 等共享目录。 */
export function isDedicatedApplicationDirectory(executable: string): boolean {
  const stem = path.win32.basename(executable).replace(/\.exe$/i, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
  const folder = path.win32.basename(path.win32.dirname(executable)).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
  return stem.length >= 3 && folder.startsWith(stem) && !['windows', 'system32', 'tools', 'bin', 'desktop', 'downloads'].includes(folder)
}
async function bundledExecutables(executable: string): Promise<string[]> {
  if (!isDedicatedApplicationDirectory(executable)) return []
  const result: string[] = []
  let visited = 0
  async function visit(directory: string, depth: number) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
      if (++visited > 2000 || result.length >= 35) return
      const file = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory() && depth < 3) await visit(file, depth + 1)
      if (entry.isFile() && validProcessPath(file) && !protectedProcesses.has(entry.name.toLowerCase()) && !/unins|setup|install|crash|repair|update/i.test(entry.name)) result.push(file)
      if (result.length >= 35) return
    }
  }
  await visit(path.dirname(executable), 0)
  return result
}

let pending: Promise<RunningProcess[]> | undefined
function runningProcesses(): Promise<RunningProcess[]> {
  const command = "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath} | ForEach-Object { @{pid=[int]$_.ProcessId;parentPid=[int]$_.ParentProcessId;path=$_.ExecutablePath} }) | ConvertTo-Json -Compress"
  pending ??= promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
    { windowsHide: true, timeout: 15000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' })
    .then(({ stdout }) => {
      const data = JSON.parse(stdout.replace(/^\uFEFF/, '').trim())
      return (Array.isArray(data) ? data : [data]).filter(p => Number.isInteger(p?.pid) && Number.isInteger(p?.parentPid) && validProcessPath(p?.path))
    }).catch(() => { throw new Error('无法读取辅助进程，请稍后重试；规则未修改。') }).finally(() => { pending = undefined })
  return pending
}

export async function resolveProcessFamily(app: Application, previousPaths: string[] = []): Promise<Application> {
  if (process.platform !== 'win32') throw new Error('自动识别进程目前仅支持 Windows。')
  if (!app.path || !/^[a-z]:\\/i.test(app.path) || !validProcessPath(app.path) || !await fs.stat(app.path).then(s => s.isFile(), () => false)) throw new Error('主程序不存在或路径不可读取，请重新扫描。')
  const [running, bundled] = await Promise.all([runningProcesses(), bundledExecutables(app.path)])
  const result = identifyProcessFamily(app, running, [...previousPaths, ...bundled])
  if (bundled.length) result.processWarnings = ['已按独立安装目录预识别组件，并结合运行中的父子关系核对；只写入各 exe 的精确路径。', ...(result.processWarnings ?? [])]
  return result
}
