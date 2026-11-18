import { SingleFlight } from '../../core/statusRefresh.ts'
import { inspectReleases, isUpdateChannel, releaseApi } from '../../core/releaseUpdates.ts'
import type { UpdateChannel, UpdateCheck } from '../../shared/updates.ts'

const metadataLimit = 2 * 1024 * 1024
async function readMetadata(response: Response) {
  if (Number(response.headers.get('content-length')) > metadataLimit) throw new Error('metadata too large')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('missing metadata')
  const chunks: Uint8Array[] = []; let length = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > metadataLimit) throw new Error('metadata too large')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}
/** 查询公开发布信息并合并前后台检查；不读取账户令牌，不修改网络或运行安装器。 */
export class ReleaseUpdateService {
  private cache = new Map<UpdateChannel, { expires: number; result: UpdateCheck }>()
  private flights = new Map<UpdateChannel, SingleFlight<UpdateCheck>>()
  private version: string; private platform: string; private arch: string; private fetch: typeof globalThis.fetch; private now: () => number
  constructor(version: string, platform: string, arch: string, fetch: typeof globalThis.fetch, now = Date.now) {
    this.version = version; this.platform = platform; this.arch = arch; this.fetch = fetch; this.now = now
  }
  async check(channel: unknown): Promise<UpdateCheck> {
    if (!isUpdateChannel(channel)) throw new Error('不支持的更新通道。')
    const cached = this.cache.get(channel)
    if (cached && cached.expires > this.now()) return cached.result
    let flight = this.flights.get(channel)
    if (!flight) { flight = new SingleFlight(); this.flights.set(channel, flight) }
    return flight.run(async () => {
      const checkedAt = new Date(this.now()).toISOString()
      let result: UpdateCheck
      try {
        const response = await this.fetch(releaseApi, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
        if (!response.ok) {
          result = { channel, checkedAt, currentVersion: this.version, state: 'unavailable', reason: response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') ? 'rate-limit' : 'network' }
          await response.body?.cancel()
        } else result = { ...inspectReleases(await readMetadata(response), this.version, channel, this.platform, this.arch), checkedAt }
      } catch { result = { channel, checkedAt, currentVersion: this.version, state: 'unavailable', reason: 'network' } }
      this.cache.set(channel, { result, expires: this.now() + (result.reason === 'rate-limit' ? 15 * 60000 : result.state === 'unavailable' ? 10000 : 60000) })
      return result
    })
  }
  selected(channel: unknown, version: unknown) {
    if (!isUpdateChannel(channel)) throw new Error('不支持的更新通道。')
    const entry = this.cache.get(channel)
    const release = entry?.result.release
    if (!entry || !release || this.now() - Date.parse(entry.result.checkedAt) > 15 * 60000 || entry.result.state !== 'available' || release.version !== version) throw new Error('更新检查已过期，请重新检查。')
    return release
  }
}
