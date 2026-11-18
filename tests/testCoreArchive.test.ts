import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
// @ts-expect-error CI 脚本使用原生 ESM，测试直接调用实际脚本实现。
import { extractWindowsTestCore } from '../scripts/lib/testCoreArchive.mjs'

test('Windows 测试内核解压不受父进程归档模块污染，拒绝多程序压缩包', { skip: process.platform !== 'win32' }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-core-archive-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const modules = path.join(root, 'modules'), module = path.join(modules, 'Microsoft.PowerShell.Archive')
  await fs.mkdir(module, { recursive: true })
  await fs.writeFile(path.join(module, 'Microsoft.PowerShell.Archive.psm1'), "function Expand-Archive { throw 'Incompatible parent archive module' }; Export-ModuleMember -Function Expand-Archive")
  const inherited = { ...process.env, PSModulePath: modules }
  const legacy = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference='Stop'; Expand-Archive ignored.zip"], { env: inherited, encoding: 'utf8', windowsHide: true })
  assert.notEqual(legacy.status, 0, '旧式自动加载确实受继承模块影响')
  assert.match(legacy.stderr, /Incompatible parent archive module/)
  const archive = path.join(root, 'core.zip')
  for (const count of [1, 2]) {
    await fs.rm(archive, { force: true })
    const create = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[IO.Compression.ZipFile]::Open($env:APPROUTE_TEST_ARCHIVE,'Create'); try { " +
      `1..${count} | ForEach-Object { $entry=$zip.CreateEntry(\"nested/core$_.exe\"); $writer=[IO.StreamWriter]::new($entry.Open()); try { $writer.Write('fixture-core') } finally { $writer.Dispose() } } } finally { $zip.Dispose() }`
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', create], { env: { ...process.env, PSModulePath: undefined, APPROUTE_TEST_ARCHIVE: archive }, windowsHide: true })
    if (count === 2) assert.throws(() => extractWindowsTestCore(archive, root, inherited), /Expected exactly one/)
    else {
      const file = extractWindowsTestCore(archive, root, inherited)
      assert.equal(file, path.join(root, 'mihomo.exe'))
      assert.equal(await fs.readFile(file, 'utf8'), 'fixture-core')
      assert.equal(await fs.stat(path.join(root, 'nested')).then(() => true, () => false), false, '压缩包路径不能决定输出位置')
    }
  }
})
