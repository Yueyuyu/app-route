/** 与客户端品牌、代理端口和界面框架无关的应用草稿。 */
export type RouteMode = 'rule' | 'direct' | 'proxy'
export type ApplicationSource = 'example' | 'scan' | 'manual'

export interface Application {
  id: string
  name: string
  processes: string[]
  category: string
  mode: RouteMode
  source: ApplicationSource
  icon?: string
  path?: string
  processPaths?: string[]
  processWarnings?: string[]
  publisher?: string
  discoveredAt?: string
  discovery?: 'installed' | 'running'
  iconMethod?: import('./applicationIcon.ts').LocalIconMethod
}

export interface ApplicationScanResult {
  applications: Application[]
  scannedAt: string
  warnings?: string[]
}
