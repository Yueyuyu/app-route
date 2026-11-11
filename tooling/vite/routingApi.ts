import type { Connect, Plugin } from 'vite'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { fileURLToPath } from 'node:url'
import { RoutingService } from '../../src/main/services/routingService.ts'
import { previewPort } from './applicationScanner.ts'

async function readBody(request: IncomingMessage): Promise<any> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 128 * 1024) throw new Error('请求过大。')
    chunks.push(Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

export function createRoutingApi(service: RoutingService): Connect.NextHandleFunction {
  const session = randomBytes(32).toString('hex')
  return async (request, response, next) => {
    const route = request.url?.split('?')[0]
    if (!route?.startsWith('/api/integration/')) return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    const host = request.headers.host ?? ''
    const origin = request.headers.origin
    const local = [`127.0.0.1:${previewPort}`, `localhost:${previewPort}`].includes(host) && request.headers['x-approute-ui'] === '1' && (!origin || origin === `http://${host}`)
    const supplied = request.headers['x-approute-session']
    const authorized = typeof supplied === 'string' && /^[a-f0-9]{64}$/.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(session))
    if (!local || (request.method === 'POST' && (!authorized || origin !== `http://${host}`))) {
      response.statusCode = 403; response.end(JSON.stringify({ error: '请求来源或会话无效，请刷新 AppRoute 页面。' })); return
    }
    try {
      let result: unknown
      if (request.method === 'GET' && route === '/api/integration/session') result = { session }
      else if (request.method === 'GET' && route === '/api/integration/status') result = await service.status()
      else if (request.method === 'POST') {
        if (request.headers['content-type'] !== 'application/json') throw new Error('请求格式无效。')
        const body = await readBody(request)
        if (route === '/api/integration/apply-automatic') result = await service.applyAutomatically(body)
        else if (route === '/api/integration/proxy-group') result = await service.setProxyGroup(body)
        else if (route === '/api/integration/proxy-strategy') result = await service.setProxyStrategy(body)
        else if (route === '/api/integration/apply') result = await service.apply(body)
        else if (route === '/api/integration/confirm') result = await service.confirm(body.id)
        else if (route === '/api/integration/rollback') result = await service.rollback(body.id)
        else if (route === '/api/integration/recover') result = await service.recoverAll()
        else if (route === '/api/integration/diagnose') result = await service.diagnose()
        else { response.statusCode = 404; result = { error: '未知操作。' } }
      } else { response.statusCode = 405; result = { error: '不支持的请求方法。' } }
      response.end(JSON.stringify(result))
    } catch (error) {
      response.statusCode = 400
      // 仅展示业务错误；底层文件异常可能包含个人路径，统一收敛。
      const text = error instanceof Error && !(error as NodeJS.ErrnoException).code ? error.message : '本机操作失败，请运行离线恢复工具或查看本机配置。'
      response.end(JSON.stringify({ error: text }))
    }
  }
}

export function routingApi(): Plugin {
  const service = new RoutingService({ kitBundle: fileURLToPath(new URL('../../.runtime/recovery.cjs', import.meta.url)) })
  return { name: 'approute-routing-api', configureServer(server) { server.middlewares.use(createRoutingApi(service)) }, configurePreviewServer(server) { server.middlewares.use(createRoutingApi(service)) } }
}
