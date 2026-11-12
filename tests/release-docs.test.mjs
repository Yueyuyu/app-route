import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { validateManifest, replaceDownloadBlock, downloadTable, checksumList, locales } from '../scripts/lib/release-docs.mjs'
const manifest = JSON.parse(await fs.readFile(new URL('../docs/releases/current.json', import.meta.url), 'utf8'))

test('发布清单拒绝缺失、重复、错架构、路径注入与错误哈希', () => {
  for (const mutate of [
    m => m.files.pop(),
    m => { m.files[1] = { ...m.files[0] } },
    m => { m.files[1].name = m.files[1].name.replace('arm64', 'arm') },
    m => { m.files[0].name = '../' + m.files[0].name },
    m => { m.files[0].sha256 = 'not-a-hash' },
    m => { m.sourceRevision = 'main' },
    m => { m.files[0].size = 0 },
  ]) {
    const altered = structuredClone(manifest); mutate(altered)
    assert.throws(() => validateManifest(altered))
  }
})
test('四语下载表只链接当前资产且重生成不改变正文', () => {
  for (const locale of locales) {
    const source = `before\n<!-- downloads:${locale}:start -->old<!-- downloads:${locale}:end -->\nafter`
    const result = replaceDownloadBlock(source, manifest, locale)
    assert.ok(result.startsWith('before\n')); assert.ok(result.endsWith('\nafter'))
    assert.equal(replaceDownloadBlock(result, manifest, locale), result)
    const table = downloadTable(manifest, locale)
    for (const file of manifest.files) assert.ok(table.includes('/' + file.name + ')'))
    assert.ok(!table.includes('/latest'))
    assert.throws(() => replaceDownloadBlock(source + source, manifest, locale))
    assert.throws(() => replaceDownloadBlock('no markers', manifest, locale))
  }
})
test('汇总校验文件可逐行匹配发布资产', () => {
  const lines = checksumList(manifest).trimEnd().split('\n')
  assert.equal(lines.length, 5)
  for (const line of lines) {
    const [hash, filename] = line.split('  ')
    assert.equal(manifest.files.find(file => file.name === filename)?.sha256, hash)
  }
})
