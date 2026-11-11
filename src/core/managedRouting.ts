import type { Application } from '../shared/application.ts'
import type { ManagedApplication } from '../shared/integration.ts'
import { validProcessName } from './applicationRules.ts'
import { normalizeProcessPath, validProcessPath } from './processFamily.ts'
import path from 'node:path'
import type { ProxyStrategy } from '../shared/proxyStrategy.ts'
import { reconcileProxyStrategy, strategyOwnership, strategyTestUrl } from './proxyStrategy.ts'

export const ownerId = 'approute-managed-v1'
export const markerKey = 'x-approute-managed-v1'
export const scriptHeader = '// AppRoute managed override v1; edit through AppRoute.'
export const protectedProcesses = new Set(['codex.exe', 'chatgpt.exe', 'node.exe', 'approute.exe', 'clash party.exe', 'mihomo.exe', 'mihomo-alpha.exe', 'mihomo-smart.exe', 'powershell.exe', 'pwsh.exe'])

// 共享系统宿主可能代表多个功能，不能把整台电脑的宿主流量当作一个普通应用管理。
const systemHostProcesses = new Set([
  'explorer.exe', 'svchost.exe', 'rundll32.exe', 'dllhost.exe', 'taskhost.exe', 'taskhostw.exe',
  'control.exe', 'msiexec.exe', 'cmd.exe', 'conhost.exe', 'wscript.exe', 'cscript.exe', 'windowsterminal.exe',
  'runtimebroker.exe', 'applicationframehost.exe', 'shellexperiencehost.exe', 'startmenuexperiencehost.exe',
  'searchhost.exe', 'searchindexer.exe', 'textinputhost.exe', 'ctfmon.exe', 'systemsettings.exe',
  'services.exe', 'lsass.exe', 'wininit.exe', 'winlogon.exe', 'dwm.exe', 'smss.exe', 'csrss.exe',
])
export function assertNoSystemHostRouting(apps: Application[]) {
  for (const app of apps) {
    // 老版本记录仍可读取和撤销；检查只在新写入入口执行，不因新增限制使全部旧记录失效。
    if (app.mode === 'rule') continue
    const names = [...app.processes, ...[app.path, ...(app.processPaths ?? [])].filter((value): value is string => typeof value === 'string').map(value => path.win32.basename(value))]
    if (names.some(name => systemHostProcesses.has(name.trim().toLowerCase()))) throw new Error('系统共享进程不能设置专属分流，请选择具体应用；已有设置可切回按 Clash 规则。')
  }
}

export function managedApplications(input: Application[], target?: string): ManagedApplication[] {
  if (!Array.isArray(input) || input.length > 100) throw new Error('一次最多管理 100 个应用。')
  const seen = new Set<string>()
  const ids = new Set<string>()
  return input.map(app => {
    if (!app || typeof app.id !== 'string' || !app.id || app.id.length > 200 || ids.has(app.id) || typeof app.name !== 'string' || !app.name.trim() ||
        !['scan', 'manual'].includes(app.source) || !['rule', 'direct', 'proxy'].includes(app.mode) ||
        !Array.isArray(app.processes) || !app.processes.length || app.processes.length > 40) {
      throw new Error('请先扫描或手动添加真实应用；示例应用不能直接应用到网络。')
    }
    ids.add(app.id)
    const processes = app.processes.map(name => {
      if (typeof name !== 'string' || !validProcessName(name)) throw new Error('进程名无效。')
      const normalized = name.trim().toLowerCase()
      if (protectedProcesses.has(normalized)) throw new Error('为保留修复通道，AppRoute 不改写自身、ChatGPT/Codex、代理内核和恢复工具的分流。')
      if (!app.processPaths) {
        if (seen.has(normalized)) throw new Error('同一进程不能同时属于多个应用。')
        seen.add(normalized)
      }
      return name.trim()
    })
    if (app.processPaths !== undefined) {
      if (!Array.isArray(app.processPaths) || !app.processPaths.length || app.processPaths.length > 40) throw new Error('进程路径无效。')
      for (const value of app.processPaths) {
        if (!validProcessPath(value) || !processes.some(p => p.toLowerCase() === path.win32.basename(value).toLowerCase()) || protectedProcesses.has(path.win32.basename(value).toLowerCase())) throw new Error('进程路径无效或属于受保护程序。')
        const key = normalizeProcessPath(value)
        if (seen.has(key)) throw new Error('同一进程不能同时属于多个应用。')
        seen.add(key)
      }
    }
    if (app.mode === 'proxy' && (typeof target !== 'string' || !target || /[,\r\n\x00]/.test(target) || target.length > 200)) throw new Error('请选择有效的代理出口。')
    return { id: app.id, name: app.name.slice(0, 80), processes, mode: app.mode,
      ...(app.processPaths ? { processPaths: app.processPaths, processWarnings: app.processWarnings } : {}), ...(app.mode === 'proxy' ? { target } : {}) }
  }).filter(app => app.mode !== 'rule')
}

export function ruleStrings(apps: ManagedApplication[]): string[] {
  return apps.flatMap(app => (app.processPaths ?? app.processes).map(process => `${app.processPaths ? 'PROCESS-PATH' : 'PROCESS-NAME'},${process},${app.mode === 'direct' ? 'DIRECT' : app.target}`))
}

/** 同一纯函数供即时配置和订阅覆写使用。旧记录默认沿用原规则，新策略可明确拒绝连接。 */
export function effectiveApplications(apps: ManagedApplication[], names: string[]): ManagedApplication[] {
  return apps.flatMap(app => app.mode === 'direct' || names.includes(app.target!) ? [app]
    : app.missingTargetAction === 'block' ? [{ ...app, target: 'REJECT' }] : [])
}

export function managedProcessMatches(app: ManagedApplication, metadata: { process?: string; processPath?: string }): boolean {
  return app.processPaths ? Boolean(metadata.processPath && app.processPaths.some(p => normalizeProcessPath(p) === normalizeProcessPath(metadata.processPath!)))
    : app.processes.some(p => p.toLowerCase() === metadata.process?.toLowerCase())
}

export function assertNoProcessOverlap(apps: ManagedApplication[]) {
  for (let i = 0; i < apps.length; i++) for (let j = i + 1; j < apps.length; j++) {
    const left = apps[i], right = apps[j]
    const overlap = left.processPaths && right.processPaths
      ? left.processPaths.some(p => right.processPaths!.some(q => normalizeProcessPath(p) === normalizeProcessPath(q)))
      : left.processes.some(p => right.processes.some(q => p.toLowerCase() === q.toLowerCase()))
    if (overlap) throw new Error('这些进程已在其他已生效应用中，请先恢复对应应用。')
  }
}

/** 只移除带本工具标记、且与标记完整一致的前置规则；冲突时不猜测所有权。 */
export function removeManagedRules(config: Record<string, any>): Record<string, any> {
  const copy = structuredClone(config)
  const marker = copy[markerKey]
  if (!marker) return reconcileProxyStrategy(copy, undefined, strategyOwnership, strategyTestUrl)
  if (marker.owner !== ownerId || !Array.isArray(marker.rules) || !Array.isArray(copy.rules) ||
      !marker.rules.every((rule: unknown, i: number) => typeof rule === 'string' && copy.rules[i] === rule)) {
    throw new Error('AppRoute 规则标记与配置不一致，已停止覆盖。请使用离线恢复工具查看诊断。')
  }
  copy.rules = copy.rules.slice(marker.rules.length)
  delete copy[markerKey]
  return reconcileProxyStrategy(copy, undefined, strategyOwnership, strategyTestUrl)
}

export function addManagedRules(config: Record<string, any>, apps: ManagedApplication[], strategy?: ProxyStrategy): Record<string, any> {
  const clean = reconcileProxyStrategy(removeManagedRules(config), strategy, strategyOwnership, strategyTestUrl)
  const names = new Set(['DIRECT', ...(clean.proxies ?? []).map((p: any) => p.name), ...(clean['proxy-groups'] ?? []).map((p: any) => p.name)])
  const eligible = effectiveApplications(apps, [...names])
  const rules = ruleStrings(eligible)
  if (!rules.length) return clean
  return { ...clean, rules: [...rules, ...(clean.rules ?? [])], [markerKey]: { owner: ownerId, rules } }
}

/** 生成独立覆写；失效目标按明确策略处理，不让整个配置失效。 */
export function overrideScript(apps: ManagedApplication[], strategy?: ProxyStrategy): string {
  return `${scriptHeader}\n// AppRoute record: ${JSON.stringify({version:1,apps,strategy})}\nfunction main(input) {\n try {\n  var config = JSON.parse(JSON.stringify(input));\n  var key = ${JSON.stringify(markerKey)};\n  var old = config[key];\n  if (old && old.owner === ${JSON.stringify(ownerId)} && Array.isArray(old.rules)) {\n    if (!Array.isArray(config.rules) || !old.rules.every(function(r,i){return config.rules[i] === r})) return config;\n    config.rules = config.rules.slice(old.rules.length);\n    delete config[key];\n  }\n  config = (${reconcileProxyStrategy.toString()})(config, ${JSON.stringify(strategy) ?? 'undefined'}, ${JSON.stringify(strategyOwnership)}, ${JSON.stringify(strategyTestUrl)});\n  var apps = ${JSON.stringify(apps)};\n  var names = ['DIRECT'].concat((config.proxies || []).map(function(p){return p.name}), (config['proxy-groups'] || []).map(function(p){return p.name}));\n  apps = (${effectiveApplications.toString()})(apps, names);\n  var rules = [];\n  apps.forEach(function(app){\n    var target = app.mode === 'direct' ? 'DIRECT' : app.target;\n    if (target !== 'REJECT' && names.indexOf(target) < 0) return;\n    (app.processPaths || app.processes).forEach(function(p){rules.push((app.processPaths ? 'PROCESS-PATH,' : 'PROCESS-NAME,') + p + ',' + target)});\n  });\n  if (rules.length) {\n    config.rules = rules.concat(config.rules || []);\n    config[key] = {owner:${JSON.stringify(ownerId)},rules:rules};\n  }\n  return config;\n } catch (_) { return input; }\n}\n`
}

export interface ProxyInfo { name: string; type: string; all?: string[]; now?: string; fixed?: string; udp?: boolean; alive?: boolean; history?: { time: string; delay: number }[] }
/** 自动测速/故障转移的 now 会自然变化；只核对用户手动选择及自动组的固定选择。 */
export function configuredProxySelections(proxies: Record<string, ProxyInfo>): string {
  return JSON.stringify(Object.values(proxies).filter(p => p.type === 'Selector' || ['URLTest', 'Fallback'].includes(p.type))
    .map(p => [p.name, p.type === 'Selector' ? p.now ?? '' : p.fixed ?? '']).sort((a, b) => a[0].localeCompare(b[0])))
}
// 只接受所有可能成员均为代理的出口，防止选中含 DIRECT 的组后仍宣称强制代理。
export function isProxyOnly(name: string, proxies: Record<string, ProxyInfo>, visiting = new Set<string>()): boolean {
  const entry = proxies[name]
  if (!entry || visiting.has(name) || /^(direct|reject|rejectdrop|pass|compatible)$/i.test(entry.type.replaceAll('-', ''))) return false
  if (!entry.all) return true
  const next = new Set(visiting).add(name)
  return entry.all.length > 0 && entry.all.every(child => isProxyOnly(child, proxies, next))
}
