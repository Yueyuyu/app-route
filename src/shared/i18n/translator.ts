import type { ProxyOutlet } from '../integration.ts'
export type Parameter = string | number | null | undefined
export type Translator = (source: string, params?: readonly Parameter[]) => string
const interpolate = (text: string, params: readonly Parameter[]) => text.replace(/\{(\d+)\}/g, (token, index) => Number(index) < params.length ? String(params[Number(index)] ?? '') : token)
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** 一个实例只持有所选语言；后端诊断只完整匹配已登记句型，不翻译用户名称。 */
export function createTranslator(catalog: Record<string, string> = {}): Translator {
  const patterns = Object.keys(catalog).filter(key => /\{\d+\}/.test(key)).map(key => {
    const slots: number[] = []
    const pieces = key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? (slots.push(Number(part.slice(1, -1))), '([\\s\\S]*?)') : escapePattern(part))
    return { key, slots, pattern: new RegExp('^' + pieces.join('') + '$') }
  })
  return (source, params) => {
    if (Object.hasOwn(catalog, source)) return interpolate(catalog[source], params ?? [])
    if (!params) for (const entry of patterns) {
      const match = entry.pattern.exec(source)
      if (match) { const values: string[] = []; entry.slots.forEach((slot, i) => { values[slot] = match[i + 1] }); return interpolate(catalog[entry.key], values) }
    }
    return params ? interpolate(source, params) : source
  }
}
export function proxyOutletText(text: Translator, outlet?: ProxyOutlet): string {
  if (!outlet) return text('未连接，当前节点未知')
  if (outlet.kind === 'missing') return text('代理组或成员已消失，请重新绑定')
  if (outlet.kind === 'distributed') return text('按连接分配，实际节点见连接记录')
  if (outlet.kind === 'unknown') return text('无法确认当前节点')
  if (outlet.kind === 'direct') return text('{0} · 当前直连', [outlet.node])
  if (outlet.kind === 'reject') return text('{0} · 当前拒绝连接', [outlet.node])
  return (outlet.node ?? '') + (outlet.health === 'unhealthy' ? text(' · 最近探测失败') : '')
}
