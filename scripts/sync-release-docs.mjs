import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { repository, artifacts, artifactName, validateManifest } from './lib/release-docs.mjs'

// 只读取指定的已发布预览版；不上传附件、不覆盖安装包或自动发布。
const tag = process.argv[2]
assert.match(tag ?? '', /^v\d+\.\d+\.\d+-preview\.\d+$/)
const gh = args => execFileSync('gh', args, { encoding: 'utf8', windowsHide: true }).trim()
const release = JSON.parse(gh(['api', `repos/${repository}/releases/tags/${tag}`]))
assert.equal(release.draft, false); assert.equal(release.prerelease, true)
const ref = JSON.parse(gh(['api', `repos/${repository}/git/ref/tags/${tag}`]))
// 当前流水线创建轻量标签；不猜测带签名/注解标签的提交。
assert.equal(ref.object.type, 'commit')
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-release-hashes-'))
try {
  gh(['release', 'download', tag, '--repo', repository, '--pattern', '*.sha256', '--dir', folder])
  const files = []
  for (const artifact of artifacts) {
    const name = artifactName(tag.slice(1), artifact)
    const remote = release.assets.find(file => file.name === name)
    assert.ok(remote, `Missing release asset ${name}`)
    const sidecar = (await fs.readFile(path.join(folder, name + '.sha256'), 'utf8')).trim()
    const sha256 = sidecar.split(/\s+/)[0]
    assert.equal(sidecar, `${sha256}  ${name}`)
    assert.equal(remote.digest, `sha256:${sha256}`, `GitHub digest differs from sidecar: ${name}`)
    files.push({ name, size: remote.size, sha256 })
  }
  const manifest = validateManifest({ schemaVersion: 1, repository, version: tag.slice(1), channel: 'preview', sourceRevision: ref.object.sha, publishedAt: release.published_at, files })
  await fs.writeFile('docs/releases/current.json', JSON.stringify(manifest, null, 2) + '\n')
  console.log(`已核对 ${files.length} 个发布资产与 SHA-256；运行 npm run docs:generate 更新下载表。`)
} finally {
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(folder))
  assert.match(relative, /^approute-release-hashes-[^\\/]+$/)
  await fs.rm(folder, { recursive: true, force: true })
}
