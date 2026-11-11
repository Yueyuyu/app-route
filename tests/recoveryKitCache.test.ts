import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { installRecoveryKit } from '../src/main/recovery/recoveryKit.ts'
import { atomicWrite } from '../src/main/storage/localState.ts'

test('只复用完整且未变化的离线工具，入口丢失和源代码更新都重新安装验证', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-kit-cache-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'test-source.cjs'), shortcut = path.join(root, 'test-shortcut')
  await atomicWrite(source, '// isolated recovery fixture')
  let shortcutsCreated = 0
  const createShortcut = async (folder: string) => { shortcutsCreated++; await atomicWrite(shortcut, folder); return shortcut }
  const folder = await installRecoveryKit(root, source, createShortcut)
  const before = (await fs.stat(path.join(folder, 'recovery.cjs'))).mtimeMs
  await installRecoveryKit(root, source, createShortcut)
  assert.equal(shortcutsCreated, 1)
  assert.equal((await fs.stat(path.join(folder, 'recovery.cjs'))).mtimeMs, before)
  await fs.rm(path.join(folder, 'Restore-Network.cmd'))
  await installRecoveryKit(root, source, createShortcut)
  assert.equal(shortcutsCreated, 2)
  assert.match(await fs.readFile(path.join(folder, 'Restore-Network.cmd'), 'utf8'), /recovery\.cjs/)
  await atomicWrite(source, '// updated recovery fixture')
  await installRecoveryKit(root, source, createShortcut)
  assert.equal(await fs.readFile(path.join(folder, 'recovery.cjs'), 'utf8'), '// updated recovery fixture')
  await fs.rm(shortcut)
  await installRecoveryKit(root, source, createShortcut)
  assert.equal(shortcutsCreated, 4)
})
