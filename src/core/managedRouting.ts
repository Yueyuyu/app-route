import type { Application } from '../shared/application.ts'
import type { ManagedApplication } from '../shared/integration.ts'
import { validProcessName } from './applicationRules.ts'

export const ownerId = 'approute-managed-v1'
export const markerKey = 'x-approute-managed-v1'
export const scriptHeader = '// AppRoute managed override v1; edit through AppRoute.'
export const protectedProcesses = new Set(['codex.exe', 'chatgpt.exe', 'node.exe', 'approute.exe', 'clash party.exe', 'mihomo.exe', 'mihomo-alpha.exe', 'mihomo-smart.exe', 'powershell.exe', 'pwsh.exe'])

export function managedApplications(input: Application[], target?: string): ManagedApplication[] {
  if (!Array.isArray(input) || input.length > 100) throw new Error('一次最多管理 100 个应用。')
  const seen = new Set<string>()
  const ids = new Set<string>()
  return input.map(app => {
    if (!app || typeof app.id !== 'string' || !app.id || app.id.length > 200 || ids.has(app.id) || typeof app.name !== 'string' || !app.name.trim() ||
        !['scan', 'manual'].includes(app.source) || !['rule', 'direct', 'proxy'].includes(app.mode) ||
        !Array.isArray(app.processes) || !app.processes.length || app.processes.length > 20) {
      throw new Error('请先扫描或手动添加真实应用；示例应用不能直接应用到网络。')
    }
    ids.add(app.id)
    const processes = app.processes.map(name => {
      if (typeof name !== 'string' || !validProcessName(name)) throw new Error('进程名无效。')
      const normalized = name.trim().toLowerCase()
      if (protectedProcesses.has(normalized)) throw new Error('为保留修复通道，AppRoute 不改写自身、ChatGPT/Codex、代理内核和恢复工具的分流。')
      if (seen.has(normalized)) throw new Error('同一进程不能同时属于多个应用。')
      seen.add(normalized)
      return name.trim()
    })
    if (app.mode === 'proxy' && (typeof target !== 'string' || !target || /[,\r\n\x00]/.test(target) || target.length > 200)) throw new Error('请选择有效的代理出口。')
    return { id: app.id, name: app.name.slice(0, 80), processes, mode: app.mode, ...(app.mode === 'proxy' ? { target } : {}) }
  }).filter(app => app.mode !== 'rule')
}

export function ruleStrings(apps: ManagedApplication[]): string[] {
  return apps.flatMap(app => app.processes.map(process => `PROCESS-NAME,${process},${app.mode === 'direct' ? 'DIRECT' : app.target}`))
}

/** 只移除带本工具标记、且与标记完整一致的前置规则；冲突时不猜测所有权。 */
export function removeManagedRules(config: Record<string, any>): Record<string, any> {
  const copy = structuredClone(config)
  const marker = copy[markerKey]
  if (!marker) return copy
  if (marker.owner !== ownerId || !Array.isArray(marker.rules) || !Array.isArray(copy.rules) ||
      !marker.rules.every((rule: unknown, i: number) => typeof rule === 'string' && copy.rules[i] === rule)) {
    throw new Error('AppRoute 规则标记与配置不一致，已停止覆盖。请使用离线恢复工具查看诊断。')
  }
  copy.rules = copy.rules.slice(marker.rules.length)
  delete copy[markerKey]
  return copy
}

export function addManagedRules(config: Record<string, any>, apps: ManagedApplication[]): Record<string, any> {
  const clean = removeManagedRules(config)
  const names = new Set(['DIRECT', ...(clean.proxies ?? []).map((p: any) => p.name), ...(clean['proxy-groups'] ?? []).map((p: any) => p.name)])
  const eligible = apps.filter(app => app.mode === 'direct' || names.has(app.target))
  const rules = ruleStrings(eligible)
  if (!rules.length) return clean
  return { ...clean, rules: [...rules, ...(clean.rules ?? [])], [markerKey]: { owner: ownerId, rules } }
}

/** 生成独立覆写；目标在订阅更新后消失时跳过该条，不能让整个代理配置失效。 */
export function overrideScript(apps: ManagedApplication[]): string {
  return `${scriptHeader}\nfunction main(config) {\n  var key = ${JSON.stringify(markerKey)};\n  var old = config[key];\n  if (old && old.owner === ${JSON.stringify(ownerId)} && Array.isArray(old.rules)) {\n    if (!Array.isArray(config.rules) || !old.rules.every(function(r,i){return config.rules[i] === r})) return config;\n    config.rules = config.rules.slice(old.rules.length);\n    delete config[key];\n  }\n  var apps = ${JSON.stringify(apps)};\n  var names = ['DIRECT'].concat((config.proxies || []).map(function(p){return p.name}), (config['proxy-groups'] || []).map(function(p){return p.name}));\n  var rules = [];\n  apps.forEach(function(app){\n    var target = app.mode === 'direct' ? 'DIRECT' : app.target;\n    if (names.indexOf(target) < 0) return;\n    app.processes.forEach(function(p){rules.push('PROCESS-NAME,' + p + ',' + target)});\n  });\n  if (rules.length) {\n    config.rules = rules.concat(config.rules || []);\n    config[key] = {owner:${JSON.stringify(ownerId)},rules:rules};\n  }\n  return config;\n}\n`
}

export interface ProxyInfo { name: string; type: string; all?: string[]; now?: string; udp?: boolean }
// 只接受所有可能成员均为代理的出口，防止选中含 DIRECT 的组后仍宣称强制代理。
export function isProxyOnly(name: string, proxies: Record<string, ProxyInfo>, visiting = new Set<string>()): boolean {
  const entry = proxies[name]
  if (!entry || visiting.has(name) || /^(direct|reject|rejectdrop|pass|compatible)$/i.test(entry.type.replaceAll('-', ''))) return false
  if (!entry.all) return true
  const next = new Set(visiting).add(name)
  return entry.all.length > 0 && entry.all.every(child => isProxyOnly(child, proxies, next))
}
