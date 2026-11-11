import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

export const digest = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')
/** 缓存只复用已验证且未变化的本机文件；丢失、替换或修改都使缓存失效。 */
export async function fileStamp(files: string[]): Promise<string | undefined> {
  try { return JSON.stringify(await Promise.all(files.map(async file => {
    const stat = await fs.stat(file)
    return [file, stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs]
  }))) } catch { return undefined }
}
export async function readOptional(file: string): Promise<string | null> {
  try { return await fs.readFile(file, 'utf8') } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
}
export async function atomicWrite(file: string, content: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temp = `${file}.${randomUUID()}.tmp`
  const handle = await fs.open(temp, 'wx', 0o600)
  try { await handle.writeFile(content); await handle.sync() } finally { await handle.close() }
  try { await fs.rename(temp, file) } catch (e) { await fs.rm(temp, { force: true }); throw e }
}
export async function writeIfUnchanged(file: string, expected: string | null, content: string): Promise<void> {
  if (await readOptional(file) !== expected) throw new Error('配置已被其他程序修改，请刷新后重试。')
  await atomicWrite(file, content)
}

/** 页面、守护进程和离线恢复共享锁；崩溃后只清理已确认进程不存在的旧锁。 */
export async function withLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  await fs.mkdir(root, { recursive: true })
  const lock = path.join(root, 'operation.lock')
  for (let attempt = 0; attempt < 60; attempt++) {
    let handle
    try { handle = await fs.open(lock, 'wx', 0o600) } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      const text = await readOptional(lock)
      try {
        const pid = JSON.parse(text ?? '{}').pid
        if (Number.isInteger(pid) && pid > 0) {
          try { process.kill(pid, 0) } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ESRCH' && await readOptional(lock) === text) await fs.rm(lock, { force: true })
          }
        } else if (!text?.trim()) {
          // 写入 PID 前崩溃会留下空锁；只清理超过一分钟且内容未变化的空锁。
          const stat = await fs.stat(lock)
          if (Date.now() - stat.mtimeMs > 60000 && await readOptional(lock) === text) await fs.rm(lock, { force: true })
        }
      } catch { /* 不删除无法确认归属的锁。 */ }
      await new Promise(resolve => setTimeout(resolve, 250)); continue
    }
    try { await handle.writeFile(JSON.stringify({ pid: process.pid })); return await action() }
    finally { await handle.close(); await fs.rm(lock, { force: true }) }
  }
  throw new Error('另一个应用或恢复操作仍在运行，请稍后重试。')
}
