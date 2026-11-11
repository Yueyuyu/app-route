import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import type { BuildInfo } from '../src/shared/appInfo.ts'

export function readBuildMetadata(root: string): BuildInfo {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  let revision = 'source-archive', dirty = false
  try {
    revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim())
  } catch { /* 源码压缩包没有 Git 元数据，明确显示来源未知。 */ }
  return { version: manifest.version, builtAt: new Date().toISOString(), revision, dirty }
}
