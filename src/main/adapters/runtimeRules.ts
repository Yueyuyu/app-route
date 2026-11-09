import type { RuntimeRule } from './mihomoRuntime.ts'

const normalizeType = (value: string) => value.replaceAll('-', '').toLowerCase().replace(/^ipcidr6$/, 'ipcidr')

/** 命中次数和时间持续变化，不属于规则配置；禁用状态属于配置。 */
export function runtimeRuleSignature(rules: RuntimeRule[]): string {
  return JSON.stringify(rules.map(rule => [normalizeType(rule.type), rule.payload, rule.proxy, Boolean(rule.extra?.disabled)]))
}

/** 对无法与内核表示一致的规则保守拒绝写入，防止覆盖运行时手工修改。 */
export function configRuleSignature(rules: string[]): string {
  return JSON.stringify(rules.map(rule => {
    const parts = rule.split(',').map(part => part.trim())
    const type = normalizeType(parts.shift() ?? '')
    if (parts.at(-1) === 'no-resolve') parts.pop()
    const proxy = parts.pop() ?? ''
    const payload = type === 'geoip' ? parts.join(',').toLowerCase() : parts.join(',')
    return [type, payload, proxy, false]
  }))
}
