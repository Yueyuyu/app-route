import os from 'node:os'
import path from 'node:path'

export function appRouteDataDirectory(platform = process.platform, environment = process.env, home = os.homedir()): string {
  // 仅由进程环境配置隔离验收目录；renderer 不提供文件根目录。
  if (environment.APPROUTE_DATA_DIR) return path.resolve(environment.APPROUTE_DATA_DIR)
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'AppRoute')
  return path.join(environment.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'AppRoute')
}
export function clashPartyDataDirectory(platform = process.platform, environment = process.env, home = os.homedir()): string {
  return platform === 'darwin' ? path.join(home, 'Library', 'Application Support', 'mihomo-party')
    : path.join(environment.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'mihomo-party')
}
export const nodeExecutableName = (platform = process.platform) => platform === 'win32' ? 'node.exe' : 'node'
export const recoveryEntryName = (platform = process.platform) => platform === 'win32' ? 'Restore-Network.cmd' : 'Restore-Network.command'
