import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { PNG } from 'pngjs'
import { atomicWrite, digest, readOptional, withLock } from '../storage/localState.ts'
import { scanApplications } from '../platform/windows/scanApplications.ts'
import { catalogIconUrl, fallbackIconUrl, matchApplicationIcon, matchLocalApplicationIcon } from '../../core/applicationIcons.ts'
import { validProcessName } from '../../core/applicationRules.ts'
import type { Application, ApplicationScanResult } from '../../shared/application.ts'
import type { ApplicationIconState, ApplicationIconView, LocalIconMethod } from '../../shared/applicationIcon.ts'

interface StoredImage { hash: string; width: number; height: number; updatedAt: string; method?: LocalIconMethod; contrastAdjusted?: boolean }
interface IconRecord {
  key: string; applicationId: string; name: string; processes: string[]; category: string; publisher?: string
  origin: Application['source']; available: boolean; automatic?: StoredImage; custom?: StoredImage; extractionFailed?: boolean
}
interface IconIndex { version: 1; applications: IconRecord[]; scannedAt?: string; scanWarnings: string[] }
const emptyIndex = (): IconIndex => ({ version: 1, applications: [], scanWarnings: [] })
const validKey = (key: unknown): key is string => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key)
const keyFor = (id: string) => digest(id.toLowerCase())

/** 解码并重新编码 PNG，拒绝伪装文件、空透明图和超限像素，不保存上传文件的附加元数据。 */
export function normalizeIconPng(data: unknown, ensureContrast = false): { bytes: Buffer; width: number; height: number; contrastAdjusted: boolean } {
  if (typeof data !== 'string' || data.length > 700000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('请使用不超过 512 KB 的 PNG 图片。')
  const bytes = Buffer.from(data.slice('data:image/png;base64,'.length), 'base64')
  if (bytes.length < 33 || bytes.length > 512 * 1024 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('图片不是有效的 PNG。')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  if (width < 1 || height < 1 || width > 512 || height > 512) throw new Error('图片尺寸不能超过 512 × 512。')
  // pngjs 的非交错解码有输出上限；浏览器导出的缩略图也采用此格式。
  if (bytes[28] !== 0) throw new Error('请使用非交错 PNG，或在页面中重新选择图片。')
  let offset = 8, ended = false
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8)
    if (offset + length + 12 > bytes.length || (offset === 8 && (type !== 'IHDR' || length !== 13)) || (offset !== 8 && type === 'IHDR')) throw new Error('PNG 数据结构无效。')
    offset += length + 12
    if (type === 'IEND') { ended = length === 0 && offset === bytes.length; break }
  }
  if (!ended) throw new Error('PNG 数据不完整。')
  let png: PNG
  try { png = PNG.sync.read(bytes, { checkCRC: true }) } catch { throw new Error('图片内容损坏，无法读取。') }
  if (!png.data.some((value, index) => index % 4 === 3 && value > 0)) throw new Error('图片完全透明，请选择有可见内容的图标。')
  let visible = 0, light = 0, transparent = 0
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] < 32) transparent++
    else { visible++; if (Math.min(png.data[i], png.data[i + 1], png.data[i + 2]) > 220) light++ }
  }
  // 商店应用常提供白色透明图形；中性底色保留原图形，避免白底页面看似空图。
  const contrastAdjusted = ensureContrast && visible > 0 && light / visible > 0.95 && transparent / (width * height) > 0.05
  if (contrastAdjusted) for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3] / 255
    for (let channel = 0; channel < 3; channel++) png.data[i + channel] = Math.round(png.data[i + channel] * alpha + [74, 92, 119][channel] * (1 - alpha))
    png.data[i + 3] = 255
  }
  return { bytes: PNG.sync.write(png), width, height, contrastAdjusted }
}

function validateApplication(value: unknown): asserts value is Application {
  const app = value as Application | undefined
  if (!app || typeof app.id !== 'string' || !app.id || app.id.length > 2048 || typeof app.name !== 'string' || !app.name.trim() || app.name.length > 256 ||
    !Array.isArray(app.processes) || !app.processes.length || app.processes.length > 32 || !app.processes.every(p => typeof p === 'string' && validProcessName(p))) throw new Error('应用标识无效。')
}

export class ApplicationIconService {
  readonly root: string
  private scan: () => Promise<ApplicationScanResult>
  private pendingScan?: Promise<ApplicationScanResult>
  constructor(options: { root?: string; scan?: () => Promise<ApplicationScanResult> } = {}) {
    this.root = options.root ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'AppRoute', 'icons')
    this.scan = options.scan ?? scanApplications
  }

  private async readIndex(): Promise<IconIndex> {
    const text = await readOptional(path.join(this.root, 'index.json'))
    if (!text) return emptyIndex()
    try {
      const index = JSON.parse(text) as IconIndex
      if (index.version !== 1 || !Array.isArray(index.applications) || !Array.isArray(index.scanWarnings)) throw new Error()
      for (const entry of index.applications) {
        validateApplication({ ...entry, id: entry.applicationId })
        if (!validKey(entry.key) || entry.key !== keyFor(entry.applicationId) || !['scan', 'example', 'manual'].includes(entry.origin)) throw new Error()
        for (const image of [entry.automatic, entry.custom]) if (image && !validKey(image.hash)) throw new Error()
      }
      return index
    } catch { throw new Error('图标索引无法读取，请保留本机 icons 目录以便恢复。') }
  }

  private async save(index: IconIndex) { await atomicWrite(path.join(this.root, 'index.json'), JSON.stringify(index, null, 2)) }
  private async store(data: unknown, directory: 'cache' | 'custom', method?: LocalIconMethod): Promise<StoredImage> {
    const image = normalizeIconPng(data, directory === 'cache' && method === 'package'), hash = digest(image.bytes)
    await atomicWrite(path.join(this.root, directory, `${hash}.png`), image.bytes)
    return { hash, width: image.width, height: image.height, method, contrastAdjusted: image.contrastAdjusted, updatedAt: new Date().toISOString() }
  }

  async image(directory: string, hash: string): Promise<Buffer> {
    if (!['cache', 'custom'].includes(directory) || !validKey(hash)) throw new Error('无效图标标识。')
    const bytes = await fs.readFile(path.join(this.root, directory, `${hash}.png`))
    if (digest(bytes) !== hash) throw new Error('图标缓存损坏。')
    return bytes
  }

  private async view(entry: IconRecord): Promise<ApplicationIconView> {
    const common = { key: entry.key, applicationId: entry.applicationId, name: entry.name, processes: entry.processes, category: entry.category,
      origin: entry.origin, available: entry.available, hasCustom: !!entry.custom }
    let cacheFailed = false
    for (const [image, directory, source] of [[entry.custom, 'custom', 'custom'], [entry.automatic, 'cache', 'local']] as const) {
      if (!image) continue
      try { await this.image(directory, image.hash) } catch { cacheFailed = true; continue }
      const lowResolution = Math.min(image.width, image.height) < 24
      return { ...common, icon: `/api/icons/image/${directory}/${image.hash}.png`, source, method: image.method, width: image.width, height: image.height, updatedAt: image.updatedAt,
        needsAttention: cacheFailed || lowResolution || (source === 'local' && !!entry.extractionFailed),
        detail: cacheFailed ? '优先图标缓存损坏，已回退' : lowResolution ? '分辨率较低，可手动替换' : source === 'local' && entry.extractionFailed ? '本次提取失败，保留上次缓存' : source === 'custom' ? '使用你指定的图片' : image.contrastAdjusted ? '浅色图形已补充对比底色' : '已解码并检查本机图标' }
    }
    const builtin = matchApplicationIcon(entry)
    return { ...common, icon: builtin ? catalogIconUrl(builtin.id) : fallbackIconUrl(entry.category), source: builtin ? 'builtin' : 'fallback',
      needsAttention: cacheFailed || !builtin, detail: cacheFailed ? '缓存损坏，可重新检查或替换' : builtin ? '使用随软件附带的公共图标' : '尚未找到专属图标，请补充' }
  }

  async state(): Promise<ApplicationIconState> {
    const index = await this.readIndex()
    return { applications: await Promise.all(index.applications.map(entry => {
      if (entry.origin === 'scan' || entry.automatic || entry.custom) return this.view(entry)
      const candidate = matchLocalApplicationIcon(entry, index.applications.filter(other => other.origin === 'scan' && other.available && other.automatic))
      return this.view(candidate ? { ...entry, automatic: candidate.automatic, extractionFailed: candidate.extractionFailed } : entry)
    })), scannedAt: index.scannedAt, scanWarnings: index.scanWarnings }
  }

  /** 登记草稿只接收身份和旧图片，不依据界面传来的路径访问文件。 */
  async register(applications: unknown): Promise<ApplicationIconState> {
    if (!Array.isArray(applications) || applications.length > 2000) throw new Error('应用列表无效。')
    applications.forEach(validateApplication)
    await withLock(this.root, async () => {
      const index = await this.readIndex()
      for (const app of applications as Application[]) {
        const key = keyFor(app.id)
        let entry = index.applications.find(item => item.key === key)
        if (!entry) {
          entry = { key, applicationId: app.id, name: app.name, processes: app.processes, category: typeof app.category === 'string' ? app.category.slice(0, 80) : '', origin: app.source === 'example' ? 'example' : 'manual', available: true }
          index.applications.push(entry)
        } else if (entry.origin !== 'scan') { entry.name = app.name; entry.processes = app.processes; entry.category = typeof app.category === 'string' ? app.category.slice(0, 80) : '' }
        if (!entry.automatic && typeof app.icon === 'string' && app.icon.startsWith('data:image/png;base64,')) {
          try { entry.automatic = await this.store(app.icon, 'cache', 'legacy') } catch { entry.extractionFailed = true }
        }
      }
      await this.save(index)
    })
    return this.state()
  }

  scanApplications(): Promise<ApplicationScanResult> {
    this.pendingScan ??= this.scanAndCache().finally(() => { this.pendingScan = undefined })
    return this.pendingScan
  }
  private async scanAndCache(): Promise<ApplicationScanResult> {
    const result = await this.scan()
    result.applications.forEach(validateApplication)
    await withLock(this.root, async () => {
      const index = await this.readIndex()
      for (const entry of index.applications) if (entry.origin === 'scan') entry.available = false
      for (const app of result.applications) {
        const key = keyFor(app.id), old = index.applications.find(entry => entry.key === key)
        const builtin = matchApplicationIcon(app)
        const entry: IconRecord = { ...old, key, applicationId: app.id, name: app.name, processes: app.processes, publisher: app.publisher,
          category: app.category || builtin?.category || '其他应用', origin: 'scan', available: true }
        try { entry.automatic = await this.store(app.icon, 'cache', app.iconMethod); entry.extractionFailed = false }
        catch { entry.extractionFailed = true }
        if (old) index.applications[index.applications.indexOf(old)] = entry
        else index.applications.push(entry)
      }
      index.scannedAt = result.scannedAt; index.scanWarnings = result.warnings ?? []
      await this.save(index)
    })
    const state = await this.state(), byId = new Map(state.applications.map(app => [app.applicationId, app]))
    return { ...result, applications: result.applications.map(app => ({ ...app, icon: byId.get(app.id)?.icon })) }
  }

  async replace(key: unknown, data: unknown): Promise<ApplicationIconState> {
    if (!validKey(key)) throw new Error('无效应用标识。')
    await withLock(this.root, async () => {
      const index = await this.readIndex(), entry = index.applications.find(app => app.key === key)
      if (!entry) throw new Error('应用不存在，请刷新列表。')
      entry.custom = await this.store(data, 'custom'); await this.save(index)
    })
    return this.state()
  }
  async reset(key: unknown): Promise<ApplicationIconState> {
    if (!validKey(key)) throw new Error('无效应用标识。')
    await withLock(this.root, async () => {
      const index = await this.readIndex(), entry = index.applications.find(app => app.key === key)
      if (!entry) throw new Error('应用不存在，请刷新列表。')
      delete entry.custom; await this.save(index)
    })
    return this.state()
  }
}
