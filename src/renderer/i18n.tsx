import { useSyncExternalStore } from 'react'
import { resolveLocale, isLanguagePreference, type LanguagePreference, type LanguageSettings } from '../shared/i18n/language'
import { createTranslator, proxyOutletText, type Translator } from '../shared/i18n/translator'
import { loadTranslator } from './localeCatalogs'
import type { ProxyOutlet } from '../shared/integration'

const storageKey = 'approute.language.v1'
let settings: LanguageSettings = { language: 'system', systemLanguages: [...navigator.languages] }
let currentLocale = resolveLocale(settings.language, settings.systemLanguages)
const listeners = new Set<() => void>()
let translator: Translator = createTranslator()
let languageQueue = Promise.resolve()
function serial(operation: () => Promise<void>) {
  const result = languageQueue.then(operation)
  languageQueue = result.catch(() => {})
  return result
}
export const t = (source: string, params?: readonly (string | number | null | undefined)[]) => translator(source, params)
export const outletLabel = (outlet?: ProxyOutlet) => proxyOutletText(t, outlet)
export const formatTime = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleTimeString(currentLocale, options)
export const formatDateTime = (value: string) => new Date(value).toLocaleString(currentLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
export function initializeLanguage() {
  return serial(async () => {
    let next = { ...settings, systemLanguages: [...navigator.languages] }
    try {
      if (window.appRoute) next = await window.appRoute.request<LanguageSettings>('language.read')
      else { const saved = localStorage.getItem(storageKey); if (isLanguagePreference(saved)) next.language = saved }
      updateLanguage(next, await loadTranslator(resolveLocale(next.language, next.systemLanguages)))
    } catch {
      // 启动资源损坏仍显示中文恢复入口；不覆盖磁盘偏好。后续切换可重试加载。
      if (!listeners.size) updateLanguage({ language: 'system', systemLanguages: [] }, createTranslator())
    }
  })
}
function updateLanguage(next: LanguageSettings, translated: Translator) {
  settings = next; translator = translated
  currentLocale = resolveLocale(settings.language, settings.systemLanguages)
  document.documentElement.lang = currentLocale
  document.title = t('AppRoute 应用分流')
  listeners.forEach(listener => listener())
}
export function setLanguage(language: LanguagePreference) {
  return serial(async () => {
    if (!isLanguagePreference(language)) throw new Error('不支持的显示语言。')
    let next = { ...settings, language }
    const locale = resolveLocale(language, settings.systemLanguages)
    let translated = await loadTranslator(locale)
    if (window.appRoute) next = await window.appRoute.request<LanguageSettings>('language.write', { language })
    else localStorage.setItem(storageKey, language)
    if (resolveLocale(next.language, next.systemLanguages) !== locale) translated = await loadTranslator(resolveLocale(next.language, next.systemLanguages))
    updateLanguage(next, translated)
  })
}
export function useLanguage() {
  useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => settings.language + ':' + currentLocale)
  return { language: settings.language, locale: currentLocale, setLanguage }
}
window.addEventListener('languagechange', () => { void initializeLanguage() })
