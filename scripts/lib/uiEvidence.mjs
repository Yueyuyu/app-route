import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export const uiSuites = ['localization', 'settings', 'startup']
const hash = value => createHash('sha256').update(value).digest('hex')
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

// 内容摘要包括未暂存、未跟踪源码；提交 SHA 不能代表脏工作树的实际测试内容。
export async function sourceSnapshot(root = process.cwd()) {
  const files = [...new Set(git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))].sort()
  const digest = createHash('sha256')
  for (const file of files) {
    digest.update(file + '\0')
    digest.update(await fs.readFile(path.join(root, file)).catch(error => { if (error.code === 'ENOENT') return '<deleted>'; throw error }))
    digest.update('\0')
  }
  return { revision: git(root, 'rev-parse', 'HEAD'), indexTree: git(root, 'write-tree'), sourceDigest: digest.digest('hex'), dirty: Boolean(git(root, 'status', '--porcelain')) }
}

function suiteDirectory(root, suite) {
  if (!uiSuites.includes(suite)) throw new Error('未知 UI 验收套件')
  return path.join(path.resolve(root), 'output', 'playwright', suite)
}

function pngInfo(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length < 24) throw new Error('截图不是有效 PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: hash(bytes) }
}

export async function startUiEvidence(suite, root = process.cwd()) {
  const directory = suiteDirectory(root, suite), source = await sourceSnapshot(root)
  // 新一轮开始即撤下旧汇总；本轮失败时不能继续展示上一轮的成功报告。
  for (const file of ['index.html', 'verification.json']) await fs.rm(path.join(path.resolve(root), 'output/ui-review', file), { force: true })
  // 只清理白名单套件自己的生成目录，防止上一次成功结果混入本次失败。
  await fs.rm(directory, { recursive: true, force: true })
  await fs.mkdir(directory, { recursive: true })
  const record = { version: 1, suite, source, platform: process.platform, startedAt: new Date().toISOString(), status: 'running', screenshots: [] }
  await fs.writeFile(path.join(directory, 'evidence.json'), JSON.stringify(record, null, 2))
  return async passed => {
    const current = await sourceSnapshot(root)
    const unchanged = current.sourceDigest === source.sourceDigest
    record.status = passed && unchanged ? 'passed' : 'failed'
    record.finishedAt = new Date().toISOString()
    for (const file of (await fs.readdir(directory)).filter(file => file.endsWith('.png')).sort()) {
      record.screenshots.push({ file, locale: file.match(/^(zh-CN|en|ja|fr)-/)?.[1] || 'zh-CN', ...pngInfo(await fs.readFile(path.join(directory, file))) })
    }
    await fs.writeFile(path.join(directory, 'evidence.json'), JSON.stringify(record, null, 2))
    if (!unchanged) throw new Error('UI 验收期间源码变化，请重新运行')
  }
}

export async function readUiEvidence(root, suite, expected) {
  const directory = suiteDirectory(root, suite)
  const evidence = JSON.parse(await fs.readFile(path.join(directory, 'evidence.json'), 'utf8'))
  if (evidence.version !== 1 || evidence.suite !== suite || evidence.status !== 'passed' || evidence.source.sourceDigest !== expected.sourceDigest || evidence.source.revision !== expected.revision) throw new Error(`${suite}: 缺少当前版本的完整成功证据`)
  const verification = JSON.parse(await fs.readFile(path.join(directory, 'verification.json'), 'utf8'))
  if (verification.errors?.length || !evidence.screenshots.length) throw new Error(`${suite}: 验收错误或缺少截图`)
  for (const item of evidence.screenshots) {
    if (!/^[\w.-]+\.png$/.test(item.file)) throw new Error('截图路径无效')
    const actual = pngInfo(await fs.readFile(path.join(directory, item.file)))
    if (actual.sha256 !== item.sha256 || actual.width !== item.width || actual.height !== item.height) throw new Error(`${suite}: 截图与验收记录不一致`)
  }
  return { ...evidence, verification }
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
export function renderUiReport(suites, source) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AppRoute 界面验收</title>
<style>body{margin:0;background:#f4f7fc;color:#26364d;font:15px/1.6 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:32px}h1{margin:0}small{color:#60748d}header,section{background:white;border:1px solid #dde5ef;border-radius:14px;padding:24px;margin-bottom:20px}code{overflow-wrap:anywhere}summary{cursor:pointer;font-weight:600;padding:12px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}figure{margin:0;border:1px solid #e1e8f1;border-radius:10px;overflow:hidden}img{width:100%;height:auto;display:block}figcaption{padding:12px}a{color:#1762dc}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}</style>
<main><header><h1>AppRoute 界面验收</h1><p>源码 <code>${escape(source.revision)}</code> · ${source.dirty ? '本地未提交快照' : '已提交快照'}</p><small>真实桌面界面，虚构应用和代理数据。功能检查通过；视觉效果仍需人工复核。截图尺寸是内容视口，不代表原生窗口大小。本报告不代表真实代理或安装验收。</small><details><summary>查看内容摘要</summary><code>${escape(source.sourceDigest)}</code></details></header>
${suites.map(suite => `<section><h2>${escape(suite.suite)} · ${escape(suite.platform)}</h2><p>${escape(suite.finishedAt)} · ${suite.screenshots.length} 张截图</p><details><summary>操作与断言记录</summary><pre>${escape(JSON.stringify(suite.verification, null, 2))}</pre></details>
${['zh-CN', 'en', 'ja', 'fr'].map(locale => {
    const images = suite.screenshots.filter(item => item.locale === locale)
    return images.length ? `<details ${locale === 'zh-CN' ? 'open' : ''}><summary>${escape(locale)} · ${images.length} 张</summary><div class="grid">${images.map(item => {
      const url = `../playwright/${suite.suite}/${encodeURIComponent(item.file)}`
      return `<figure><a href="${url}"><img loading="lazy" src="${url}" alt="${escape(item.file)}"></a><figcaption>${escape(item.file)}<br><small>${item.width} × ${item.height} · 点击查看原图</small></figcaption></figure>`
    }).join('')}</div></details>` : ''
  }).join('')}</section>`).join('')}</main></html>`
}
