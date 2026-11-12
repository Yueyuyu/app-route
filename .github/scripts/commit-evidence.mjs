import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// 旧提交没有这套格式；只约束启用后的后继提交，不改写历史。
const enabledAfter = '98485f58a452dfe34afcad989aa1501ebce55072'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trimEnd()
export function validateBody(message) {
  if (!/^(?:feat|fix|docs|test|perf|refactor|build|ci|chore|revert)(?:\([\w/-]+\))?: .+/u.test(message)) throw new Error('提交标题需要 type: 描述')
  for (const field of ['变更', '验证', '未验证']) {
    const value = message.match(new RegExp(`^${field}：([^\n]+)`, 'm'))?.[1]?.trim()
    if (!value || /^(?:待填|TODO|已测试|\.\.\.|…|<.*>)$/i.test(value)) throw new Error(`提交正文缺少具体的“${field}：”记录`)
  }
}
export function attachEvidence(message, receipt, tree) {
  validateBody(message)
  if (receipt?.version !== 1 || receipt.tree !== tree || !receipt.checks?.length) throw new Error('提交记录没有匹配当前 Git 树的门禁证据')
  const clean = message.replace(/^Verified-(?:tree|checks):.*\r?\n?/gm, '').trimEnd()
  return `${clean}\n\nVerified-tree: ${tree}\nVerified-checks: ${receipt.checks.map(command => command.join(' ')).join('; ')}\n`
}
export function validateEvidence(message, tree) {
  validateBody(message)
  const trees = [...message.matchAll(/^Verified-tree: ([a-f0-9]{40})$/gm)]
  if (trees.length !== 1 || trees[0][1] !== tree) throw new Error('提交正文的 Verified-tree 与实际提交内容不一致')
  if (!/^Verified-checks: .+/m.test(message)) throw new Error('提交正文缺少门禁命令')
}
function checkCommit(commit) {
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', enabledAfter, commit])
  if (ancestry.status === 1 || commit === enabledAfter) return
  if (ancestry.status !== 0) throw new Error('无法核对提交格式启用边界')
  validateEvidence(git('show', '-s', '--format=%B', commit), git('rev-parse', `${commit}^{tree}`))
}
function main() {
  const [action, file] = process.argv.slice(2)
  if (action === 'prepare') {
    const tree = git('write-tree')
    const receipt = JSON.parse(fs.readFileSync(git('rev-parse', '--git-path', `preflight/${tree}.json`), 'utf8'))
    fs.writeFileSync(file, attachEvidence(fs.readFileSync(file, 'utf8'), receipt, tree))
  } else if (action === 'ci') {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
    const head = event.pull_request?.head.sha || event.after || process.env.GITHUB_SHA
    const base = event.pull_request?.base.sha || event.before || enabledAfter
    if (![head, base].every(sha => /^[a-f0-9]{40}$/.test(sha))) throw new Error('提交范围无效')
    const from = /^0+$/.test(base) ? enabledAfter : base
    for (const commit of git('rev-list', '--no-merges', `${from}..${head}`).split('\n').filter(Boolean)) checkCommit(commit)
    console.log('本批提交的验收正文与 Git 树一致。')
  } else if (action === 'check') {
    checkCommit(git('rev-parse', file || 'HEAD'))
  } else throw new Error('用法：commit-evidence.mjs prepare <消息文件> | ci | check <提交>')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(`验收记录未通过：${error.message}`); process.exitCode = 1 }
}
