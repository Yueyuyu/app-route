import type { Connect, Plugin } from 'vite'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { ApplicationIconService } from '../../src/main/services/applicationIconService.ts'
import { createScanMiddleware, previewPort } from './applicationScanner.ts'

export function createIconMiddleware(service: ApplicationIconService): Connect.NextHandleFunction {
  const session = randomBytes(32).toString('hex')
  return async (request, response, next) => {
    const route = request.url?.split('?')[0]
    if (!route?.startsWith('/api/icons/')) return next()
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    const host = request.headers.host ?? '', origin = request.headers.origin
    const localHost = [`127.0.0.1:${previewPort}`, `localhost:${previewPort}`].includes(host)
    const local = localHost && (!origin || origin === `http://${host}`) && request.headers['sec-fetch-site'] !== 'cross-site'
    const isImage = route.startsWith('/api/icons/image/')
    const pageImage = isImage && request.method === 'GET' && typeof request.headers.referer === 'string' && request.headers.referer.startsWith(`http://${host}/`)
    const supplied = request.headers['x-approute-session']
    const authorized = typeof supplied === 'string' && /^[a-f0-9]{64}$/.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(session))
    if (!local || (!pageImage && request.headers['x-approute-ui'] !== '1') || (request.method === 'POST' && (!authorized || origin !== `http://${host}`))) {
      response.statusCode = 403; response.end(JSON.stringify({ error: '请求来源或会话无效，请刷新页面。' })); return
    }
    try {
      if (isImage) {
        const match = /^\/api\/icons\/image\/(cache|custom)\/([a-f0-9]{64})\.png$/.exec(route)
        if (!match || request.method !== 'GET') { response.statusCode = 404; response.end(); return }
        const image = await service.image(match[1], match[2])
        response.setHeader('Content-Type', 'image/png'); response.end(image); return
      }
      let result: unknown
      if (request.method === 'GET' && route === '/api/icons/session') result = { session }
      else if (request.method === 'GET' && route === '/api/icons/state') result = await service.state()
      else if (request.method === 'POST') {
        if (request.headers['content-type'] !== 'application/json') throw new Error('请求格式无效。')
        let size = 0; const chunks: Buffer[] = []
        for await (const chunk of request) {
          size += chunk.length
          if (size > 4 * 1024 * 1024) throw new Error('请求过大，请分批操作。')
          chunks.push(Buffer.from(chunk))
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        if (route === '/api/icons/scan') { await service.scanApplications(); result = await service.state() }
        else if (route === '/api/icons/register') result = await service.register(body.applications)
        else if (route === '/api/icons/replace') result = await service.replace(body.key, body.data)
        else if (route === '/api/icons/reset') result = await service.reset(body.key)
        else { response.statusCode = 404; result = { error: '未知图标操作。' } }
      } else { response.statusCode = 405; result = { error: '不支持的请求方法。' } }
      response.end(JSON.stringify(result))
    } catch (error) {
      response.statusCode = isImage ? 404 : 400
      // 不回显 JSON 片段、路径或底层文件异常。
      const safe = error instanceof Error && !(error as NodeJS.ErrnoException).code && !(error instanceof SyntaxError) && /^[\u4e00-\u9fff]/.test(error.message)
      response.end(JSON.stringify({ error: safe ? error.message : '图标操作失败，请稍后重试。' }))
    }
  }
}

export function applicationIcons(): Plugin {
  const service = new ApplicationIconService()
  const install = (server: { middlewares: { use: (handler: Connect.NextHandleFunction) => unknown } }) => {
    server.middlewares.use(createIconMiddleware(service))
    server.middlewares.use(createScanMiddleware(() => service.scanApplications()))
  }
  return { name: 'approute-application-icons', configureServer: install, configurePreviewServer: install }
}
