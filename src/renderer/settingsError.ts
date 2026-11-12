/** Electron invoke 会附加技术前缀，先取出服务文案才能命中四语翻译。 */
export function settingsError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
  return /^(?:EACCES|EPERM|ENOENT|EIO|ENOSPC)\b/.test(message) ? fallback : message
}
