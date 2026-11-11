import path from 'node:path'
import { desktopActions, type DesktopAction } from '../../shared/desktop.ts'

export const desktopOrigin = 'approute://app'
export function isTrustedDesktopSender(url: string, mainFrame: boolean): boolean {
  try { const parsed = new URL(url); return mainFrame && parsed.protocol === 'approute:' && parsed.host === 'app' && !parsed.username && !parsed.password && parsed.pathname === '/index.html' } catch { return false }
}
export function validateDesktopRequest(action: unknown, body?: unknown): asserts action is DesktopAction {
  if (typeof action !== 'string' || !desktopActions.includes(action as DesktopAction)) throw new Error('不支持的桌面操作。')
  if (JSON.stringify(body ?? {}).length > 4 * 1024 * 1024) throw new Error('请求过大，请分批操作。')
}
export function desktopAssetPath(root: string, url: string): string {
  const parsed = new URL(url), relative = decodeURIComponent(parsed.pathname)
  if (parsed.protocol !== 'approute:' || parsed.host !== 'app' || relative.includes('\\') || relative.includes('\0') || relative.split('/').includes('..')) throw new Error('无效资源地址。')
  const resolved = path.resolve(root, `.${relative === '/' ? '/index.html' : relative}`)
  const difference = path.relative(root, resolved)
  if (difference.startsWith('..') || path.isAbsolute(difference)) throw new Error('无效资源地址。')
  return resolved
}
