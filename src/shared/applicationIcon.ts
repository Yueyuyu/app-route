export type ApplicationIconSource = 'local' | 'builtin' | 'custom' | 'fallback'
export type LocalIconMethod = 'executable' | 'shortcut' | 'registry' | 'package' | 'bundle' | 'legacy'

export interface ApplicationIconView {
  key: string
  applicationId: string
  name: string
  processes: string[]
  category: string
  origin: 'scan' | 'manual' | 'example'
  available: boolean
  icon: string
  source: ApplicationIconSource
  method?: LocalIconMethod
  hasCustom: boolean
  needsAttention: boolean
  detail: string
  width?: number
  height?: number
  updatedAt?: string
}

export interface ApplicationIconState {
  applications: ApplicationIconView[]
  scannedAt?: string
  scanWarnings: string[]
}

export const iconSourceLabels: Record<ApplicationIconSource, string> = {
  local: '本机提取', builtin: '公共图标库', custom: '用户替换', fallback: '默认图标',
}
