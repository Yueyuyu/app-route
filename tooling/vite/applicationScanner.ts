import type { Connect, Plugin } from 'vite'
import { runningApplications } from '../../src/main/platform/windows/runningApplications.ts'
import { scanApplications } from '../../src/main/platform/windows/scanApplications.ts'

export const previewPort = 4318

export function createScanMiddleware(scan = scanApplications, platform = process.platform): Connect.NextHandleFunction {
  return async (request, response, next) => {
    const route = request.url?.split('?')[0]
    if (!['/api/applications', '/api/applications/running'].includes(route ?? '')) return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    const host = request.headers.host ?? ''
    const origin = request.headers.origin
    if (request.method !== 'GET' || ![`127.0.0.1:${previewPort}`, `localhost:${previewPort}`].includes(host) ||
        request.headers['x-approute-ui'] !== '1' || (origin && origin !== `http://${host}`)) {
      response.statusCode = 403
      response.end(JSON.stringify({ error: '只允许本机界面发起扫描。' }))
      return
    }
    if (platform !== 'win32') {
      response.statusCode = 501
      response.end(JSON.stringify({ error: '扫描应用需要在 Windows 本机运行，可先使用手动添加。' }))
      return
    }
    try {
      const result = route === '/api/applications/running' ? await runningApplications() : await scan()
      response.end(JSON.stringify(result))
    } catch {
      response.statusCode = 500
      response.end(JSON.stringify({ error: '暂时无法完成扫描。请稍后重试，或手动添加应用。' }))
    }
  }
}

/** 仅用于开发预览，桌面版将以 preload + IPC 替换 HTTP 桥接。 */
export function applicationScanner(): Plugin {
  return { name: 'approute-local-application-scanner',
    configureServer: (server) => { server.middlewares.use(createScanMiddleware()) },
    configurePreviewServer: (server) => { server.middlewares.use(createScanMiddleware()) },
  }
}
