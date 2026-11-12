import assert from 'node:assert/strict'

export const repository = 'Yueyuyu/app-route'
export const locales = ['zh-CN', 'en', 'ja', 'fr']
export const artifacts = [
  { platform: 'windows', arch: 'x64', format: 'exe', suffix: 'setup-x64.exe', recommended: true },
  { platform: 'macos', arch: 'arm64', format: 'dmg', suffix: 'mac-arm64.dmg', recommended: true },
  { platform: 'macos', arch: 'x64', format: 'dmg', suffix: 'mac-x64.dmg', recommended: true },
  { platform: 'macos', arch: 'arm64', format: 'zip', suffix: 'mac-arm64.zip', recommended: false },
  { platform: 'macos', arch: 'x64', format: 'zip', suffix: 'mac-x64.zip', recommended: false },
]
export const artifactName = (version, artifact) => `AppRoute-${version}-${artifact.suffix}`
export function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.repository, repository)
  assert.match(manifest.version, /^\d+\.\d+\.\d+-preview\.\d+$/)
  assert.equal(manifest.channel, 'preview')
  assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/)
  assert.equal(manifest.files.length, artifacts.length)
  for (const artifact of artifacts) {
    const matches = manifest.files.filter(file => file.name === artifactName(manifest.version, artifact))
    assert.equal(matches.length, 1, `Missing or duplicate artifact: ${artifact.suffix}`)
    assert.match(matches[0].sha256, /^[a-f0-9]{64}$/)
    assert.ok(Number.isSafeInteger(matches[0].size) && matches[0].size > 0)
  }
  return manifest
}
export const releaseUrl = version => `https://github.com/${repository}/releases/tag/v${version}`
export const assetUrl = (version, name) => `https://github.com/${repository}/releases/download/v${version}/${name}`
const labels = {
  'zh-CN': ['当前预览版', '你的电脑', '下载', '大小', '校验', 'Windows · Intel / AMD 64 位', 'Mac · Apple 芯片（实验性）', 'Mac · Intel 芯片（实验性）', '安装版', '其他附件', 'Mac ZIP 为压缩分发包；Source code 为源码，不是安装器。', 'SHA-256 检查文件完整性，不代替发布者签名。'],
  en: ['Current preview', 'Your computer', 'Download', 'Size', 'Checksum', 'Windows · Intel / AMD 64-bit', 'Mac · Apple silicon (experimental)', 'Mac · Intel (experimental)', 'Installer', 'Other files', 'Mac ZIP files are app archives; Source code is not an installer.', 'SHA-256 checks file integrity; it does not replace publisher signing.'],
  ja: ['現在のプレビュー版', 'お使いのコンピューター', 'ダウンロード', 'サイズ', '検証', 'Windows · Intel / AMD 64 ビット', 'Mac · Apple シリコン（実験版）', 'Mac · Intel（実験版）', 'インストーラー', 'その他のファイル', 'Mac ZIP はアプリの圧縮ファイルです。Source code はソースコードで、インストーラーではありません。', 'SHA-256 はファイルの整合性を確認します。発行者署名の代わりにはなりません。'],
  fr: ['Préversion actuelle', 'Votre ordinateur', 'Téléchargement', 'Taille', 'Vérification', 'Windows · Intel / AMD 64 bits', 'Mac · puce Apple (expérimental)', 'Mac · Intel (expérimental)', 'Programme d’installation', 'Autres fichiers', 'Les ZIP Mac sont des archives de l’application ; Source code n’est pas un programme d’installation.', 'SHA-256 vérifie l’intégrité du fichier et ne remplace pas la signature de l’éditeur.'],
}
export function downloadTable(manifest, locale) {
  validateManifest(manifest)
  const l = labels[locale]; assert.ok(l)
  const lines = [`**${l[0]}: [${manifest.version}](${releaseUrl(manifest.version)})**`, '', `| ${l[1]} | ${l[2]} | ${l[3]} | ${l[4]} |`, '| --- | --- | --- | --- |']
  artifacts.filter(a => a.recommended).forEach((a, i) => {
    const file = manifest.files.find(f => f.name === artifactName(manifest.version, a))
    lines.push(`| ${l[5 + i]} | [${a.format === 'exe' ? l[8] + ' EXE' : 'DMG'}](${assetUrl(manifest.version, file.name)}) | ${(file.size / 1048576).toFixed(1)} MiB | [SHA-256](${assetUrl(manifest.version, file.name + '.sha256')}) |`)
  })
  const zips = artifacts.filter(a => !a.recommended).map(a => `[${a.arch} ZIP](${assetUrl(manifest.version, artifactName(manifest.version, a))})`)
  lines.push('', `${l[9]}: ${zips.join(' · ')}. ${l[10]}`, '', l[11])
  return lines.join('\n')
}
export function checksumList(manifest) {
  validateManifest(manifest)
  return manifest.files.map(file => `${file.sha256}  ${file.name}`).join('\n') + '\n'
}
export function replaceDownloadBlock(text, manifest, locale) {
  const start = `<!-- downloads:${locale}:start -->`, end = `<!-- downloads:${locale}:end -->`
  assert.equal(text.split(start).length, 2, `Expected one ${start}`)
  assert.equal(text.split(end).length, 2, `Expected one ${end}`)
  assert.ok(text.indexOf(start) < text.indexOf(end))
  return text.slice(0, text.indexOf(start) + start.length) + '\n' + downloadTable(manifest, locale) + '\n' + text.slice(text.indexOf(end))
}
