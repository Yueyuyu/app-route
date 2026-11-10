import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const catalog = JSON.parse(fs.readFileSync(new URL('../resources/application-icons/catalog.json', import.meta.url), 'utf8'))
const output = new URL('../public/icons/apps/', import.meta.url)
fs.mkdirSync(output, { recursive: true })
const ids = new Set()
for (const entry of catalog.applications) {
  if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id) || !catalog.collections[entry.collection]) throw new Error(`无效目录条目：${entry.id}`)
  ids.add(entry.id)
  const set = require(`@iconify-json/${entry.collection}/icons.json`)
  const icon = set.icons[entry.icon]
  if (!icon) throw new Error(`缺少图标：${entry.collection}/${entry.icon}`)
  const license = catalog.collections[entry.collection]
  const svg = `<!-- ${entry.id}; ${license.author}; ${license.license}; ${license.sourceUrl}; currentColor 已固定为显示色。 -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width || set.width || 24} ${icon.height || set.height || 24}">${icon.body.replaceAll('currentColor', entry.color || '#202938')}</svg>\n`
  if (/<script|<foreignObject|\bon\w+=|(?:href|src)=["'](?!#)/i.test(svg)) throw new Error(`图标含非静态内容：${entry.id}`)
  fs.writeFileSync(new URL(`${entry.id}.svg`, output), svg)
}
console.log(`已生成 ${ids.size} 个公共应用图标，目录与许可来自 resources/application-icons/catalog.json。`)
