export interface BuildInfo { version: string; builtAt: string; revision: string; dirty: boolean }
export const projectLinks = { homepage: 'https://github.com/Yueyuyu/app-route', feedback: 'https://github.com/Yueyuyu/app-route/issues/new/choose' } as const
export function projectLink(target: unknown): string {
  if (target !== 'homepage' && target !== 'feedback') throw new Error('不支持的项目链接。')
  return projectLinks[target]
}
/** 复制内容只含构建身份，不读取用户名、应用清单、路径或代理信息。 */
export function versionSummary(info: BuildInfo): string {
  return `AppRoute ${info.version}\nBuild: ${info.builtAt}\nRevision: ${info.revision}${info.dirty ? ' (local changes)' : ''}`
}
