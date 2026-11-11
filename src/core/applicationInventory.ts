import type { Application } from '../shared/application.ts'
import type { IntegrationStatus, ManagedApplication } from '../shared/integration.ts'

/** 迁移只保留真实应用资料；历史示例和未应用的草稿选项绝不重放到网络。 */
export function migrateInventory(value: unknown): Application[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { applications?: unknown }).applications)) return []
  return (value as { applications: Application[] }).applications.filter(app => app && ['scan', 'manual'].includes(app.source) && typeof app.id === 'string' && typeof app.name === 'string' && Array.isArray(app.processes) && app.processes.every(p => typeof p === 'string'))
    .map(app => ({ ...app, mode: 'rule', processPaths: undefined, processWarnings: undefined }))
}
export function managedFor(app: Application, managed: ManagedApplication[] = []) {
  return managed.find(item => item.id === app.id || Boolean(app.path && item.processPaths?.some(p => p.toLowerCase() === app.path!.toLowerCase())))
}
export function inventoryWithRouting(inventory: Application[], status?: IntegrationStatus): Application[] {
  const byId = new Map<string, { application: Application; priority: number }>()
  for (const app of inventory) {
    const managed = managedFor(app, status?.managed)
    const application = { ...app, mode: managed?.mode ?? 'rule', ...(managed ? { id: managed.id, processes: managed.processes, processPaths: managed.processPaths, processWarnings: managed.processWarnings } : {}) } as Application
    // 主程序及辅助程序可能各有开始菜单入口；同一分流记录只占一行，优先保留主程序资料。
    const priority = managed ? app.id === managed.id ? 2 : app.path?.toLowerCase() === managed.processPaths?.[0]?.toLowerCase() ? 1 : 0 : 0
    const existing = byId.get(application.id)
    if (!existing || priority > existing.priority) byId.set(application.id, { application, priority })
  }
  const applications = [...byId.values()].map(item => item.application)
  for (const managed of status?.managed ?? []) if (!applications.some(app => app.id === managed.id)) applications.push({ ...managed, source: 'manual', category: '已管理应用', path: managed.processPaths?.[0] })
  return applications
}
export function routingPresentation(app: Application, status?: IntegrationStatus): { label: string; detail: string; color: string } {
  if (!status?.connected) return { label: '尚未确认', detail: '等待连接 Clash Party，未修改联网方式。', color: 'default' }
  if (status.untrackedRuleCount) return { label: '状态待核对', detail: '内核存在历史 AppRoute 规则，但缺少管理记录，无法确认该应用的当前分流。请查看连接详情。', color: 'warning' }
  const managed = managedFor(app, status.managed)
  if (!managed) return { label: '沿用原有规则', detail: '没有 AppRoute 专属规则。', color: 'default' }
  if (!status.rulesLoaded) return { label: '规则异常', detail: '运行规则与保存的设置不一致，请检查或恢复。', color: 'error' }
  if (status.pending) return { label: '自动检查中', detail: '独立恢复守护已启动，检查失败会自动恢复。', color: 'processing' }
  if (status.uncoveredProcesses?.some(item => item.applicationId === managed.id)) return { label: '发现新的辅助进程', detail: '正在核对进程归属并补充规则；未识别的流量暂时沿用原有规则。', color: 'warning' }
  const outlet = managed.mode === 'proxy' ? status.outlets?.[managed.target ?? ''] : undefined
  if (outlet?.kind === 'direct') return { label: '代理组当前直连', detail: '跟随组当前选择了 DIRECT，并未经过远端代理节点。', color: 'warning' }
  if (outlet?.kind === 'reject' || outlet?.kind === 'missing' || outlet?.kind === 'unknown' || outlet?.health === 'unhealthy') return { label: '代理组待检查', detail: '当前出口不可用或尚未确认，请检查 Clash Party 的组内选择或网络自检。', color: 'warning' }
  const evidence = status.evidence.filter(item => item.applicationId === managed.id)
  if (evidence.some(item => !item.matched)) return { label: '连接不符合设置', detail: '已观察到不符合当前规则的新连接，请检查或恢复。', color: 'error' }
  if (evidence.length && evidence.every(item => item.usesCurrentNode === false)) return { label: '等待新节点连接', detail: '当前观察到的连接仍用其他节点；已有连接不会强制断开，新建连接交给组当前选择。', color: 'warning' }
  if (evidence.length) return { label: '已验证新连接', detail: `已验证 ${[...new Set(evidence.map(item => item.process))].join('、')} 的 ${evidence.length} 条新连接；其余进程仍待观测。`, color: 'success' }
  return { label: '规则已加载', detail: '规则已写入并在内核加载。等待应用建立新连接后再验证实际出口；现有连接不会自动切换。', color: 'blue' }
}
