import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { atomicWrite, digest, readOptional } from '../storage/localState.ts'

export async function installRecoveryKit(root: string, source: string): Promise<string> {
  const folder = path.join(root, 'recovery')
  await fs.mkdir(folder, { recursive: true })
  const target = path.join(folder, 'recovery.cjs')
  await atomicWrite(target, await fs.readFile(source))
  const node = path.join(folder, 'node.exe')
  const executable = await fs.readFile(process.execPath)
  const current = await fs.readFile(node).catch(() => null)
  if (!current || digest(current) !== digest(executable)) await atomicWrite(node, executable)
  await promisify(execFile)(node, ['--version'], { windowsHide: true, timeout: 5000 })
  const command = '@echo off\r\n"%~dp0node.exe" "%~dp0recovery.cjs" recover\r\npause\r\n'
  await atomicWrite(path.join(folder, 'Restore-Network.cmd'), command)
  await atomicWrite(path.join(folder, 'README.txt'), 'AppRoute 离线恢复\r\n双击 Restore-Network.cmd：停用 AppRoute 自己的分流规则，重新加载当前 Clash Party 配置。\r\n不需要网络、ChatGPT、项目目录或 npm。\r\n命令行自检：node.exe recovery.cjs doctor\r\n请保留此目录。恢复不会关闭系统代理或重置网卡。\r\n')
  if (process.platform === 'win32') {
    // 仅传固定命令，路径通过环境变量传递，避免 shell 转义和命令注入。
    const command = "$ErrorActionPreference='Stop'; $folder=$env:APPROUTE_RECOVERY_DIR; $target=Join-Path $folder 'Restore-Network.cmd'; $file=Join-Path ([Environment]::GetFolderPath('Desktop')) 'AppRoute - Restore Network.lnk'; $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($file); if ((Test-Path -LiteralPath $file) -and $link.TargetPath -ne $target) { throw 'Shortcut name occupied' }; $link.TargetPath=$target; $link.WorkingDirectory=$folder; $link.Description='AppRoute offline network recovery'; $link.Save()"
    await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 8000, env: { ...process.env, APPROUTE_RECOVERY_DIR: folder } })
  }
  return folder
}

export async function startGuardian(root: string, id: string): Promise<void> {
  const folder = path.join(root, 'recovery')
  const child = spawn(path.join(folder, 'node.exe'), [path.join(folder, 'recovery.cjs'), 'watch', id], { detached: true, windowsHide: true, stdio: 'ignore' })
  let launchError = false
  child.on('error', () => { launchError = true })
  child.unref()
  for (let i = 0; i < 40; i++) {
    if (launchError) break
    if (await readOptional(path.join(root, 'transactions', `${id}.ready`))) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('独立恢复守护进程未就绪，已取消应用。')
}
