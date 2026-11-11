/** Windows 身份忽略大小写；macOS 保留大小写，兼容区分大小写的卷。 */
export function processPathKey(value: string): string {
  return /^[a-z]:[\\/]/i.test(value) ? value.replaceAll('/', '\\').toLowerCase() : value
}
export const processBasename = (value: string) => value.split(/[\\/]/).at(-1) ?? ''
export function macApplicationBundle(value: string): string | undefined {
  const match = /^(\/[^\r\n\0]*?\.app)\/Contents\//.exec(value)
  return match?.[1]
}
