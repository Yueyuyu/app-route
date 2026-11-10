import fs from 'node:fs/promises'
import path from 'node:path'
import { build } from 'rolldown'
import { packager } from '@electron/packager'

const root = process.cwd()
const stage = path.join(root, '.runtime', 'desktop-stage')
const output = path.join(root, 'release')
const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
if (process.platform !== 'win32' || !process.version.startsWith('v24.')) throw new Error('桌面打包需要 Windows 和 Node.js 24。')
await fs.mkdir(stage, { recursive: true })
await build({ input: 'src/main/desktop/main.ts', platform: 'node', external: ['electron', /^node:/], output: { file: path.join(stage, 'main.cjs'), format: 'cjs', codeSplitting: false } })
await build({ input: 'src/preload/index.ts', platform: 'node', external: ['electron'], output: { file: path.join(stage, 'preload.cjs'), format: 'cjs', codeSplitting: false } })
await build({ input: 'src/main/desktop/backend.ts', platform: 'node', external: [/^node:/], output: { file: path.join(stage, 'backend.mjs'), format: 'esm', codeSplitting: false } })
await fs.cp(path.join(root, 'dist'), path.join(stage, 'ui'), { recursive: true })
await fs.mkdir(path.join(stage, 'windows'), { recursive: true })
for (const file of ['scan-applications.ps1', 'extract-application-icon.ps1']) await fs.copyFile(path.join(root, 'src/main/platform/windows', file), path.join(stage, 'windows', file))
await fs.copyFile(path.join(root, '.runtime', 'recovery.cjs'), path.join(stage, 'recovery.cjs'))
await fs.mkdir(path.join(stage, 'runtime'), { recursive: true })
await fs.copyFile(process.execPath, path.join(stage, 'runtime', 'node.exe'))
const nodeLicense = path.join(path.dirname(process.execPath), 'LICENSE')
await fs.copyFile(nodeLicense, path.join(stage, 'runtime', 'LICENSE-Node.txt'))
await fs.mkdir(path.join(stage, 'licenses'), { recursive: true })
for (const [name, file] of [['yaml', 'LICENSE'], ['pngjs', 'LICENSE'], ['react', 'LICENSE'], ['react-dom', 'LICENSE'], ['antd', 'LICENSE'], ['@ant-design/icons', 'LICENSE']]) {
  await fs.copyFile(path.join(root, 'node_modules', name, file), path.join(stage, 'licenses', `${name.replaceAll('/', '-')}.txt`))
}
await fs.copyFile(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'))
await fs.copyFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(stage, 'THIRD_PARTY_NOTICES.md'))
await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: 'app-route', productName: 'AppRoute', version: manifest.version, main: 'main.cjs', private: true, author: 'AppRoute contributors', license: 'MIT' }, null, 2))
if (!process.argv.includes('--stage-only')) {
  // 只输出到仓库 release 目录；不清理已安装应用或用户数据。
  const paths = await packager({ dir: stage, out: output, name: 'AppRoute', executableName: 'AppRoute', platform: 'win32', arch: 'x64',
    electronVersion: manifest.devDependencies.electron, icon: path.join(root, 'public', 'favicon.ico'), asar: false, prune: false, overwrite: true,
    win32metadata: { CompanyName: 'AppRoute contributors', FileDescription: 'AppRoute 应用分流', ProductName: 'AppRoute', OriginalFilename: 'AppRoute.exe' } })
  console.log(`桌面应用已打包：${paths[0]}`)
} else console.log('桌面资源已构建。')
