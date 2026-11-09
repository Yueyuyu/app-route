import path from 'node:path'
import fs from 'node:fs/promises'
import YAML from 'yaml'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ownerId, scriptHeader } from '../../core/managedRouting.ts'
import { readOptional, writeIfUnchanged } from '../storage/localState.ts'

export const parseConfig = (text: string): Record<string, any> => {
  const doc = YAML.parseDocument(text)
  if (doc.errors.length) throw new Error('配置格式无效，已停止修改。')
  const value = doc.toJS({ maxAliasCount: 100 })
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('配置不是对象。')
  return value
}
export class ClashPartyConfiguration {
  readonly scriptPath: string
  readonly registryPath: string
  readonly root: string
  constructor(root: string) {
    this.root = root
    this.scriptPath = path.join(root, 'override', `${ownerId}.js`)
    this.registryPath = path.join(root, 'override.yaml')
  }
  async snapshot() {
    const [appText, profileText, registry, script] = await Promise.all([
      fs.readFile(path.join(this.root, 'config.yaml'), 'utf8'), fs.readFile(path.join(this.root, 'profile.yaml'), 'utf8'),
      readOptional(this.registryPath), readOptional(this.scriptPath),
    ])
    const app = parseConfig(appText); const profile = parseConfig(profileText)
    if (app.operationMode !== 'standard') throw new Error('目前接入支持 Clash Party 标准模式。请勿在应用过程中切换模式。')
    if (app.core && app.core !== 'mihomo') throw new Error('当前接入仅验证了 Mihomo 稳定内核，请先使用稳定内核。')
    if (typeof profile.current !== 'string' || !/^[\w-]+$/.test(profile.current)) throw new Error('当前订阅标识无效。')
    const workDir = app.diffWorkDir === true ? path.join(this.root, 'work', profile.current) : path.join(this.root, 'work')
    const workPath = path.join(workDir, 'config.yaml')
    const workText = await fs.readFile(workPath, 'utf8')
    if (script !== null && !script.startsWith(scriptHeader)) throw new Error('AppRoute 覆写文件名已被占用，已停止覆盖。')
    return { appText, profileText, profileId: profile.current as string, registry, script, workDir, workPath, workText, config: parseConfig(workText) }
  }
  async register(snapshot: Awaited<ReturnType<ClashPartyConfiguration['snapshot']>>) {
    const doc = YAML.parseDocument(snapshot.registry ?? 'items: []\n')
    if (doc.errors.length) throw new Error('覆写登记格式错误。')
    const items = doc.get('items')
    if (!YAML.isSeq(items)) throw new Error('覆写登记格式不受支持。')
    const existing = items.items.find(item => YAML.isMap(item) && item.get('id') === ownerId)
    if (existing) {
      if (!YAML.isMap(existing) || existing.get('ext') !== 'js' || existing.get('type') !== 'local' || existing.get('global') !== true) throw new Error('AppRoute 覆写登记被更改，请在 Clash Party 中恢复其全局本地脚本设置。')
      return
    }
    items.add(doc.createNode({ id: ownerId, name: 'AppRoute 应用分流（可独立恢复）', type: 'local', ext: 'js', global: true, updated: Date.now() }))
    await writeIfUnchanged(this.registryPath, snapshot.registry, doc.toString())
  }
  async assertSnapshot(snapshot: Awaited<ReturnType<ClashPartyConfiguration['snapshot']>>) {
    const latest = await this.snapshot()
    for (const key of ['appText', 'profileText', 'workText', 'script', 'registry'] as const) {
      if (latest[key] !== snapshot[key]) throw new Error('Clash Party 配置发生变化，请刷新后重新应用。')
    }
  }
}

export async function findInstalledCore(): Promise<string> {
  const command = "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $r=@('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); Get-ItemProperty $r -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -eq 'Clash Party'} | Select-Object -ExpandProperty DisplayIcon | ConvertTo-Json -Compress"
  const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 8000, encoding: 'utf8' })
  const item = JSON.parse(stdout.trim())
  if (typeof item !== 'string') throw new Error('无法唯一定位 Clash Party 安装目录。')
  const exe = item.replace(/,\s*-?\d+$/, '').replace(/^"|"$/g, '')
  if (path.basename(exe).toLowerCase() !== 'clash party.exe') throw new Error('Clash Party 安装路径不受支持。')
  const core = path.join(path.dirname(exe), 'resources', 'sidecar', 'mihomo.exe')
  await fs.access(core)
  return core
}

export async function validateWithCore(core: string, file: string, workDir: string): Promise<void> {
  try { await promisify(execFile)(core, ['-t', '-f', file, '-d', workDir], { windowsHide: true, timeout: 20000, maxBuffer: 2 * 1024 * 1024 }) }
  catch { throw new Error('Mihomo 未通过候选配置校验，已保留原配置。') }
}
