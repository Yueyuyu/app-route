export type UpdateChannel = 'stable' | 'preview'
export type UpdateInstallation = 'automatic' | 'manual'
export interface UpdateDownload {
  phase: 'idle' | 'preparing' | 'downloading' | 'verifying' | 'ready' | 'installing' | 'cancelled' | 'error'
  version?: string; channel?: UpdateChannel; received: number; total: number; installation: UpdateInstallation; message?: string
}
export interface ReleasedPackage {
  version: string; publishedAt: string; notes: string
  releaseUrl: string; assetName: string; downloadUrl: string; sha256: string; size: number
}
export interface UpdateCheck {
  channel: UpdateChannel; checkedAt: string; currentVersion: string
  state: 'available' | 'current' | 'no-release' | 'unsupported' | 'unavailable'
  release?: ReleasedPackage
  reason?: 'network' | 'rate-limit' | 'missing-package'
}
export interface UpgradeVerification {
  state: 'none' | 'pending' | 'preserved' | 'changed' | 'unavailable'
  targetVersion?: string; checkedAt?: string; backupId?: string; changedCount?: number
  rules?: 'loaded' | 'waiting' | 'issue'
}
