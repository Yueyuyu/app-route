import type { ProxyInfo } from './managedRouting.ts'
import type { ProxyOutlet } from '../shared/integration.ts'

/** 仅提供能解析当前选择的组；GLOBAL 与配置中的命名组不是同一个设置。 */
export function isFollowGroup(entry?: ProxyInfo): boolean {
  return Boolean(entry?.all && ['Selector', 'URLTest', 'Fallback'].includes(entry.type))
}

/** 逐层解析组的当前选择；不把负载均衡、循环或失效引用伪装成一个确定节点。 */
export function resolveProxyOutlet(target: string, proxies: Record<string, ProxyInfo>): ProxyOutlet {
  const outlet: ProxyOutlet = { target, type: proxies[target]?.type, chain: [], kind: 'unknown', health: 'unknown' }
  let name = target
  while (outlet.chain.length < 32) {
    if (outlet.chain.includes(name)) return outlet
    outlet.chain.push(name)
    const entry = proxies[name]
    if (!entry) return { ...outlet, kind: 'missing' }
    if (entry.type === 'LoadBalance') return { ...outlet, kind: 'distributed' }
    if (entry.all) {
      if (!isFollowGroup(entry) || !entry.now || !entry.all.includes(entry.now)) return outlet
      name = entry.now
      continue
    }
    const type = entry.type.replaceAll('-', '').toLowerCase()
    const kind = type === 'direct' ? 'direct' : ['reject', 'rejectdrop'].includes(type) ? 'reject'
      : ['pass', 'compatible', 'dns', 'loopback'].includes(type) ? 'unknown' : 'proxy'
    const history = entry.history?.at(-1)
    // 测速记录只代表该次探测，不把初始 alive 或过期记录当作实时健康证明。
    const recent = history && Date.now() - Date.parse(history.time) >= 0 && Date.now() - Date.parse(history.time) < 5 * 60_000
    return { ...outlet, node: name, kind,
      health: recent ? history.delay > 0 && entry.alive !== false ? 'healthy' : 'unhealthy' : 'unknown',
      ...(history ? { checkedAt: history.time, delay: history.delay } : {}) }
  }
  return outlet
}

export function proxyOutletLabel(outlet?: ProxyOutlet): string {
  if (!outlet) return '未连接，当前节点未知'
  if (outlet.kind === 'missing') return '代理组或成员已消失，请重新绑定'
  if (outlet.kind === 'distributed') return '按连接分配，实际节点见连接记录'
  if (outlet.kind === 'unknown') return '无法确认当前节点'
  if (outlet.kind === 'direct') return `${outlet.node} · 当前直连`
  if (outlet.kind === 'reject') return `${outlet.node} · 当前拒绝连接`
  return `${outlet.node}${outlet.health === 'unhealthy' ? ' · 最近探测失败' : ''}`
}
