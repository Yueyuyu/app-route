import type { DomainException, ManagedDomainException } from '../shared/domainExceptions.ts'
import type { ManagedApplication } from '../shared/integration.ts'

/** 只接受主机名，不接受 URL、通配符、IP 或规则表达式；国际域名使用 punycode。 */
export function validateDomainExceptions(input: unknown): DomainException[] {
  if (!Array.isArray(input) || input.length > 20) throw new Error('每个应用最多设置 20 条域名例外。')
  const seen = new Set<string>()
  return input.map(value => {
    const domain: string = typeof value?.domain === 'string' ? value.domain.trim().toLowerCase() : ''
    if (!['exact', 'suffix'].includes(value?.kind) || !['direct', 'proxy'].includes(value?.mode) || domain.length > 253 || !domain.includes('.') || /^\d+(?:\.\d+){3}$/.test(domain) ||
        domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error('请输入有效域名，不含协议、端口或通配符。')
    const key = value.kind + ':' + domain
    if (seen.has(key)) throw new Error('同一种匹配方式不能重复设置相同域名。')
    seen.add(key)
    return { kind: value.kind, domain, mode: value.mode } as DomainException
  }).sort((a, b) => Number(b.kind === 'exact') - Number(a.kind === 'exact') || b.domain.length - a.domain.length || a.domain.localeCompare(b.domain))
}
export function bindDomainExceptions(input: unknown, target?: string): ManagedDomainException[] {
  return validateDomainExceptions(input).map(item => {
    if (item.mode === 'proxy' && (!target || target.length > 200 || /[,\r\n\x00-\x1f]/.test(target))) throw new Error('请先选择有效的代理组。')
    return { ...item, ...(item.mode === 'proxy' ? { target } : {}) }
  })
}
export function assertExceptionPaths(paths?: string[]) {
  if (!paths?.length) throw new Error('域名例外需要已管理的精确程序路径。')
  for (const path of paths) {
    let depth = 0
    for (const char of path) { if (char === '(') depth++; if (char === ')' && --depth < 0) throw new Error('程序路径无法安全用于组合规则。') }
    if (depth) throw new Error('程序路径无法安全用于组合规则。')
  }
}
export function matchingDomainException(app: ManagedApplication, host: string): ManagedDomainException | undefined {
  const domain: string = host.toLowerCase().replace(/\.$/, '')
  return app.domainExceptions?.find(item => domain === item.domain || (item.kind === 'suffix' && domain.endsWith('.' + item.domain)))
}
/** Mihomo 的 /rules 与连接记录返回规范化逻辑表达式，而非配置中的逗号表达式。 */
export function domainRuntimePayload(processPath: string, item: Pick<DomainException, 'kind' | 'domain'>) {
  return `((ProcessPath,${processPath}) && (${item.kind === 'exact' ? 'Domain' : 'DomainSuffix'},${item.domain}))`
}
export function canonicalRulePayload(type: string, payload: string) {
  if (type.replaceAll('-', '').toLowerCase() !== 'and') return payload
  const match = /^\(\(PROCESS-PATH,([^,]+)\),\((DOMAIN|DOMAIN-SUFFIX),([a-z0-9.-]+)\)\)$/.exec(payload)
  return match ? domainRuntimePayload(match[1], { kind: match[2] === 'DOMAIN' ? 'exact' : 'suffix', domain: match[3] }) : payload
}
