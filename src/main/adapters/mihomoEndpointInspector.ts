import http from 'node:http'
import fs from 'node:fs/promises'
import YAML from 'yaml'
import type { MihomoEndpointInspection } from '../../shared/mihomoInspection.ts'
import type { EngineRuntimeAdapter } from './contracts.ts'
import type { RoutingReadiness } from '../../shared/routingBackend.ts'

export interface MihomoEndpointRequest { port: number; secret?: string }
const endpointError = '无法读取本机 Mihomo 控制接口，请检查控制端口和密钥。'
// 控制检查只用于摘要；限制响应体与总时长，避免异常本机服务阻塞检查。
const inspectionTimeoutMs = 3000, inspectionByteLimit = 2 * 1024 * 1024

/** 仅固定回环地址和固定 GET 接口。不跟随重定向，不读代理环境变量，不保存或返回密钥。 */
export class MihomoEndpointInspector implements EngineRuntimeAdapter {
  readonly id = 'mihomo-local-api'
  private readonly port: number
  private readonly secret: string
  constructor(request: MihomoEndpointRequest) {
    if (!request || !Number.isInteger(request.port) || request.port < 1 || request.port > 65535 || request.secret !== undefined && (typeof request.secret !== 'string' || request.secret.length > 512 || /[\r\n\x00-\x1f]/.test(request.secret))) throw new Error('控制端口或密钥格式无效。')
    this.port = request.port; this.secret = request.secret ?? ''
  }
  private get(endpoint: '/version' | '/configs' | '/connections'): Promise<any> {
    return new Promise((resolve, reject) => {
      let settled = false; let timer: ReturnType<typeof setTimeout> | undefined
      const fail = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(endpointError)) } }
      const request = http.request({ host: '127.0.0.1', port: this.port, path: endpoint, method: 'GET', timeout: inspectionTimeoutMs, headers: this.secret ? { Authorization: `Bearer ${this.secret}` } : {} }, response => {
        if (response.statusCode !== 200) { fail(); response.destroy(); return }
        const chunks: Buffer[] = []; let size = 0
        response.on('data', chunk => { size += chunk.length; if (size > inspectionByteLimit) { fail(); request.destroy() } else chunks.push(chunk) })
        response.on('error', fail)
        response.on('end', () => {
          if (settled) return
          try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); settled = true; clearTimeout(timer); resolve(value) } catch { fail() }
        })
      })
      timer = setTimeout(() => { fail(); request.destroy() }, inspectionTimeoutMs)
      request.on('error', fail); request.on('timeout', () => { fail(); request.destroy() }); request.end()
    })
  }
  async inspect(): Promise<MihomoEndpointInspection> {
    const capabilities: RoutingReadiness['capabilities'] = { processRules: 'unknown', persistentRules: 'unknown', connectionInspection: 'unknown', udp: 'unknown' }
    const checkedAt = new Date().toISOString()
    try {
      const version = await this.get('/version')
      if (version?.meta !== true || typeof version.version !== 'string' || !/^[\w.+-]{1,80}$/.test(version.version)) return { checkedAt, state: 'unavailable', reasons: ['此端口未确认为 Mihomo 控制接口。'], capabilities }
      const [config, connections] = await Promise.allSettled([this.get('/configs'), this.get('/connections')])
      const reasons = ['已识别内核；其他客户端的配置所有权尚未验证，仅供查看。']
      if (config.status === 'fulfilled' && config.value && ['strict', 'always', 'off'].includes(config.value['find-process-mode'])) {
        capabilities.processRules = config.value['find-process-mode'] === 'off' ? 'unsupported' : 'supported'
        if (config.value.mode !== 'rule') reasons.push('当前内核不是规则模式。')
      } else reasons.push('暂时无法确认进程识别设置。')
      if (connections.status === 'fulfilled' && (connections.value?.connections === null || Array.isArray(connections.value?.connections))) capabilities.connectionInspection = 'supported'
      else reasons.push('暂时无法读取连接记录。')
      return { checkedAt, version: version.version, state: 'needs-setup', reasons, capabilities }
    } catch { return { checkedAt, state: 'unavailable', reasons: [endpointError], capabilities } }
  }
}

// 凭据仅存在主进程。用户通过原生文件选择器指定运行配置，不传回界面或写入存储。
export async function inspectMihomoFile(file: string): Promise<MihomoEndpointInspection> {
  const checkedAt = new Date().toISOString()
  const capabilities: RoutingReadiness['capabilities'] = { processRules: 'unknown', persistentRules: 'unknown', connectionInspection: 'unknown', udp: 'unknown' }
  try {
    const handle = await fs.open(file, 'r')
    let text: string
    try {
      if (!(await handle.stat()).isFile()) throw new Error('invalid file')
      const buffer = Buffer.alloc(inspectionByteLimit + 1)
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
      if (bytesRead >= buffer.length) throw new Error('too large')
      text = buffer.subarray(0, bytesRead).toString('utf8')
    } finally { await handle.close() }
    const input = endpointFromConfig(text)
    return await new MihomoEndpointInspector(input).inspect()
  } catch {
    return { checkedAt, state: 'unavailable', reasons: ['无法读取本机控制配置，请选择包含有效回环控制端口的运行配置。'], capabilities }
  }
}

/** 配置只作为回环端口和本次鉴权的来源。代理端口、远程地址、其他配置均不使用。 */
export function endpointFromConfig(text: string): { port: number; secret?: string } {
  const config = YAML.parse(text, { maxAliasCount: 20 })
  const endpoint = config?.['external-controller']
  const match = typeof endpoint === 'string' && /^(?:127\.0\.0\.1|localhost|0\.0\.0\.0):(\d{1,5})$/.exec(endpoint)
  if (!match) throw new Error('控制端口或密钥格式无效。')
  const request = { port: Number(match[1]), secret: config.secret }
  // 构造时做同一份边界验证；不连接接口。
  new MihomoEndpointInspector(request)
  return request
}
