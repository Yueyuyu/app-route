import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { build, Platform, Arch } from 'electron-builder'
import { buildDmgWithRetry } from './lib/dmg-retry.ts'

// 安装器只包含已验证的桌面产物，用户数据始终留在独立的 LOCALAPPDATA/AppRoute。
const root = process.cwd()
const mac = process.platform === 'darwin'
const prepackaged = path.join(root, 'release', `AppRoute-${process.platform}-${process.arch}`)
await fs.access(path.join(prepackaged, mac ? 'AppRoute.app' : 'AppRoute.exe'))
const options = { projectDir: root, prepackaged, config: path.join(root, 'electron-builder.yml'), publish: 'never' }
const report = { platform: process.platform, arch: process.arch, dmgAttempts: 0, busyDetachRetried: false, completed: false }
const files = []
try {
  if (mac) {
    const arch = process.arch === 'arm64' ? Arch.arm64 : Arch.x64
    // ZIP 与 DMG 顺序生成，降低同一 app bundle 上的磁盘争用；只对已知 detach 错误重试 DMG。
    files.push(...await build({ ...options, targets: Platform.MAC.createTarget('zip', arch) }))
    files.push(...await buildDmgWithRetry(() => {
      report.dmgAttempts++
      return build({ ...options, targets: Platform.MAC.createTarget('dmg', arch) })
    }, {
      ci: process.env.GITHUB_ACTIONS === 'true',
      onRetry: error => {
        report.busyDetachRetried = true
        console.error('DMG detach 被临时占用，5 秒后仅重建一次 DMG；再次失败将停止。', error)
      },
    }))
  } else files.push(...await build({ ...options, targets: Platform.WINDOWS.createTarget('nsis', Arch.x64) }))
  report.completed = true
} finally {
  await fs.mkdir(path.join(root, 'output'), { recursive: true })
  await fs.writeFile(path.join(root, 'output/installer-build-check.json'), JSON.stringify(report, null, 2))
}
for (const file of files.filter(file => /\.(exe|dmg|zip)$/.test(file))) {
  const hash = createHash('sha256').update(await fs.readFile(file)).digest('hex')
  await fs.writeFile(file + '.sha256', `${hash}  ${path.basename(file)}\n`)
  console.log(`已构建未签名预览版安装器：${file}\nSHA256 ${hash}`)
}
