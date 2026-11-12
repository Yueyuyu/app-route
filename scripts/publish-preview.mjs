import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { artifacts as definitions, artifactName, validateManifest, checksumList, replaceDownloadBlock } from './lib/release-docs.mjs'

if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('发布仅由 GitHub 工作流执行。')
const repo = process.env.GITHUB_REPOSITORY, runId = process.env.APPROUTE_RELEASE_RUN
assert.equal(repo, 'Yueyuyu/app-route'); assert.match(runId ?? '', /^\d+$/)
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const run = JSON.parse(gh(['api', `repos/${repo}/actions/runs/${runId}`]))
assert.equal(run.conclusion, 'success'); assert.equal(run.path, '.github/workflows/preview.yml')
assert.equal(run.head_branch, 'main')
assert.equal(run.repository.full_name, repo); assert.equal(run.head_repository.full_name, repo)
assert.match(run.head_sha, /^[a-f0-9]{40}$/)
const output = path.resolve('.runtime/release-artifacts')
gh(['run', 'download', runId, '--repo', repo, '--pattern', 'AppRoute-*', '--dir', output])
const manifest = JSON.parse(await fs.readFile('package.json', 'utf8'))
const tag = `v${manifest.version}`
assert.match(tag, /^v\d+\.\d+\.\d+-preview\.\d+$/)
const notesFile = `docs/releases/${manifest.version}.md`
await fs.access(notesFile)
const assets = []
const publishedFiles = []
for (const [name, platform, arch] of [['windows-x64', 'win32', 'x64'], ['mac-arm64', 'darwin', 'arm64'], ['mac-x64', 'darwin', 'x64']]) {
  const folder = path.join(output, `AppRoute-${name}`)
  const report = JSON.parse(await fs.readFile(path.join(folder, 'output/packaged-check.json'), 'utf8'))
  assert.equal(report.platform, platform); assert.equal(report.architecture, arch)
  assert.equal(report.build.version, manifest.version); assert.equal(report.build.revision, run.head_sha.slice(0, 12)); assert.equal(report.build.dirty, false)
  for (const key of ['cleanStart', 'backendReachable', 'aboutAndEscape']) assert.equal(report[key], true)
  const selections = JSON.parse(await fs.readFile(path.join(folder, 'output/runtime-selection-check.json'), 'utf8'))
  assert.equal(selections.platform, platform); assert.equal(selections.arch, arch)
  assert.equal(selections.originalConfigurationUnchanged, true)
  for (const scenario of ['protected-reload-keeps-automatic-and-manual-selection', 'intentional-fixed-selection-preserved']) assert.equal(selections.results.find(item => item.scenario === scenario)?.passed, true)
  if (platform === 'win32') {
    const install = JSON.parse((await fs.readFile(path.join(folder, 'output/clean-install-check.json'), 'utf8')).replace(/^\uFEFF/, ''))
    for (const key of ['freshInstall', 'upgrade', 'uninstall', 'userDataPreserved']) assert.equal(install[key], true)
  }
  const directory = path.join(folder, 'release/installer')
  const files = (await fs.readdir(directory)).filter(file => /\.(exe|dmg|zip)$/.test(file))
  const expected = definitions.filter(item => item.platform === (platform === 'win32' ? 'windows' : 'macos') && item.arch === arch).map(item => artifactName(manifest.version, item))
  assert.deepEqual(files.sort(), expected.sort(), '产物名称必须与发布平台/架构一致')
  for (const file of files) {
    const artifact = path.join(directory, file), hashFile = artifact + '.sha256'
    const hash = createHash('sha256').update(await fs.readFile(artifact)).digest('hex')
    assert.equal((await fs.readFile(hashFile, 'utf8')).trim(), `${hash}  ${file}`)
    publishedFiles.push({ name: file, size: (await fs.stat(artifact)).size, sha256: hash })
    assets.push(artifact, hashFile)
  }
}
const publicManifest = validateManifest({ schemaVersion: 1, repository: repo, version: manifest.version, channel: 'preview', sourceRevision: run.head_sha, files: publishedFiles })
const manifestFile = path.join(output, 'release-manifest.json')
const checksumFile = path.join(output, 'SHA256SUMS.txt')
await fs.writeFile(manifestFile, JSON.stringify(publicManifest, null, 2) + '\n')
await fs.writeFile(checksumFile, checksumList(publicManifest))
assets.push(manifestFile, checksumFile)
// 发布时使用本次验证过的产物生成表格，不能沿用上一版 current.json。
const generatedNotes = path.join(output, 'release-notes.md')
await fs.writeFile(generatedNotes, replaceDownloadBlock(await fs.readFile(notesFile, 'utf8'), publicManifest, 'zh-CN'))
// 先上传到草稿；全部上传成功后才可公开。已有同名版本不覆盖。
try { gh(['release', 'view', tag, '--repo', repo]); throw new Error('同名版本已存在，请先核对，禁止覆盖。') }
catch (error) { if (!error.status || error.status !== 1 || !String(error.stderr).includes('release not found')) throw error }
gh(['release', 'create', tag, '--repo', repo, '--target', run.head_sha, '--draft', '--prerelease', '--title', `AppRoute ${manifest.version}`, '--notes-file', generatedNotes])
gh(['release', 'upload', tag, '--repo', repo, ...assets])
const release = JSON.parse(gh(['release', 'view', tag, '--repo', repo, '--json', 'assets,isDraft,url']))
assert.equal(release.assets.length, assets.length)
for (const file of assets) assert.equal(release.assets.find(asset => asset.name === path.basename(file))?.size, (await fs.stat(file)).size)
if (process.env.APPROUTE_RELEASE_PUBLIC === 'true') gh(['release', 'edit', tag, '--repo', repo, '--draft=false', '--prerelease', '--latest=false'])
console.log(JSON.stringify({ url: release.url, source: run.head_sha, verifiedAssets: assets.length, published: process.env.APPROUTE_RELEASE_PUBLIC === 'true' }))
