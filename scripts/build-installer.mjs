import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { build, Platform, Arch } from 'electron-builder'

// 安装器只包含已验证的桌面产物，用户数据始终留在独立的 LOCALAPPDATA/AppRoute。
const root = process.cwd()
const mac = process.platform === 'darwin'
const prepackaged = path.join(root, 'release', `AppRoute-${process.platform}-${process.arch}`)
await fs.access(path.join(prepackaged, mac ? 'AppRoute.app' : 'AppRoute.exe'))
const files = await build({ projectDir: root, prepackaged, targets: mac ? Platform.MAC.createTarget(['dmg', 'zip'], process.arch === 'arm64' ? Arch.arm64 : Arch.x64) : Platform.WINDOWS.createTarget('nsis', Arch.x64), config: path.join(root, 'electron-builder.yml'), publish: 'never' })
for (const file of files.filter(file => /\.(exe|dmg|zip)$/.test(file))) {
  const hash = createHash('sha256').update(await fs.readFile(file)).digest('hex')
  await fs.writeFile(file + '.sha256', `${hash}  ${path.basename(file)}\n`)
  console.log(`已构建未签名预览版安装器：${file}\nSHA256 ${hash}`)
}
