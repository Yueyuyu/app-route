export const locales = ['zh-CN', 'en', 'ja', 'fr'] as const
export type Locale = typeof locales[number]
export type LanguagePreference = Locale | 'system'
export interface LanguageSettings { language: LanguagePreference; systemLanguages: string[] }
export const languageNames: Record<LanguagePreference, string> = { system: '跟随系统', 'zh-CN': '简体中文', en: 'English', ja: '日本語', fr: 'Français' }
export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || locales.includes(value as Locale)
}
/** 语言解析不依赖译文目录，避免首屏引入全部语言。 */
export function resolveLocale(preference: LanguagePreference, systemLanguages: readonly string[] = []): Locale {
  if (preference !== 'system') return preference
  for (const language of systemLanguages) {
    const code = language.toLowerCase().split(/[-_]/)[0]
    if (code === 'zh') return 'zh-CN'
    if (code === 'en' || code === 'ja' || code === 'fr') return code
  }
  return 'zh-CN'
}
