import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { locales } from './lib/release-docs.mjs'

const site = path.resolve('docs/site')
const generated = path.join(site, '.generated')
// 固定派生目录，只清理本工具的站点输入，不遍历工作区或用户目录。
assert.equal(path.dirname(generated), site)
assert.equal(path.basename(generated), '.generated')
await fs.rm(generated, { recursive: true, force: true })
const publicDir = path.join(generated, 'public')
await fs.mkdir(path.join(publicDir, 'images'), { recursive: true })
await fs.mkdir(path.join(publicDir, 'brand'), { recursive: true })
await fs.copyFile('public/brand/app-route-lockup.png', path.join(publicDir, 'brand/app-route-lockup.png'))
for (const locale of locales) {
  const source = path.join('docs/guide', locale)
  const target = locale === 'zh-CN' ? generated : path.join(generated, locale)
  await fs.mkdir(target, { recursive: true })
  for (const file of await fs.readdir(source)) {
    assert.match(file, /^[a-z-]+\.md$/)
    const text = await fs.readFile(path.join(source, file), 'utf8')
    await fs.writeFile(path.join(target, file), text.replaceAll('../../images/', '/images/'))
  }
  for (const name of ['applications', 'connection', 'strategy', 'rules', 'icons', 'help', 'about']) {
    const file = `${locale}-${name}.png`
    await fs.copyFile(path.join('docs/images', file), path.join(publicDir, 'images', file))
  }
}
console.log('已从四语教程和公开素材白名单生成站点输入。')
