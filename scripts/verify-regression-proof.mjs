import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { regressionCases, breakOnce, verifyTestResult } from './lib/regressionProof.mjs'
import { sandboxEnvironment } from './lib/testSandbox.mjs'

const root = process.cwd(), output = path.join(root, 'output/regression-proof')
await fs.mkdir(output, { recursive: true }); await fs.mkdir(path.join(root, '.runtime'), { recursive: true })
const fixture = await fs.mkdtemp(path.join(root, '.runtime', 'regression-proof-'))
const env = sandboxEnvironment(fixture)
for (const name of ['src', 'tests']) await fs.cp(path.join(root, name), path.join(fixture, name), { recursive: true })
await fs.copyFile(path.join(root, 'package.json'), path.join(fixture, 'package.json'))
for (const value of [env.HOME, env.TEMP, env.APPROUTE_DATA_DIR]) await fs.mkdir(value, { recursive: true })
const originals = new Map(), results = []
for (const scenario of regressionCases) originals.set(scenario.file, await fs.readFile(path.join(root, scenario.file), 'utf8'))
try {
  for (const scenario of regressionCases) {
    const file = path.join(fixture, scenario.file), original = originals.get(scenario.file)
    const run = async phase => {
      const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', `--test-name-pattern=^${scenario.name}$`, scenario.test], { cwd: fixture, env, encoding: 'utf8', timeout: 60000 })
      await fs.writeFile(path.join(output, `${scenario.id}-${phase}.log`), result.stdout + result.stderr)
      verifyTestResult(result, scenario, phase === 'broken')
    }
    await run('normal')
    await fs.writeFile(file, breakOnce(original, scenario))
    try { await run('broken') } finally { await fs.writeFile(file, original) }
    await run('restored')
    results.push({ id: scenario.id, test: scenario.test, name: scenario.name, normal: 'pass', broken: 'assertion-failure', restored: 'pass', sourceHash: createHash('sha256').update(original).digest('hex') })
    console.log(`${scenario.id}: 正常通过 → 受控破坏被断言捕获 → 恢复通过`)
  }
} finally {
  // 只删除已知夹具内目录；不恢复或覆盖用户工作树。
  const relative = path.relative(path.join(root, '.runtime'), fixture)
  if (!relative.startsWith('regression-proof-') || relative.includes(path.sep)) throw new Error('拒绝清理不属于本次测试的目录')
  await fs.rm(fixture, { recursive: true, force: true })
  for (const [file, original] of originals) if (await fs.readFile(path.join(root, file), 'utf8') !== original) throw new Error('验证期间源码发生变化，请重新运行')
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ revision: git('rev-parse', 'HEAD'), indexTree: git('write-tree'), type: 'controlled mutations, not a historical-bug claim', results }, null, 2))
