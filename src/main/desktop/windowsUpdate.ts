import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import type { UpdateInstallation } from '../../shared/updates.ts'

export async function updateInstallation(platform: string, packaged: boolean, executable: string): Promise<UpdateInstallation> {
  if (platform !== 'win32' || !packaged || path.basename(executable).toLowerCase() !== 'approute.exe') return 'manual'
  const uninstaller = await fs.lstat(path.join(path.dirname(executable), 'Uninstall AppRoute.exe')).catch(() => undefined)
  // 目录开发包没有 NSIS 安装身份，不把它当作可以原位升级的安装版。
  return uninstaller?.isFile() && !uninstaller.isSymbolicLink() ? 'automatic' : 'manual'
}
type StartProcess = (file: string, args: string[], options: SpawnOptions) => ChildProcess
export function launchWindowsUpdate(file: string, start: StartProcess = spawn): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = start(file, ['/S', '--updated', '--force-run'], {
      detached: true, stdio: 'ignore', windowsHide: true, shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, NODE_OPTIONS: undefined },
    })
    child.once('error', () => reject(new Error('安装器未能启动，请重试或打开下载目录。')))
    child.once('spawn', () => { child.unref(); resolve() })
  })
}
