import fs from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

/** 只继承启动运行时所需变量；代理、令牌、NODE_OPTIONS 和真实用户目录均不进入测试进程。 */
export function sandboxEnvironment(root, original = process.env) {
  const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'SYSTEMDRIVE', 'LANG', 'LC_ALL', 'DISPLAY', 'XAUTHORITY'])
  const env = Object.fromEntries(Object.entries(original).filter(([key, value]) => allowed.has(key.toUpperCase()) && value !== undefined))
  return { ...env, HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home'),
    APPDATA: path.join(root, 'roaming'), LOCALAPPDATA: path.join(root, 'profile'),
    XDG_CONFIG_HOME: path.join(root, 'home', '.config'), XDG_CACHE_HOME: path.join(root, 'cache'),
    TEMP: path.join(root, 'temp'), TMP: path.join(root, 'temp'), TMPDIR: path.join(root, 'temp'),
    APPROUTE_DATA_DIR: path.join(root, 'profile', 'AppRoute'), APPROUTE_TEST_SANDBOX: root }
}

/** 读取目标状态；读失败和超时都失败，不把异常当作状态已达到。 */
export async function waitForState(label, read, accepts, { timeout = 5000, interval = 25 } = {}) {
  const deadline = performance.now() + timeout
  while (true) {
    const state = await read()
    if (accepts(state)) return state
    if (performance.now() >= deadline) throw new Error(`等待状态超时：${label}`)
    await pause(Math.min(interval, Math.max(1, deadline - performance.now())))
  }
}

/** 关闭超时也只清理本次持有的 ChildProcess；超时仍报错，不能算验收通过。 */
export async function closeDesktopProcess(desktop, timeout = 5000) {
  const child = desktop.process()
  let timer
  try {
    await Promise.race([desktop.close(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('测试桌面关闭超时')), timeout)
    })])
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    await waitForState('测试桌面进程退出', () => child.exitCode !== null || child.signalCode !== null, Boolean)
  }
}

export async function createDesktopSandbox(name, { root = process.cwd(), stage = path.join(root, '.runtime/desktop-stage') } = {}) {
  if (!/^[a-z][a-z-]*$/.test(name)) throw new Error('测试夹具名称无效')
  await fs.mkdir(path.join(root, '.runtime'), { recursive: true })
  const fixture = await fs.mkdtemp(path.join(root, '.runtime', `${name}-`))
  const env = sandboxEnvironment(fixture)
  for (const directory of [env.HOME, env.APPDATA, env.LOCALAPPDATA, env.XDG_CONFIG_HOME, env.XDG_CACHE_HOME, env.TEMP, env.APPROUTE_DATA_DIR]) await fs.mkdir(directory, { recursive: true })
  for (const file of ['main.cjs', 'preload.cjs', 'package.json']) await fs.copyFile(path.join(stage, file), path.join(fixture, file))
  await fs.cp(path.join(stage, 'ui'), path.join(fixture, 'ui'), { recursive: true })
  await fs.mkdir(path.join(fixture, 'runtime'))
  await fs.copyFile(process.execPath, path.join(fixture, process.platform === 'win32' ? 'runtime/node.exe' : 'runtime/node'))
  await fs.copyFile(path.join(root, 'tests/fixtures/documentationBackend.mjs'), path.join(fixture, 'backend.mjs'))
  await fs.copyFile(path.join(root, 'scripts/lib/fixtureBoundary.mjs'), path.join(fixture, 'fixtureBoundary.mjs'))
  await fs.copyFile(path.join(root, 'resources/application-icons/catalog.json'), path.join(fixture, 'catalog.json'))
  const desktops = new Set(), rendererViolations = []
  async function launch(electron, executablePath) {
    const desktop = await electron.launch({ executablePath, args: [fixture], env, timeout: 30000 })
    desktops.add(desktop)
    // UI 只加载本地协议。记录被拒绝的请求，即使产品捕获错误也不能让测试误通过。
    await desktop.evaluate(({ session, app }, expected) => {
      if (app.getPath('userData') !== expected) throw new Error('测试 userData 未隔离')
      globalThis.appRouteExternalRequests = []
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
        globalThis.appRouteExternalRequests.push(new URL(details.url).protocol)
        callback({ cancel: true })
      })
    }, path.join(env.APPROUTE_DATA_DIR, 'desktop'))
    return desktop
  }
  async function close(desktop) {
    if (!desktop || !desktops.has(desktop)) return
    rendererViolations.push(...await desktop.evaluate(() => globalThis.appRouteExternalRequests || []).catch(() => []))
    try { await closeDesktopProcess(desktop) } finally {
      desktops.delete(desktop)
    }
  }
  async function dispose() {
    for (const desktop of desktops) await close(desktop)
    // 后台断开 IPC 后写入自己的退出标记；不会按名称结束其他程序。
    const started = path.join(fixture, 'backend-started')
    if (await fs.access(started).then(() => true, () => false)) await waitForState('隔离后台退出', async () => {
      const ids = (await fs.readFile(started, 'utf8')).trim().split('\n')
      return Promise.all(ids.map(id => fs.access(path.join(fixture, `backend-exited-${id}`)).then(() => true, () => false)))
    }, values => values.every(Boolean))
    const violations = await fs.readFile(path.join(fixture, 'boundary-violations.jsonl'), 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error })
    if (violations.trim() || rendererViolations.length) throw new Error('隔离测试发生越界访问，详见本地 boundary-violations.jsonl；不输出真实路径')
  }
  return { fixture, env, launch, close, dispose }
}
