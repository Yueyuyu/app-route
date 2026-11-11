import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import type { Application, ApplicationScanResult } from '../../../shared/application.ts'
import { validProcessName } from '../../../core/applicationRules.ts'

const runFile = promisify(execFile)
let pending: Promise<ApplicationScanResult> | undefined

/** 仅执行项目内固定脚本，不接收来自界面的命令或路径。并发请求共用一次扫描。 */
export function scanApplications(scriptPath?: string): Promise<ApplicationScanResult> {
  if (process.platform !== 'win32') return Promise.reject(new Error('扫描应用需要在 Windows 本机运行。'))
  const script = scriptPath ?? fileURLToPath(new URL('./scan-applications.ps1', import.meta.url))
  pending ??= runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
    { windowsHide: true, timeout: 60000, maxBuffer: 24 * 1024 * 1024, encoding: 'utf8' })
    .then(({ stdout }) => {
      const result = JSON.parse(stdout.replace(/^\uFEFF/, '').trim())
      const payload: unknown = result.applications
      if (!Array.isArray(payload)) throw new Error('扫描结果格式错误')
      const applications: Application[] = payload.map((item) => {
        if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' ||
            !Array.isArray(item.processes) || item.processes.length === 0 ||
            !item.processes.every((name: unknown) => typeof name === 'string' && validProcessName(name))) {
          throw new Error('扫描结果包含无效应用')
        }
        return { id: item.id, name: item.name, processes: item.processes,
          path: typeof item.path === 'string' ? item.path : undefined,
          publisher: typeof item.publisher === 'string' ? item.publisher : undefined,
          discovery: item.discovery === 'running' ? 'running' : 'installed',
          icon: typeof item.icon === 'string' ? item.icon : undefined,
          iconMethod: ['executable', 'shortcut', 'registry', 'package'].includes(item.iconMethod) ? item.iconMethod : undefined,
          source: 'scan', mode: 'rule', category: '' }
      })
      return { applications, scannedAt: new Date().toISOString(), warnings: Array.isArray(result.warnings) ? result.warnings.filter((value: unknown) => typeof value === 'string') : [] }
    }).finally(() => { pending = undefined })
  return pending
}
