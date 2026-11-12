import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncBuiltinESMExports } from 'node:module'
import net from 'node:net'
import tls from 'node:tls'
import http from 'node:http'
import https from 'node:https'
import childProcess from 'node:child_process'

// 合作式测试防误访问边界，不是运行不可信 PR 的操作系统沙箱。
export function installFixtureBoundary(root) {
  if (!path.isAbsolute(root)) throw new Error('测试边界需要绝对目录')
  const realpath = fs.realpathSync.bind(fs), exists = fs.existsSync.bind(fs), append = fs.appendFileSync.bind(fs)
  const canonical = realpath(root), restores = []
  function inside(value) {
    if (typeof value === 'number') return true // 文件描述符必须从受检查的 open 获得。
    const resolved = path.resolve(value instanceof URL ? fileURLToPath(value) : String(value))
    let parent = resolved
    while (!exists(parent) && path.dirname(parent) !== parent) parent = path.dirname(parent)
    const target = path.resolve(realpath(parent), path.relative(parent, resolved))
    const relative = path.relative(canonical, target)
    return !relative.startsWith('..') && !path.isAbsolute(relative)
  }
  function deny(operation) {
    append(path.join(canonical, 'boundary-violations.jsonl'), JSON.stringify({ operation }) + '\n')
    const error = new Error(`隔离夹具禁止：${operation}`); error.code = 'APPROUTE_TEST_BOUNDARY'; throw error
  }
  function patch(object, name, replacement) {
    const old = object[name]
    object[name] = replacement(old)
    restores.push(() => { object[name] = old })
  }
  const one = ['readFile', 'writeFile', 'appendFile', 'open', 'readdir', 'stat', 'lstat', 'access', 'mkdir', 'rm', 'rmdir', 'unlink', 'readlink', 'realpath', 'chmod', 'truncate', 'createReadStream', 'createWriteStream', 'exists']
  const two = ['rename', 'copyFile', 'cp', 'link', 'symlink']
  for (const [names, indices] of [[one, [0]], [two, [0, 1]]]) for (const name of names) {
    for (const [object, key] of [[fs, name], [fs, name + 'Sync'], [fs.promises, name]]) {
      if (typeof object[key] !== 'function') continue
      patch(object, key, original => function (...args) {
        if (indices.some(index => !inside(args[index]))) deny('filesystem.' + key)
        return original.apply(this, args)
      })
    }
  }
  for (const [object, names] of [[net, ['connect', 'createConnection']], [tls, ['connect']], [http, ['request', 'get']], [https, ['request', 'get']], [childProcess, ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']]]) {
    for (const name of names) patch(object, name, () => () => deny('process-or-network.' + name))
  }
  patch(globalThis, 'fetch', () => async () => deny('network.fetch'))
  syncBuiltinESMExports()
  return () => { for (const restore of restores.reverse()) restore(); syncBuiltinESMExports() }
}
