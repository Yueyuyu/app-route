import { randomUUID } from 'node:crypto'
import type { TemporaryRoutingRequest } from '../../shared/temporaryRouting.ts'
import { temporaryDurations } from '../../shared/temporaryRouting.ts'
import { processPathKey } from '../../shared/applicationIdentity.ts'
import type { RoutingService } from './routingService.ts'

/** 期限与恢复目标保存在分流事务内；页面不能提供旧选择或直接写定时记录。 */
export class TemporaryRoutingService {
  readonly routing: RoutingService
  readonly now: () => number
  readonly durationMs?: number
  private lastAttemptedId?: string
  constructor(routing: RoutingService, now = Date.now, durationMs?: number) { this.routing = routing; this.now = now; this.durationMs = durationMs }
  async apply(request: TemporaryRoutingRequest) {
    if (!temporaryDurations.includes(request?.minutes as 15) || !request.application?.path || !['direct', 'proxy'].includes(request.application.mode)) throw new Error('请选择应用、临时联网方式和有效时长。')
    const state = await this.routing.state(), app = request.application, previous = state.managed.find(item => item.id === app.id)
    if (previous && (!previous.processPaths?.length || processPathKey(previous.processPaths[0]) !== processPathKey(app.path!))) throw new Error('主程序身份已改变，请重新扫描应用。')
    const target = app.mode === 'proxy' ? state.proxyGroup : undefined
    if (app.mode === 'proxy' && !target) throw new Error('请先绑定代理组。')
    const temporary = { id: randomUUID(), expiresAt: new Date(this.now() + (this.durationMs ?? request.minutes * 60000)).toISOString(), previous: previous?.temporary?.previous ?? { mode: previous?.mode ?? 'rule' as const, target: previous?.target,
      ...(previous?.mode === 'proxy' ? { missingTargetAction: previous.missingTargetAction ?? state.missingTargetAction ?? 'original' } : {}) } }
    return this.routing.applyAutomatically({ revision: request.revision, applications: [app], target }, 'temporary', { temporary: { applicationId: app.id, value: temporary } })
  }
  async end(request: { revision: string; applicationId: string; id: string }, expiredOnly = false) {
    const state = await this.routing.state(), app = state.managed.find(item => item.id === request.applicationId)
    if (state.revision !== request.revision || !app?.temporary || app.temporary.id !== request.id) throw new Error('临时设置已变化，请刷新后重试。')
    if (expiredOnly && Date.parse(app.temporary.expiresAt) > this.now()) throw new Error('临时设置尚未到期。')
    const previous = app.temporary.previous
    return this.routing.applyAutomatically({ revision: state.revision, target: previous.target, applications: [{ id: app.id, name: app.name, path: app.processPaths![0], processes: app.processes, mode: previous.mode, source: 'manual', category: '已管理应用' }] }, 'expiry', { expiring: { applicationId: app.id, id: request.id } })
  }
  async expireDue() {
    const state = await this.routing.state()
    if (state.pendingId) return false
    const due = state.managed.filter(item => item.temporary && Date.parse(item.temporary.expiresAt) <= this.now())
    // 每轮只处理一个应用，失败后轮到下一项，避免失效程序挡住其余已到期任务。
    const app = due[(due.findIndex(item => item.id === this.lastAttemptedId) + 1) % due.length]
    if (!app?.temporary) return false
    this.lastAttemptedId = app.id
    const result = await this.end({ revision: state.revision, applicationId: app.id, id: app.temporary.id }, true)
    return result.outcome === 'applied'
  }
}
