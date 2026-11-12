import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import assert from 'node:assert/strict'

// 统计入口的全部静态依赖，不能只缩小 index 文件而把体积藏进 vendor。
const root = process.cwd(), manifest = JSON.parse(await fs.readFile(path.join(root, 'dist/.vite/manifest.json'), 'utf8'))
const initial = new Set()
function visit(key) {
  if (initial.has(key)) return
  assert.ok(manifest[key], `Missing manifest entry: ${key}`)
  initial.add(key)
  for (const imported of manifest[key].imports ?? []) visit(imported)
}
visit('index.html')
const files = [...new Set([...initial].map(key => manifest[key].file))]
let bytes = 0, gzip = 0
for (const file of files) { const content = await fs.readFile(path.join(root, 'dist', file)); bytes += content.length; gzip += zlib.gzipSync(content).length }
for (const component of ['SettingsPage', 'IconManagement', 'SecondaryPages', 'ApplicationEditor', 'ApplicationDetails', 'ConnectionInspector']) {
  const key = `src/renderer/components/${component}.tsx`
  assert.ok(manifest[key]?.isDynamicEntry && !files.includes(manifest[key].file), `${component} must stay outside initial loading`)
}
assert.ok(bytes <= 1_300_000, `Initial JavaScript ${bytes} exceeds the 1,300,000-byte budget`)
const result = { initialJavaScriptBytes: bytes, gzipBytes: gzip, budgetBytes: 1_300_000, files }
await fs.mkdir(path.join(root, 'output/startup'), { recursive: true })
await fs.writeFile(path.join(root, 'output/startup/bundle.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
