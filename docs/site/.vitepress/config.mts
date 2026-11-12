import { defineConfig } from 'vitepress'

const pages = ['index', 'install', 'quickstart', 'direct', 'follow-group', 'strategies', 'maintenance', 'faq']
const translations = {
  root: { lang: 'zh-CN', label: '简体中文', title: '使用指南', download: '下载', faq: '常见问题', release: '版本记录', search: '搜索文档', noResults: '没有找到结果', reset: '清除搜索', select: '选择', navigate: '切换', close: '关闭', outline: '本页内容', previous: '上一页', next: '下一页', menu: '目录', returnTop: '回到顶部', language: '切换语言', titles: ['使用指南', '下载与安装', '首次使用', '直接联网', '跟随代理组', '代理策略', '升级与恢复', '常见问题'] },
  en: { lang: 'en', label: 'English', title: 'Guide', download: 'Download', faq: 'FAQ', release: 'Releases', search: 'Search docs', noResults: 'No results found', reset: 'Clear search', select: 'select', navigate: 'navigate', close: 'close', outline: 'On this page', previous: 'Previous', next: 'Next', menu: 'Menu', returnTop: 'Back to top', language: 'Change language', titles: ['Guide', 'Download and install', 'First steps', 'Direct connections', 'Follow a group', 'Proxy strategies', 'Upgrade and recovery', 'FAQ'] },
  ja: { lang: 'ja', label: '日本語', title: 'ガイド', download: 'ダウンロード', faq: 'よくある質問', release: 'リリース', search: 'ドキュメントを検索', noResults: '結果が見つかりません', reset: '検索をクリア', select: '選択', navigate: '移動', close: '閉じる', outline: 'このページ', previous: '前のページ', next: '次のページ', menu: 'メニュー', returnTop: '先頭に戻る', language: '言語を変更', titles: ['ガイド', 'ダウンロードとインストール', '使い始める', '直接接続', 'グループに追従', 'プロキシ戦略', '更新と復旧', 'よくある質問'] },
  fr: { lang: 'fr', label: 'Français', title: 'Guide', download: 'Télécharger', faq: 'FAQ', release: 'Versions', search: 'Rechercher', noResults: 'Aucun résultat', reset: 'Effacer', select: 'sélectionner', navigate: 'parcourir', close: 'fermer', outline: 'Sur cette page', previous: 'Précédent', next: 'Suivant', menu: 'Menu', returnTop: 'Retour en haut', language: 'Changer de langue', titles: ['Guide', 'Téléchargement et installation', 'Premiers pas', 'Connexion directe', 'Suivre un groupe', 'Stratégies proxy', 'Mise à jour et restauration', 'FAQ'] },
}
const localeConfig = Object.fromEntries(Object.entries(translations).map(([key, t]) => {
  const prefix = key === 'root' ? '/' : `/${key}/`
  return [key, {
    lang: t.lang, label: t.label, title: 'AppRoute',
    description: t.title,
    themeConfig: {
      nav: [{ text: t.download, link: prefix + 'install' }, { text: t.title, link: prefix }, { text: t.release, link: 'https://github.com/Yueyuyu/app-route/releases' }],
      sidebar: [{ text: t.title, items: pages.map((page, index) => ({ text: t.titles[index], link: prefix + (page === 'index' ? '' : page) })) }],
      outline: { label: t.outline }, docFooter: { prev: t.previous, next: t.next },
      sidebarMenuLabel: t.menu, returnToTopLabel: t.returnTop, langMenuLabel: t.language,
    },
  }]
}))
const searchLocales = Object.fromEntries(Object.entries(translations).map(([key, t]) => [key, {
  translations: {
    button: { buttonText: t.search, buttonAriaLabel: t.search },
    modal: { noResultsText: t.noResults, resetButtonTitle: t.reset, displayDetails: { root: '显示详细结果', en: 'Show detailed results', ja: '詳細結果を表示', fr: 'Afficher les détails' }[key],
      footer: { selectText: t.select, navigateText: t.navigate, closeText: t.close } },
  },
}]))
export default defineConfig({
  title: 'AppRoute',
  base: '/app-route/',
  srcDir: '.generated',
  appearance: false,
  locales: localeConfig,
  sitemap: { hostname: 'https://yueyuyu.github.io/app-route/' },
  themeConfig: {
    logo: { src: '/brand/app-route-lockup.png', alt: 'AppRoute' },
    siteTitle: false,
    socialLinks: [{ icon: 'github', link: 'https://github.com/Yueyuyu/app-route' }],
    search: {
      provider: 'local',
      options: {
        locales: searchLocales,
        miniSearch: {
          options: {
            // 同一分词函数用于构建索引和浏览器查询；空白分词无法覆盖中文查询。
            tokenize: (text: string) => Array.from(
              new Intl.Segmenter('zh', { granularity: 'word' }).segment(text.toLowerCase()),
              part => part.isWordLike ? part.segment : '',
            ).filter(Boolean),
          },
          searchOptions: { prefix: true, fuzzy: 0.15 },
        },
      },
    },
    footer: { message: 'MIT · AppRoute', copyright: '© 2026 AppRoute contributors' },
  },
  vite: { server: { host: '127.0.0.1' }, preview: { host: '127.0.0.1' } },
})
