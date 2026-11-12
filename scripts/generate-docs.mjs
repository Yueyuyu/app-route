import fs from 'node:fs/promises'
import { locales, validateManifest, replaceDownloadBlock, checksumList } from './lib/release-docs.mjs'

const manifest = validateManifest(JSON.parse(await fs.readFile('docs/releases/current.json', 'utf8')))
const check = process.argv.includes('--check')
let changed = 0
for (const locale of locales) {
  const files = [locale === 'zh-CN' ? 'README.md' : `README.${locale}.md`, `docs/guide/${locale}/install.md`]
  if (locale === 'zh-CN') files.push(`docs/releases/${manifest.version}.md`)
  for (const file of files) {
    const before = await fs.readFile(file, 'utf8'), after = replaceDownloadBlock(before, manifest, locale)
    if (before === after) continue
    if (check) throw new Error(`下载表过期：${file}；请运行 npm run docs:generate`)
    await fs.writeFile(file, after); changed++
  }
}
const checksumPath = 'docs/releases/SHA256SUMS.txt', checksums = checksumList(manifest)
if (await fs.readFile(checksumPath, 'utf8').catch(() => '') !== checksums) {
  if (check) throw new Error('SHA256SUMS.txt 与发布清单不一致')
  await fs.writeFile(checksumPath, checksums); changed++
}
console.log(check ? '发布下载表与校验清单一致。' : `已更新 ${changed} 个生成区域/文件。`)
