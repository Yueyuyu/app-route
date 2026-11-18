import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { updateInstallation, launchWindowsUpdate } from '../src/main/desktop/windowsUpdate.ts'

test('自动升级只开放给 Windows NSIS 安装版，不把开发目录或 Mac 当作自动安装', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-install-kind-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const exe = path.join(root, 'AppRoute.exe')
  assert.equal(await updateInstallation('win32', true, exe), 'manual')
  await fs.writeFile(path.join(root, 'Uninstall AppRoute.exe'), 'fixture')
  assert.equal(await updateInstallation('win32', true, exe), 'automatic')
  assert.equal(await updateInstallation('win32', false, exe), 'manual')
  assert.equal(await updateInstallation('darwin', true, exe), 'manual')
  assert.equal(await updateInstallation('win32', true, path.join(root, 'other.exe')), 'manual')
})
test('安装器只用固定 NSIS 参数启动，启动失败不报告已启动', async () => {
  let calls = 0, released = false
  await launchWindowsUpdate('fixture only.exe', (file, args, options) => {
    calls++; assert.equal(file, 'fixture only.exe'); assert.deepEqual(args, ['/S', '--updated', '--force-run'])
    assert.equal(options.shell, false); assert.equal(options.windowsHide, true)
    assert.equal(options.env?.NODE_OPTIONS, undefined)
    const child = new EventEmitter() as ChildProcess
    child.unref = () => { released = true }
    queueMicrotask(() => child.emit('spawn'))
    return child
  })
  assert.equal(calls, 1); assert.equal(released, true)
  await assert.rejects(launchWindowsUpdate('fixture only.exe', () => {
    const child = new EventEmitter() as ChildProcess
    queueMicrotask(() => child.emit('error', new Error('local private path')))
    return child
  }), /安装器未能启动/)
})
