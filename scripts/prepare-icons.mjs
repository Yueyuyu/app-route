import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const logos = require('@iconify-json/logos/icons.json')
const simple = require('@iconify-json/simple-icons/icons.json')
const entries = {
  chrome: [logos, 'chrome'], edge: [logos, 'microsoft-edge'],
  vscode: [logos, 'visual-studio-code'], telegram: [logos, 'telegram'],
  steam: [simple, 'steam', '#183c66'], codex: [simple, 'openai', '#151b25'],
  wechat: [simple, 'wechat', '#07c160'],
}
// 公开仓库仅使用有来源记录的图标集；本机扫描提取的图标留在用户草稿中。
for (const [name, [set, key, color]] of Object.entries(entries)) {
  const icon = set.icons[key]
  if (!icon) throw new Error(`缺少图标：${name}`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width || set.width || 24} ${icon.height || set.height || 24}">${icon.body.replaceAll('currentColor', color || '#151b25')}</svg>`
  fs.writeFileSync(new URL(`../public/icons/${name}.svg`, import.meta.url), svg)
  console.log(`${name}: ready`)
}
