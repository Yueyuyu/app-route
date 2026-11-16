import type { ReleasedPackage, UpdateChannel, UpdateCheck } from '../shared/updates.ts'

export const releaseRepository = 'https://github.com/Yueyuyu/app-route'
export const releaseApi = 'https://api.github.com/repos/Yueyuyu/app-route/releases?per_page=100'
/** 项目只发布稳定版与 preview.N；不把未知标签、源码提交或草稿当作可安装更新。 */
export function parseReleaseVersion(value: unknown): number[] | undefined {
  if (typeof value !== 'string' || value.length > 80) return
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-preview\.(0|[1-9]\d*))?$/.exec(value)
  if (!match) return
  const parts = match.slice(1, 4).map(Number)
  if (match[4] !== undefined) parts.push(Number(match[4]))
  if (parts.some(part => !Number.isSafeInteger(part))) return
  return parts
}
export function compareReleaseVersions(left: string, right: string): number {
  const a = parseReleaseVersion(left), b = parseReleaseVersion(right)
  if (!a || !b) throw new Error('版本号无法识别。')
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i])
  if (a.length !== b.length) return a.length === 3 ? 1 : -1
  return Math.sign((a[3] ?? 0) - (b[3] ?? 0))
}
export function isUpdateChannel(value: unknown): value is UpdateChannel { return value === 'stable' || value === 'preview' }
export function installerSuffix(platform: string, arch: string): string | undefined {
  if (platform === 'win32' && arch === 'x64') return 'setup-x64.exe'
  if (platform === 'darwin' && ['arm64', 'x64'].includes(arch)) return `mac-${arch}.dmg`
}
interface PublishedRelease { version: string; date: string; notes: string; assets: Record<string, unknown>[] }
export function inspectReleases(value: unknown, currentVersion: string, channel: UpdateChannel, platform: string, arch: string): Omit<UpdateCheck, 'checkedAt'> {
  if (!parseReleaseVersion(currentVersion) || !isUpdateChannel(channel) || !Array.isArray(value)) throw new Error('更新信息无法识别。')
  const base = { currentVersion, channel }
  const suffix = installerSuffix(platform, arch)
  if (!suffix) return { ...base, state: 'unsupported' }
  const releases: PublishedRelease[] = value.flatMap(item => {
    if (!item || typeof item !== 'object' || item.draft !== false || typeof item.tag_name !== 'string' || !item.tag_name.startsWith('v')) return []
    const version = item.tag_name.slice(1), parsed = parseReleaseVersion(version)
    if (!parsed || item.prerelease !== (parsed.length === 4) || (channel === 'stable' && item.prerelease) || typeof item.published_at !== 'string' || !Number.isFinite(Date.parse(item.published_at))) return []
    return [{ version, date: item.published_at, notes: typeof item.body === 'string' ? item.body.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, 6000) : '', assets: Array.isArray(item.assets) ? item.assets.filter((asset: unknown) => asset && typeof asset === 'object') : [] }]
  }).sort((a, b) => compareReleaseVersions(b.version, a.version))
  const newest = releases[0]
  if (!newest) return value.length >= 100 ? { ...base, state: 'unavailable', reason: 'network' } : { ...base, state: 'no-release' }
  const assetName = `AppRoute-${newest.version}-${suffix}`
  const downloadUrl = `${releaseRepository}/releases/download/v${newest.version}/${assetName}`
  const assets = newest.assets.filter(asset => asset.name === assetName)
  const asset = assets[0]
  // 只有固定仓库、匹配平台架构、完整上传且附摘要的安装资产才进入下载流程。
  if (assets.length !== 1 || asset.state !== 'uploaded' || asset.browser_download_url !== downloadUrl || !Number.isSafeInteger(asset.size) || Number(asset.size) <= 0 || typeof asset.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(asset.digest)) return { ...base, state: 'unavailable', reason: 'missing-package' }
  const release: ReleasedPackage = { version: newest.version, publishedAt: newest.date, notes: newest.notes, releaseUrl: `${releaseRepository}/releases/tag/v${newest.version}`, assetName, downloadUrl, sha256: asset.digest.slice(7), size: Number(asset.size) }
  return { ...base, release, state: compareReleaseVersions(newest.version, currentVersion) > 0 ? 'available' : 'current' }
}
