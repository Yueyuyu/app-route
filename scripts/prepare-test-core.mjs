import fs from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

// 仅供隔离 CI 验收，不分发此内核，也不替换用户的 Clash Party。
if (!process.env.CI || !process.env.GITHUB_ENV) throw new Error('此准备脚本只用于 GitHub CI。')
const assets = {
  'win32-x64': ['mihomo-windows-amd64-v1.19.32.zip', '1ac84e795b5b915446e20139677fb6cc013a0778e876e8d4c96f994750b4c4a3'],
  'darwin-arm64': ['mihomo-darwin-arm64-v1.19.32.gz', '3312a6780652c622890fd4357c6a853bbf865464fd047ac7b7f52dab8de18652'],
  'darwin-x64': ['mihomo-darwin-amd64-v1.19.32.gz', 'b7de9fc46af2ca985ecfb302a6362170e04ff2023dee1e82addc54133e669bc9'],
}
const [name, hash] = assets[`${process.platform}-${process.arch}`] ?? []
if (!name) throw new Error('Unsupported CI platform')
const response = await fetch(`https://github.com/MetaCubeX/mihomo/releases/download/v1.19.32/${name}`, { signal: AbortSignal.timeout(120000) })
if (!response.ok) throw new Error(`Core download failed: ${response.status}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('Core checksum mismatch')
const folder = path.resolve('.runtime/test-core'); await fs.mkdir(folder, { recursive: true })
let core
if (process.platform === 'win32') {
  const archive = path.join(folder, name); await fs.writeFile(archive, bytes)
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Expand-Archive -LiteralPath $env:APPROUTE_TEST_ARCHIVE -DestinationPath $env:APPROUTE_TEST_DIRECTORY -Force"], { env: { ...process.env, APPROUTE_TEST_ARCHIVE: archive, APPROUTE_TEST_DIRECTORY: folder }, windowsHide: true })
  const files = (await fs.readdir(folder)).filter(file => file.endsWith('.exe'))
  if (files.length !== 1) throw new Error('Ambiguous test core')
  core = path.join(folder, files[0])
} else { core = path.join(folder, 'mihomo'); await fs.writeFile(core, gunzipSync(bytes), { mode: 0o700 }) }
await fs.appendFile(process.env.GITHUB_ENV, `APPROUTE_TEST_CORE=${core}\n`)
