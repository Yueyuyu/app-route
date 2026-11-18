import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { installerSuffix, parseReleaseVersion, releaseRepository } from '../../core/releaseUpdates.ts'
import type { ReleasedPackage, UpdateChannel, UpdateDownload, UpdateInstallation } from '../../shared/updates.ts'

const maxInstallerBytes = 512 * 1024 * 1024
const redirectHosts = new Set(['release-assets.githubusercontent.com', 'objects.githubusercontent.com'])
const activePhases = new Set(['preparing', 'downloading', 'verifying', 'installing'])
type Options = {
  root: string; platform: string; arch: string; installation: UpdateInstallation
  fetch: typeof globalThis.fetch
  prepare: (version: string, installing: boolean) => Promise<unknown>
  changed?: (state: UpdateDownload) => void
}
/** 下载与启动只能使用主进程认可的 Release；渲染进程从不提供路径或执行参数。 */
export class UpdateInstaller {
  private options: Options
  private state: UpdateDownload
  private controller?: AbortController
  private job?: Promise<void>
  private file?: string
  private selected?: ReleasedPackage
  constructor(options: Options) {
    this.options = options
    this.state = { phase: 'idle', received: 0, total: 0, installation: options.installation }
  }
  snapshot(): UpdateDownload { return { ...this.state } }
  private publish(change: Partial<UpdateDownload>) {
    this.state = { ...this.state, ...change }
    this.options.changed?.(this.snapshot())
  }
  private validate(release: ReleasedPackage) {
    const suffix = installerSuffix(this.options.platform, this.options.arch)
    const name = `AppRoute-${release.version}-${suffix}`
    if (!suffix || !parseReleaseVersion(release.version) || release.assetName !== name ||
      release.downloadUrl !== `${releaseRepository}/releases/download/v${release.version}/${name}` ||
      !/^[a-f0-9]{64}$/.test(release.sha256) || !Number.isSafeInteger(release.size) || release.size <= 0 || release.size > maxInstallerBytes) throw new Error('安装包信息无效，请重新检查更新。')
  }
  start(release: ReleasedPackage, channel: UpdateChannel = 'stable'): UpdateDownload {
    this.validate(release)
    if (activePhases.has(this.state.phase)) {
      if (this.state.version === release.version) return this.snapshot()
      throw new Error('另一个更新任务仍在进行，请稍后重试。')
    }
    this.selected = { ...release }; this.file = undefined; this.controller = new AbortController()
    this.publish({ phase: 'preparing', channel, version: release.version, received: 0, total: release.size, message: undefined })
    this.job = this.download(this.selected, this.controller.signal)
    return this.snapshot()
  }
  async settled() { await this.job; return this.snapshot() }
  cancel() {
    if (['preparing', 'downloading', 'verifying'].includes(this.state.phase)) this.controller?.abort()
    return this.snapshot()
  }
  private async response(release: ReleasedPackage, signal: AbortSignal) {
    let url = release.downloadUrl
    for (let redirects = 0; redirects <= 4; redirects++) {
      const response = await this.options.fetch(url, { credentials: 'omit', redirect: 'manual', cache: 'no-store', signal, headers: { Accept: 'application/octet-stream' } })
      if (![301, 302, 303, 307, 308].includes(response.status)) return response
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new Error('下载地址无效，请重新检查更新。')
      const next = new URL(location, url)
      if (next.protocol !== 'https:' || next.username || next.password || next.port || !redirectHosts.has(next.hostname)) throw new Error('下载地址无效，请重新检查更新。')
      url = next.href
    }
    throw new Error('下载重定向过多，请稍后重试。')
  }
  private async download(release: ReleasedPackage, cancellation: AbortSignal) {
    const signal = AbortSignal.any([cancellation, AbortSignal.timeout(10 * 60000)])
    let partial: string | undefined
    try {
      await this.options.prepare(release.version, false)
      signal.throwIfAborted()
      const cache = path.join(this.options.root, 'updates')
      await fs.mkdir(cache, { recursive: true, mode: 0o700 })
      const cacheStat = await fs.lstat(cache)
      if (!cacheStat.isDirectory() || cacheStat.isSymbolicLink()) throw new Error('更新目录不可用，请检查磁盘权限。')
      const folder = await fs.mkdtemp(path.join(cache, 'download-'))
      partial = path.join(folder, release.assetName + '.partial')
      this.publish({ phase: 'downloading' })
      const response = await this.response(release, signal)
      if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('下载安装包失败，请检查网络后重试。') }
      const declared = response.headers.get('content-length')
      if (declared !== null && Number(declared) !== release.size) { await response.body.cancel(); throw new Error('安装包校验失败，请重新下载。') }
      const handle = await fs.open(partial, 'wx', 0o600), hash = createHash('sha256'), reader = response.body.getReader()
      let received = 0, lastNotice = 0
      try {
        for (;;) {
          signal.throwIfAborted()
          const { done, value } = await reader.read()
          if (done) break
          received += value.byteLength
          if (received > release.size) throw new Error('安装包校验失败，请重新下载。')
          await handle.writeFile(value)
          hash.update(value)
          if (Date.now() - lastNotice > 150 || received === release.size) {
            this.publish({ received }); lastNotice = Date.now()
          }
        }
        await handle.sync()
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); await handle.close() }
      signal.throwIfAborted()
      this.publish({ phase: 'verifying', received })
      if (received !== release.size || hash.digest('hex') !== release.sha256) throw new Error('安装包校验失败，请重新下载。')
      const completed = path.join(folder, release.assetName)
      await fs.rename(partial, completed); partial = undefined
      this.file = completed
      this.publish({ phase: 'ready' })
    } catch (error) {
      if (partial) await fs.unlink(partial).catch(() => {})
      this.file = undefined
      const message = cancellation.aborted ? undefined : error instanceof Error && /^[\u4e00-\u9fff]/.test(error.message) ? error.message : '下载安装包失败，请检查网络或磁盘空间后重试。'
      this.publish({ phase: cancellation.aborted ? 'cancelled' : 'error', message })
    } finally { this.controller = undefined }
  }
  private async verifiedFile() {
    if (!this.file || !this.selected) throw new Error('请先完成安装包下载。')
    const root = path.resolve(this.options.root, 'updates'), folder = path.dirname(this.file)
    if (path.dirname(folder) !== root || path.basename(this.file) !== this.selected.assetName) throw new Error('安装包路径无效，请重新下载。')
    const [rootStat, folderStat, stat] = await Promise.all([fs.lstat(root), fs.lstat(folder), fs.lstat(this.file)])
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !folderStat.isDirectory() || folderStat.isSymbolicLink() || !stat.isFile() || stat.isSymbolicLink() || stat.size !== this.selected.size) throw new Error('安装包校验失败，请重新下载。')
    const hash = createHash('sha256')
    const handle = await fs.open(this.file, 'r')
    try { for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk) }
    finally { await handle.close() }
    if (hash.digest('hex') !== this.selected.sha256) throw new Error('安装包校验失败，请重新下载。')
    return this.file
  }
  async install(release: ReleasedPackage, launch: (file: string, installation: UpdateInstallation) => Promise<void>) {
    if (this.state.phase !== 'ready' || !this.selected) throw new Error('请先完成安装包下载。')
    this.validate(release)
    if (release.version !== this.selected.version || release.sha256 !== this.selected.sha256 || release.size !== this.selected.size) throw new Error('发布内容已变化，请重新检查并下载。')
    this.publish({ phase: 'installing', message: undefined })
    try {
      await this.verifiedFile()
      // 下载后用户可能继续改设置；安装前重新备份，不使用过期基线。
      await this.options.prepare(this.selected.version, true)
      const file = await this.verifiedFile()
      await launch(file, this.options.installation)
      if (this.options.installation !== 'automatic') this.publish({ phase: 'ready' })
    } catch (error) {
      const message = error instanceof Error && /^[\u4e00-\u9fff]/.test(error.message) ? error.message : '安装器未能启动，请重试或打开下载目录。'
      this.publish({ phase: 'ready', message })
      throw new Error(message)
    }
  }
  async showFile(show: (file: string) => void) { show(await this.verifiedFile()) }
}
