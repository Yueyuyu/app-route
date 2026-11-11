import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { nodeExecutableName, recoveryEntryName } from '../platform/paths.ts'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { atomicWrite, digest, fileStamp, readOptional } from '../storage/localState.ts'

type ShortcutInstaller = (folder: string) => Promise<string | undefined>
const installedKits = new Map<string, { source: string; files: string[]; stamp: string; shortcutInstaller: ShortcutInstaller }>()

export async function installRecoveryKit(root: string, source: string, shortcutInstaller: ShortcutInstaller = createDesktopShortcut): Promise<string> {
  const folder = path.join(root, 'recovery')
  const installed = installedKits.get(root)
  if (installed?.source === source && installed.shortcutInstaller === shortcutInstaller && await fileStamp(installed.files) === installed.stamp) return folder
  installedKits.delete(root)
  await fs.mkdir(folder, { recursive: true })
  const target = path.join(folder, 'recovery.cjs')
  await atomicWrite(target, await fs.readFile(source))
  const node = path.join(folder, nodeExecutableName())
  const executable = await fs.readFile(process.execPath)
  const current = await fs.readFile(node).catch(() => null)
  if (!current || digest(current) !== digest(executable)) await atomicWrite(node, executable)
  if (process.platform === 'darwin') await fs.chmod(node, 0o700)
  await promisify(execFile)(node, ['--version'], { windowsHide: true, timeout: 5000 })
  const command = process.platform === 'darwin'
    ? '#!/bin/sh\ncd -- "$(dirname -- "$0")" || exit 1\n./node ./recovery.cjs recover\nresult=$?\nprintf "\\nPress Enter to close. "\nread -r answer\nexit "$result"\n'
    : '@echo off\r\n"%~dp0node.exe" "%~dp0recovery.cjs" recover\r\npause\r\n'
  const entry = path.join(folder, recoveryEntryName())
  await atomicWrite(entry, command)
  if (process.platform === 'darwin') await fs.chmod(entry, 0o700)
  await atomicWrite(path.join(folder, 'README.txt'), `AppRoute 离线恢复\n双击 ${recoveryEntryName()}：停用 AppRoute 自己的分流规则，重新加载当前 Clash Party 配置。\n不需要网络、ChatGPT、项目目录或 npm。\n请保留此目录。恢复不会关闭系统代理或重置网卡。\n`)
  const shortcut = await shortcutInstaller(folder)
  const files = [source, process.execPath, target, node, entry, path.join(folder, 'README.txt'), ...(shortcut ? [shortcut] : [])]
  const stamp = await fileStamp(files)
  if (!stamp) throw new Error('独立恢复文件未能完整核对，取消应用。')
  installedKits.set(root, { source, files, stamp, shortcutInstaller })
  return folder
}

async function createDesktopShortcut(folder: string): Promise<string | undefined> {
  if (process.platform === 'darwin') {
    const file = path.join(os.homedir(), 'Desktop', 'AppRoute - Restore Network.command')
    const target = path.join(folder, recoveryEntryName())
    // 用固定包装脚本而非符号链接，保证双击后工作目录仍是恢复工具目录。
    const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'"
    const content = `#!/bin/sh\n# AppRoute owned recovery launcher v1\nexec /bin/sh ${quote(target)}\n`
    const old = await readOptional(file)
    if (old !== null && old !== content) throw new Error('桌面恢复入口名称已被占用，取消应用。')
    await atomicWrite(file, content); await fs.chmod(file, 0o700)
    return file
  }
  if (process.platform === 'win32') {
    // 仅传固定命令，路径通过环境变量传递，避免 shell 转义和命令注入。
    const command = "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop'; $folder=$env:APPROUTE_RECOVERY_DIR; $target=Join-Path $folder 'Restore-Network.cmd'; $file=Join-Path ([Environment]::GetFolderPath('Desktop')) 'AppRoute - Restore Network.lnk'; $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($file); if ((Test-Path -LiteralPath $file) -and $link.TargetPath -ne $target) { throw 'Shortcut name occupied' }; $link.TargetPath=$target; $link.WorkingDirectory=$folder; $link.Description='AppRoute offline network recovery'; $link.Save(); $file | ConvertTo-Json -Compress"
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 8000, encoding: 'utf8', env: { ...process.env, APPROUTE_RECOVERY_DIR: folder } })
    return JSON.parse(stdout.trim())
  }
}

export async function startGuardian(root: string, id: string): Promise<void> {
  const folder = path.join(root, 'recovery')
  const child = spawn(path.join(folder, nodeExecutableName()), [path.join(folder, 'recovery.cjs'), 'watch', id], { detached: true, windowsHide: true, stdio: 'ignore' })
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
