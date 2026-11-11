import type { ProxyStrategy } from '../shared/proxyStrategy.ts'

export const strategyOwnership = { key: 'x-approute-proxy-strategy-v1', owner: 'approute-proxy-strategy-v1', name: 'AppRoute · 自动代理' }
export const strategyTestUrl = 'https://www.gstatic.com/generate_204'

export function validateProxyStrategy(value: unknown): ProxyStrategy {
  const input = value as Partial<Omit<Extract<ProxyStrategy, { nodes: string[] }>, 'mode'>> & { mode?: string; group?: string }
  const validName = (name: unknown): name is string => typeof name === 'string' && name.length > 0 && name.length <= 200 && !/[,\r\n\x00-\x1f]/.test(name)
  if (!input || !['existing', 'fallback', 'url-test'].includes(input.mode ?? '')) throw new Error('请选择有效的代理策略。')
  if (input.mode === 'existing') {
    if (!validName(input.group) || input.group === strategyOwnership.name) throw new Error('请选择 Clash Party 已有的代理组。')
    return { mode: 'existing', group: input.group }
  }
  if (!Array.isArray(input.nodes) || input.nodes.length < 2 || input.nodes.length > 32 || input.nodes.some(name => !validName(name) || name === strategyOwnership.name) || new Set(input.nodes).size !== input.nodes.length) throw new Error('请选择 2 至 32 个不同的候选节点。')
  if (![30, 60, 120, 300].includes(input.interval!) || ![3000, 5000, 10000].includes(input.timeout!) || ![50, 100, 150].includes(input.tolerance!)) throw new Error('健康检查参数无效，请重新选择。')
  return { mode: input.mode as 'fallback' | 'url-test', nodes: [...input.nodes], interval: input.interval!, timeout: input.timeout!, tolerance: input.tolerance! }
}

/** 自包含纯函数同时用于本机编译和客户端覆写；不得引用函数外变量，保证打包后仍可序列化执行。 */
export function reconcileProxyStrategy(config: Record<string, any>, strategy: ProxyStrategy | undefined, ownership: typeof strategyOwnership, testUrl: string): Record<string, any> {
  const marker = config[ownership.key]
  const groups = config['proxy-groups'] ?? []
  if (!Array.isArray(groups)) throw new Error('代理组配置格式无效。')
  if (marker) {
    const owned = groups.filter((group: any) => group.name === ownership.name)
    // 全量比对组字段，外部改过同名组时不能猜测其所有权。
    const stable = (value: any): string => value && typeof value === 'object' ? Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value)
    if (marker.owner !== ownership.owner || owned.length !== 1 || stable(owned[0]) !== stable(marker.group)) throw new Error('代理策略所有权标记冲突，已保留配置，请先检查外部修改。')
    config['proxy-groups'] = groups.filter((group: any) => group.name !== ownership.name)
    if (marker.hadGroups === false && !config['proxy-groups'].length) delete config['proxy-groups']
    delete config[ownership.key]
    const referenced = (value: any): boolean => typeof value === 'string' ? value.split(',').includes(ownership.name) : value && typeof value === 'object' ? Object.values(value).some(referenced) : false
    if (referenced(config)) throw new Error('原有配置正在引用 AppRoute 专用组，已停止替换或删除，请先解除该引用。')
  } else if (strategy && strategy.mode !== 'existing' && (groups.some((group: any) => group.name === ownership.name) || (config.proxies ?? []).some((proxy: any) => proxy.name === ownership.name))) {
    throw new Error('代理策略名称已被其他配置占用，未覆盖原有配置。')
  }
  if (!strategy || strategy.mode === 'existing') return config
  // 仅纳入本配置明确声明的远端节点；订阅删光候选时保持拒绝，不静默直连。
  const available = new Set((config.proxies ?? []).filter((proxy: any) => !/^(direct|reject|reject-drop|pass|compatible|dns|loopback)$/i.test(proxy.type)).map((proxy: any) => proxy.name))
  const nodes = strategy.nodes.filter(name => available.has(name))
  const group = { name: ownership.name, type: strategy.mode, proxies: nodes.length ? nodes : ['REJECT'], url: testUrl,
    interval: strategy.interval, timeout: strategy.timeout, lazy: false, 'expected-status': 204,
    ...(strategy.mode === 'url-test' ? { tolerance: strategy.tolerance } : {}) }
  const hadGroups = Object.prototype.hasOwnProperty.call(config, 'proxy-groups')
  config['proxy-groups'] = [...(config['proxy-groups'] ?? []), group]
  // 所有权快照不能与实际组共享引用，否则修改组会同时改掉比较基准（YAML 别名亦然）。
  config[ownership.key] = { owner: ownership.owner, group: JSON.parse(JSON.stringify(group)), hadGroups }
  return config
}
