import type { Plugin } from 'vite'
import { messages } from '../../src/shared/i18n/messages.ts'
import type { Locale } from '../../src/shared/i18n/language.ts'
export function localeCatalog(locale: Exclude<Locale, 'zh-CN'>) {
  const index = { en: 0, ja: 1, fr: 2 }[locale]
  return Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[index]]))
}
/** 构建时从单一文案目录生成三个离线资源；不请求远端翻译，也不维护重复目录。 */
export function localeCatalogs(): Plugin {
  return {
    name: 'app-route-locale-catalogs',
    resolveId(id) { if (/^virtual:approute-locale\/(en|ja|fr)$/.test(id)) return '\0' + id },
    load(id) {
      const match = /^\0virtual:approute-locale\/(en|ja|fr)$/.exec(id)
      if (match) return 'export default ' + JSON.stringify(localeCatalog(match[1] as Exclude<Locale, 'zh-CN'>))
    },
  }
}
