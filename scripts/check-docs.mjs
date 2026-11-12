import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { locales } from './lib/release-docs.mjs'

const root = process.cwd()
const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0'))]
const files = paths.filter(file => /\.md$/.test(file) && (/^README/.test(file) || /^docs\//.test(file) || ['AGENTS.md', 'CONTRIBUTING.md'].includes(file)))
const stripCode = text => text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '').replace(/^~~~[^\n]*\n[\s\S]*?^~~~\s*$/gm, '')
const cache = new Map()
async function read(file) {
  if (!cache.has(file)) cache.set(file, stripCode(await fs.readFile(file, 'utf8')))
  return cache.get(file)
}
function anchors(text) {
  const result = new Set(), counts = new Map()
  for (const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1].replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').trim().toLowerCase().replace(/ /g, '-')
    const count = counts.get(slug) ?? 0
    result.add(count ? slug + '-' + count : slug)
    counts.set(slug, count + 1)
  }
  for (const match of text.matchAll(/\bid=["']([^"']+)["']/g)) result.add(match[1])
  return result
}
const errors = []
let links = 0
for (const file of files) {
  const absolute = path.resolve(file), text = await read(absolute)
  const targets = [
    ...Array.from(text.matchAll(/!?\[[^\]]*\]\((<[^>]+>|(?:[^()\s]|\([^)]*\))+)(?:\s+["'][^)]*)?\)/g), match => match[1].replace(/^<|>$/g, '')),
    ...Array.from(text.matchAll(/<(?:a|img)\b[^>]*\b(?:href|src)=["']([^"']+)["']/g), match => match[1]),
  ]
  for (const url of targets) {
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url)) continue
    links++
    const [target, hash] = url.split('#')
    const destination = path.resolve(path.dirname(absolute), decodeURIComponent(target.split('?')[0]) || path.basename(absolute))
    const relative = path.relative(root, destination)
    if (relative.startsWith('..') || path.isAbsolute(relative)) { errors.push(`${file}: 链接超出仓库 ${url}`); continue }
    try {
      const stat = await fs.stat(destination)
      if (hash && stat.isFile() && destination.endsWith('.md') && !anchors(await read(destination)).has(decodeURIComponent(hash))) {
        errors.push(`${file}: 锚点不存在 ${url}`)
      }
    } catch { errors.push(`${file}: 文件不存在 ${url}`) }
  }
}
const expected = ['direct.md', 'faq.md', 'follow-group.md', 'index.md', 'install.md', 'maintenance.md', 'quickstart.md', 'strategies.md']
for (const locale of locales) {
  assert.deepEqual((await fs.readdir(`docs/guide/${locale}`)).sort(), expected, `${locale} 教程缺页`)
  const entry = await fs.readFile(locale === 'zh-CN' ? 'README.md' : `README.${locale}.md`, 'utf8')
  assert.ok(!entry.includes('codex/clash-party-recovery'), '首页不得指向旧开发分支')
  assert.ok(!entry.includes('releases/latest'), '预览下载使用精确 tag')
  assert.ok(entry.includes('badge.svg?branch=main'))
}
if (errors.length) throw new Error(errors.join('\n'))
console.log(`已检查 ${files.length} 份 Markdown、${links} 个本地链接/锚点及四语八类教程。`)
