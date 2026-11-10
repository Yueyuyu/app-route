import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { RunningApplicationProcess } from '../../../shared/desktop.ts'

let pending: Promise<RunningApplicationProcess[]> | undefined
/** 固定只读查询；不采集窗口标题、使用时长或访问内容。 */
export function runningApplications(): Promise<RunningApplicationProcess[]> {
  if (process.platform !== 'win32') return Promise.resolve([])
  const command = "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath} | ForEach-Object { @{path=$_.ExecutablePath;pid=[int]$_.ProcessId;parentPid=[int]$_.ParentProcessId} }) | ConvertTo-Json -Compress"
  pending ??= promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' })
    .then(({ stdout }) => {
      const value = JSON.parse(stdout || '[]')
      return (Array.isArray(value) ? value : [value]).filter(item => typeof item?.path === 'string' && /^[a-z]:\\.+\.exe$/i.test(item.path) && Number.isInteger(item.pid) && Number.isInteger(item.parentPid))
    }).finally(() => { pending = undefined })
  return pending
}
