import { messages } from './messages.ts'
import type { ProxyOutlet } from '../integration.ts'

export const locales = ['zh-CN', 'en', 'ja', 'fr'] as const
export type Locale = typeof locales[number]
export type LanguagePreference = Locale | 'system'
export interface LanguageSettings { language: LanguagePreference; systemLanguages: string[] }
export const languageNames: Record<LanguagePreference, string> = { system: '跟随系统', 'zh-CN': '简体中文', en: 'English', ja: '日本語', fr: 'Français' }

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || locales.includes(value as Locale)
}

/** 只改变显示语言；不翻译应用身份、代理组名、节点名或写入规则的数据。 */
export function resolveLocale(preference: LanguagePreference, systemLanguages: readonly string[] = []): Locale {
  if (preference !== 'system') return preference
  for (const language of systemLanguages) {
    const code = language.toLowerCase().split(/[-_]/)[0]
    if (code === 'zh') return 'zh-CN'
    if (code === 'en' || code === 'ja' || code === 'fr') return code
  }
  return 'zh-CN'
}

type Parameter = string | number | null | undefined
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// 后端仍返回原始诊断。仅完整匹配已登记的句型，避免翻译用户数据或掩盖未知错误。
const patterns = Object.keys(messages).filter(key => /\{\d+\}/.test(key)).map(key => {
  const slots: number[] = []
  const pieces = key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? (slots.push(Number(part.slice(1, -1))), '([\\s\\S]*?)') : escapePattern(part))
  return { key, slots, pattern: new RegExp('^' + pieces.join('') + '$') }
})
const interpolate = (text: string, params: readonly Parameter[]) => text.replace(/\{(\d+)\}/g, (token, index) => Number(index) < params.length ? String(params[Number(index)] ?? '') : token)
export function translate(locale: Locale, source: string, params?: readonly Parameter[]): string {
  const index = locale === 'en' ? 0 : locale === 'ja' ? 1 : 2
  const direct = Object.hasOwn(messages, source) ? messages[source] : undefined
  if (locale === 'zh-CN') return params ? interpolate(source, params) : source
  if (direct) return interpolate(direct[index], params ?? [])
  if (!params) for (const entry of patterns) {
    const match = entry.pattern.exec(source)
    if (match) { const values: string[] = []; entry.slots.forEach((slot, i) => { values[slot] = match[i + 1] }); return interpolate(messages[entry.key][index], values) }
  }
  return params ? interpolate(source, params) : source
}

/** 名称只能作为插值数据，不能把同名节点当作待翻译的界面文案。 */
export function translateProxyOutlet(locale: Locale, outlet?: ProxyOutlet): string {
  const text = (source: string, params?: readonly Parameter[]) => translate(locale, source, params)
  if (!outlet) return text('未连接，当前节点未知')
  if (outlet.kind === 'missing') return text('代理组或成员已消失，请重新绑定')
  if (outlet.kind === 'distributed') return text('按连接分配，实际节点见连接记录')
  if (outlet.kind === 'unknown') return text('无法确认当前节点')
  if (outlet.kind === 'direct') return text('{0} · 当前直连', [outlet.node])
  if (outlet.kind === 'reject') return text('{0} · 当前拒绝连接', [outlet.node])
  return (outlet.node ?? '') + (outlet.health === 'unhealthy' ? text(' · 最近探测失败') : '')
}
