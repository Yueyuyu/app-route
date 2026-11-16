import { messages } from './messages.ts'
import { createTranslator, proxyOutletText, type Parameter, type Translator } from './translator.ts'
import type { Locale } from './language.ts'
import type { ProxyOutlet } from '../integration.ts'
export * from './language.ts'

// 原生菜单与 Node 服务仍使用统一入口；渲染层只加载所选语言的本地资源。
const translators = new Map<Locale, Translator>()
export function translate(locale: Locale, source: string, params?: readonly Parameter[]): string {
  if (!translators.has(locale)) translators.set(locale, createTranslator(locale === 'zh-CN' ? {} : Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[locale === 'en' ? 0 : locale === 'ja' ? 1 : 2]]))))
  return translators.get(locale)!(source, params)
}
export function translateProxyOutlet(locale: Locale, outlet?: ProxyOutlet): string {
  return proxyOutletText((source, params) => translate(locale, source, params), outlet)
}
