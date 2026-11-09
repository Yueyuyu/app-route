import { build } from 'rolldown'
import fs from 'node:fs/promises'
const yamlLicense = await fs.readFile('node_modules/yaml/LICENSE', 'utf8')
await build({ input: 'src/main/recovery/cli.ts', platform: 'node', external: [/^node:/], output: { file: '.runtime/recovery.cjs', format: 'cjs', codeSplitting: false, banner: `/* Bundled YAML dependency — ISC license\n${yamlLicense.replaceAll('*/', '* /')}\n*/` } })
console.log('已构建独立恢复工具（包含 YAML 依赖）。')
