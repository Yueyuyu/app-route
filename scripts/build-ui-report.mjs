import fs from 'node:fs/promises'
import path from 'node:path'
import { sourceSnapshot, readUiEvidence, renderUiReport, uiSuites } from './lib/uiEvidence.mjs'

const root = process.cwd(), source = await sourceSnapshot(root)
const suites = await Promise.all(uiSuites.map(suite => readUiEvidence(root, suite, source)))
const output = path.join(root, 'output/ui-review')
await fs.mkdir(output, { recursive: true })
await fs.writeFile(path.join(output, 'index.html'), renderUiReport(suites, source))
await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ source, suites: suites.map(({ verification, ...metadata }) => metadata), limits: 'synthetic data; visual review pending; no live routing or installation verification' }, null, 2))
const screenshots = suites.reduce((count, suite) => count + suite.screenshots.length, 0)
console.log(`UI 验收报告已生成：${screenshots} 张当前源码截图，output/ui-review/index.html`)
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### 界面验收预览\n\n源码：\`${source.revision}\`；${screenshots} 张截图（简中、英、日、法）。\n\n下载本次 checks 或 verification 产物，解压后打开 \`ui-review/index.html\`。截图只使用隔离演示数据，仍需人工视觉复核。\n`)
