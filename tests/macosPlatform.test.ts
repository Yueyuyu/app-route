import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import { validProcessPath, identifyProcessFamily } from '../src/core/processFamily.ts'
import { managedApplications, managedProcessMatches, ruleStrings, assertNoSystemHostRouting } from '../src/core/managedRouting.ts'
import { parseRoutingState } from '../src/main/storage/routingStateStore.ts'
import { parseMacProcesses, readMacApplication, resolveMacProcessFamily, runningMacApplications } from '../src/main/platform/macos/applications.ts'
import { discoverMacSocket, MihomoRuntime } from '../src/main/adapters/mihomoRuntime.ts'
import type { Application } from '../src/shared/application.ts'

const primary = '/Applications/Example Music.app/Contents/MacOS/Example Music'
const helper = '/Applications/Example Music.app/Contents/Frameworks/Helper.app/Contents/MacOS/Helper'
const app: Application = { id: 'mac-example', name: 'Example Music', processes: ['Example Music'], path: primary, source: 'scan', category: '', mode: 'direct' }
test('Mac 精确路径保留大小写、包内辅助进程和管理记录可往返', () => {
  const family = identifyProcessFamily(app, [{ pid: 1, parentPid: 0, path: primary }, { pid: 2, parentPid: 1, path: helper }, { pid: 3, parentPid: 1, path: '/Applications/Other.app/Contents/MacOS/Other' }])
  assert.deepEqual(family.processPaths, [primary, helper])
  const managed = managedApplications([family])
  assert.equal(ruleStrings(managed)[0], `PROCESS-PATH,${primary},DIRECT`)
  assert.equal(managedProcessMatches(managed[0], { processPath: primary.toLowerCase() }), false)
  assert.equal(managedProcessMatches(managed[0], { processPath: helper }), true)
  assert.deepEqual(parseRoutingState(JSON.stringify({ revision: 'test', managed })).managed, managed)
  for (const bad of ['/usr/bin/node', '/Applications/One.app/Contents/../Other', '/Applications/A,B.app/Contents/MacOS/A', '/Applications/A.app/Contents/MacOS/']) assert.equal(validProcessPath(bad), false)
  assert.throws(() => managedApplications([{ ...app, path: '/Applications/AppRoute.app/Contents/MacOS/Helper', processes: ['Helper'], processPaths: ['/Applications/AppRoute.app/Contents/MacOS/Helper'] }]))
  assert.throws(() => assertNoSystemHostRouting([{ ...app, processes: ['Finder'] }]))
  assert.deepEqual(parseMacProcesses(` 12 1 ${primary}\n 13 12 ${helper}\n 14 1 /usr/bin/node\n`), [{ pid: 12, parentPid: 1, path: primary }, { pid: 13, parentPid: 12, path: helper }])
})

test('Mac 原生读取应用包、观察进程并拒绝包外链接', { skip: process.platform !== 'darwin' }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-mac-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const bundle = path.join(root, 'Example.app'), executable = path.join(bundle, 'Contents/MacOS/Example')
  await fs.mkdir(path.dirname(executable), { recursive: true })
  await fs.copyFile('/bin/sleep', executable); await fs.chmod(executable, 0o700)
  await fs.writeFile(path.join(bundle, 'Contents/Info.plist'), '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>Example</string><key>CFBundleName</key><string>Example</string></dict></plist>')
  const scanned = await readMacApplication(bundle)
  assert.equal(scanned.name, 'Example'); assert.equal(scanned.path, await fs.realpath(executable))
  const child = spawn(executable, ['30'], { stdio: 'ignore' })
  t.after(() => { child.kill() })
  await wait(150)
  assert.ok((await runningMacApplications()).some(p => p.pid === child.pid && p.path === scanned.path), 'ps 应识别真实启动的应用身份')
  const family = await resolveMacProcessFamily({ ...scanned, mode: 'direct' })
  assert.deepEqual(family.processPaths, [scanned.path])
  await fs.rm(executable); await fs.symlink('/bin/sleep', executable)
  await assert.rejects(readMacApplication(bundle), /超出/)
})

test('Mac Unix socket 控制接口只连接唯一活动的当前用户实例', { skip: process.platform !== 'darwin' }, async t => {
  const root = await fs.mkdtemp('/tmp/apr-socket-')
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const socket = `${root}/mihomo-party-${process.getuid!()}-1.sock`
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(req.url === '/version' ? { version: 'test' } : { connections: null })) })
  await new Promise<void>(resolve => server.listen(socket, resolve))
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())))
  await fs.writeFile(`${root}/mihomo-party-${process.getuid!()}-2.sock`, 'not a socket')
  assert.equal(await discoverMacSocket(root), socket)
  assert.deepEqual(await new MihomoRuntime(socket).connections(), { connections: [] })
})
