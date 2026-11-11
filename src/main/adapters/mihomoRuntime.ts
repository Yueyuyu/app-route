import http from 'node:http'
import fs from 'node:fs/promises'
import type { ProxyInfo } from '../../core/managedRouting.ts'

export interface RuntimeConfig { mode: string; 'mixed-port': number; 'find-process-mode'?: string; tun?: { enable: boolean }; [key: string]: unknown }
export interface RuntimeRule { type: string; payload: string; proxy: string; extra?: { disabled?: boolean } }
export interface RuntimeConnection { metadata: { process?: string; processPath?: string; host?: string; destinationIP?: string }; chains: string[]; start: string; rule: string; rulePayload: string }

export async function discoverPipe(): Promise<string> {
  if (process.platform === 'darwin') return discoverMacSocket()
  if (process.platform !== 'win32') throw new Error('目前真实接入仅支持 Windows。')
  const pipes = (await fs.readdir('\\\\.\\pipe\\')).filter(name => /^MihomoParty\\mihomo-(admin|user)-/.test(name))
  if (pipes.length !== 1) throw new Error(pipes.length ? '发现多个 Clash Party 实例，请只保留需要接入的实例。' : '未找到 Clash Party 内核，请先启动 Clash Party。')
  return '\\\\.\\pipe\\' + pipes[0]
}

/** 只接入当前用户拥有且能响应的 Party socket；不删除失效 socket，也不提升权限。 */
export async function discoverMacSocket(directory = '/tmp', uid = process.getuid?.()): Promise<string> {
  if (uid === undefined) throw new Error('无法确认当前用户。')
  const candidates = (await fs.readdir(directory)).filter(name => new RegExp(`^mihomo-party-${uid}(?:-\\d+)?\\.sock$`).test(name) || name === 'mihomo-party.sock')
  const live: string[] = []
  await Promise.all(candidates.map(async name => {
    const file = `${directory}/${name}`, stat = await fs.lstat(file).catch(() => undefined)
    if (!stat?.isSocket() || stat.uid !== uid) return
    try { const version = await new MihomoRuntime(file).version(); if (typeof version.version === 'string') live.push(file) } catch { /* 退出遗留的 socket 不能作为活动实例。 */ }
  }))
  if (live.length !== 1) throw new Error(live.length ? '发现多个 Clash Party 实例，请只保留需要接入的实例。' : '未找到当前用户的 Clash Party 内核，请先启动 Clash Party。')
  return live[0]
}

export class MihomoRuntime {
  readonly pipe: string
  constructor(pipe: string) { this.pipe = pipe }
  request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body)
      const req = http.request({ socketPath: this.pipe, path: endpoint, method, timeout: 12000,
        headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {} }, res => {
        let data = ''; let size = 0
        res.setEncoding('utf8')
        res.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > 16 * 1024 * 1024) req.destroy(new Error('内核响应过大')); else data += chunk })
        res.on('error', () => reject(new Error('内核响应中断。')))
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 300) return reject(new Error(`内核请求失败（${res.statusCode}），配置未确认。`))
          try { resolve(data ? JSON.parse(data) : undefined) } catch { reject(new Error('内核响应格式错误。')) }
        })
      })
      req.on('error', () => reject(new Error('无法连接 Clash Party 内核。')))
      req.on('timeout', () => req.destroy(new Error('内核请求超时。')))
      req.end(payload)
    })
  }
  config() { return this.request<RuntimeConfig>('GET', '/configs') }
  version() { return this.request<{ version: string }>('GET', '/version') }
  proxies() { return this.request<{ proxies: Record<string, ProxyInfo> }>('GET', '/proxies') }
  rules() { return this.request<{ rules: RuntimeRule[] }>('GET', '/rules') }
  async connections(): Promise<{ connections: RuntimeConnection[] }> {
    const response = await this.request<{ connections: RuntimeConnection[] | null }>('GET', '/connections')
    // Mihomo 刚启动且尚无连接时返回 null；这是空记录，不是控制接口断连。
    if (response.connections === null) return { connections: [] }
    if (!Array.isArray(response.connections)) throw new Error('内核连接记录格式错误。')
    return { connections: response.connections }
  }
  reload(payload: string) { return this.request<void>('PUT', '/configs?force=true', { payload }) }
  delay(name: string, url: string) { return this.request<{ delay: number }>('GET', `/proxies/${encodeURIComponent(name)}/delay?timeout=5000&url=${encodeURIComponent(url)}`) }
  checkGroup(name: string) { return this.request<Record<string, number>>('GET', `/group/${encodeURIComponent(name)}/delay?timeout=5000&url=${encodeURIComponent('https://www.gstatic.com/generate_204')}`) }
}
