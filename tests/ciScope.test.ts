import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import YAML from 'yaml'
import { ciScope } from '../scripts/lib/ci-scope.ts'

test('纯文档、图片、教程工具改动不触发程序构建，混合提交不能漏检', () => {
  const docs = ['README.md', 'README.en.md', 'AGENTS.md', 'CONTRIBUTING.md', '.github/PULL_REQUEST_TEMPLATE.md', 'docs/guide/zh-CN/install.md', 'docs/images/app.png', 'scripts/check-docs.mjs', 'scripts/lib/release-docs.mjs', 'tests/release-docs.test.mjs']
  assert.deepEqual(ciScope(docs), { program: false, integration: false, ui: false, docs: true })
  assert.deepEqual(ciScope([...docs, 'src/main/services/routingService.ts']), { program: true, integration: true, ui: false, docs: true })
})
test('按前端、内核和共同依赖选择测试，未知路径保守检查', () => {
  assert.deepEqual(ciScope(['src/renderer/App.tsx']), { program: true, integration: false, ui: true, docs: false })
  assert.deepEqual(ciScope(['src/main/recovery/cli.ts']), { program: true, integration: true, ui: false, docs: false })
  for (const file of ['package-lock.json', '.github/workflows/ci.yml', 'src/shared/types.ts', 'scripts/new-tool.mjs']) {
    const result = ciScope([file]); assert.equal(result.program && result.integration && result.ui, true)
  }
  assert.equal(ciScope(['public/brand/app.png']).program, true)
  assert.deepEqual(ciScope([], true), { program: true, integration: true, ui: true, docs: true })
  assert.equal(ciScope([...Array.from({ length: 350 }, (_, i) => `docs/${i}.md`), 'src/core/rules.ts']).integration, true)
})
test('真实 Git 差异识别文档提交，并且重命名程序为文档仍检查程序', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-ci-scope-'))
  const git = (args: string[]) => execFileSync('git', args, { cwd: folder, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  } }).trim()
  try {
    git(['init']); await fs.mkdir(path.join(folder, 'src/core'), { recursive: true })
    await fs.writeFile(path.join(folder, 'src/core/probe.ts'), 'fixture')
    git(['add', '.']); git(['commit', '-m', 'fixture']); const before = git(['rev-parse', 'HEAD'])
    await fs.writeFile(path.join(folder, 'README.md'), 'docs')
    git(['add', '.']); git(['commit', '-m', 'docs']); const docsHead = git(['rev-parse', 'HEAD'])
    const run = async (base: string, head: string) => {
      const event = path.join(folder, 'event.json')
      await fs.writeFile(event, JSON.stringify({ before: base, after: head }))
      return JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/ci-scope.mjs', import.meta.url))], { cwd: folder, encoding: 'utf8', env: {
        ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: path.join(folder, 'outputs'), GITHUB_STEP_SUMMARY: path.join(folder, 'summary'),
      } }))
    }
    assert.equal((await run(before, docsHead)).program, false)
    git(['mv', 'src/core/probe.ts', 'docs.md']); git(['commit', '-m', 'rename'])
    assert.equal((await run(docsHead, git(['rev-parse', 'HEAD']))).integration, true)
  } finally {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(folder))
    assert.match(relative, /^approute-ci-scope-[^/\\]+$/)
    await fs.rm(folder, { recursive: true, force: true })
  }
})
test('工作流只允许手动完整打包，日常检查按范围执行且不能自动发布', async () => {
  const workflow = async (name: string) => YAML.parse(await fs.readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))
  const ci = await workflow('ci'), preview = await workflow('preview'), publish = await workflow('publish-preview')
  assert.deepEqual(Object.keys(preview.on), ['workflow_dispatch'])
  assert.deepEqual(Object.keys(publish.on), ['workflow_dispatch'])
  assert.equal(ci.jobs.check.if, "needs.scope.outputs.program == 'true'")
  assert.equal(ci.jobs.docs.if, "needs.scope.outputs.docs == 'true'")
  assert.ok(!JSON.stringify(ci).includes('installer:build'))
  assert.equal(preview.jobs.desktop.strategy.matrix.include.length, 3)
  for (const command of ['npm run check', 'npm run check:recovery-faults', 'npm run check:i18n', 'npm run installer:build', 'node scripts/verify-packaged.mjs']) {
    assert.ok(preview.jobs.desktop.steps.some((step: { run?: string }) => step.run === command), command)
  }
  assert.ok(preview.jobs.docs.steps.some((step: { run?: string }) => step.run === 'npm run docs:check'))
})
