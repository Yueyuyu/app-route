import type { ConnectionEvidence, ConnectionObservation } from '../shared/integration.ts'

/** 统计使用全部连接；明细按应用轮流取样，繁忙应用不能挤掉其他应用的状态或异常。 */
export function sampleConnectionEvidence(evidence: ConnectionEvidence[], observedAt: string) {
  const groups = new Map<string, ConnectionEvidence[]>()
  for (const item of evidence) {
    if (!groups.has(item.applicationId)) groups.set(item.applicationId, [])
    groups.get(item.applicationId)!.push(item)
  }
  const observations: Record<string, ConnectionObservation> = {}
  const samples: ConnectionEvidence[][] = []
  for (const [id, items] of groups) {
    items.sort((a, b) => Number(a.matched) - Number(b.matched) || Date.parse(b.startedAt) - Date.parse(a.startedAt))
    observations[id] = { observedAt, connectionCount: items.length, matchedCount: items.filter(item => item.matched).length,
      processes: [...new Set(items.map(item => item.process))], latestStartedAt: items.reduce((time, item) => Date.parse(item.startedAt) > Date.parse(time) ? item.startedAt : time, items[0].startedAt),
      allUseOldNode: items.every(item => item.usesCurrentNode === false) }
    samples.push(items.slice(0, 12))
  }
  const selected: ConnectionEvidence[] = [], budget = Math.max(250, groups.size)
  for (let index = 0; index < 12 && selected.length < budget; index++) {
    for (const items of samples) if (items[index] && selected.length < budget) selected.push(items[index])
  }
  return { evidence: selected, observations }
}
