import { useSyncExternalStore } from 'react'
import { resolveLocale, translate, translateProxyOutlet, isLanguagePreference, type LanguagePreference, type LanguageSettings } from '../shared/i18n/index'
import type { ProxyOutlet } from '../shared/integration'

const storageKey = 'approute.language.v1'
let settings: LanguageSettings = { language: 'system', systemLanguages: [...navigator.languages] }
let currentLocale = resolveLocale(settings.language, settings.systemLanguages)
const listeners = new Set<() => void>()
export const t = (source: string, params?: readonly (string | number | null | undefined)[]) => translate(currentLocale, source, params)
export const outletLabel = (outlet?: ProxyOutlet) => translateProxyOutlet(currentLocale, outlet)
export const formatTime = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleTimeString(currentLocale, options)
export const formatDateTime = (value: string) => new Date(value).toLocaleString(currentLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
export async function initializeLanguage() {
  try {
    if (window.appRoute) settings = await window.appRoute.request<LanguageSettings>('language.read')
    else { const saved = localStorage.getItem(storageKey); if (isLanguagePreference(saved)) settings.language = saved }
  } catch { /* 读取失败时仍可打开应用和恢复入口；切换语言时明确报告保存错误。 */ }
  updateLanguage()
}
function updateLanguage() {
  currentLocale = resolveLocale(settings.language, settings.systemLanguages)
  document.documentElement.lang = currentLocale
  document.title = t('AppRoute 应用分流')
  listeners.forEach(listener => listener())
}
export async function setLanguage(language: LanguagePreference) {
  if (!isLanguagePreference(language)) throw new Error('不支持的显示语言。')
  if (window.appRoute) settings = await window.appRoute.request<LanguageSettings>('language.write', { language })
  else { localStorage.setItem(storageKey, language); settings = { ...settings, language } }
  updateLanguage()
}
export function useLanguage() {
  useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => settings.language + ':' + currentLocale)
  return { language: settings.language, locale: currentLocale, setLanguage }
}
window.addEventListener('languagechange', () => {
  if (window.appRoute) void initializeLanguage()
  else { settings = { ...settings, systemLanguages: [...navigator.languages] }; updateLanguage() }
})
