import type { Locale } from '../shared/i18n/language'
import { createTranslator } from '../shared/i18n/translator'
export async function loadTranslator(locale: Locale) {
  if (locale === 'zh-CN') return createTranslator()
  const module = await ({ en: () => import('virtual:approute-locale/en'), ja: () => import('virtual:approute-locale/ja'), fr: () => import('virtual:approute-locale/fr') })[locale]()
  return createTranslator(module.default)
}
