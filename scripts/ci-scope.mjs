import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { ciScope } from './lib/ci-scope.ts'

const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trimEnd()
const sha = value => { if (!/^[a-f0-9]{40}$/.test(value ?? '')) throw new Error('Invalid change boundary'); return value }
const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
let files = []
if (!manual) {
  const head = sha(event.pull_request?.head.sha ?? event.after)
  const before = sha(event.pull_request?.base.sha ?? event.before)
  // 不依赖 GitHub 的 300 文件路径过滤上限；PR 对比共同祖先，push 覆盖整批提交。
  const base = event.pull_request ? git(['merge-base', before, head]) : before
  files = (base === '0'.repeat(40) ? git(['ls-tree', '-rz', '--name-only', head]) : git(['diff', '--no-renames', '--name-only', '-z', base, head, '--'])).split('\0').filter(Boolean)
}
const scope = ciScope(files, manual)
await fs.appendFile(process.env.GITHUB_OUTPUT, Object.entries(scope).map(([name, enabled]) => `${name}=${enabled}\n`).join(''))
await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `变更文件：${files.length}；手动全量：${manual}\n\n| 检查 | 执行 |\n| --- | --- |\n${Object.entries(scope).map(([name, enabled]) => `| ${name} | ${enabled ? '是' : '跳过'} |`).join('\n')}\n\n安装打包仅由“发布前完整验收”手动触发。\n`)
console.log(JSON.stringify({ changedFiles: files.length, ...scope }))
