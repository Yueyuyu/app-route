import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Collapse, Drawer, Empty, Modal, Space, Tag } from 'antd'
import { formatDateTime, t } from '../i18n'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { settingsError } from '../settingsError'
import { routeLabels } from '../types'
import type { AutomaticApplyResult } from '../../shared/integration'
import type { RoutingChange, RoutingHistory, RoutingHistoryItem } from '../../shared/routingHistory'

const sources = { application: '手动设置', strategy: '代理策略', import: '设置导入', helper: '辅助进程补充', undo: '撤销操作', unknown: '旧版记录' }
const phases = { prepared: '准备中', pending: '等待确认', confirmed: '已应用', 'rolled-back': '已自动恢复', 'recovery-required': '需要恢复' }
function Changes({ changes, reverse = false }: { changes: RoutingChange[]; reverse?: boolean }) {
  const shown = reverse ? changes.filter(change => change.before.mode !== change.after.mode || change.before.target !== change.after.target) : changes
  return <div className="routing-history-changes">{shown.map(change => {
    const before = reverse ? change.after : change.before, after = reverse ? change.before : change.after
    const label = (value: typeof before) => <span>{t(routeLabels[value.mode])}{value.target && <small>{value.target}</small>}{!reverse && <small>{t('{0} 个进程', [value.processes])}</small>}</span>
    return <div key={change.id}><strong>{change.name}</strong>{label(before)}<span aria-hidden>→</span>{label(after)}</div>
  })}</div>
}
interface Props { open: boolean; onClose: () => void; revision?: string; connected: boolean; busy: boolean; setBusy: (busy: boolean) => void; onChanged: () => Promise<unknown> }
export function RoutingHistoryPanel({ open, onClose, revision, connected, busy, setBusy, onChanged }: Props) {
  const [history, setHistory] = useState<RoutingHistory>(), [reading, setReading] = useState(false), [undoing, setUndoing] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean }>(), [selected, setSelected] = useState<RoutingHistoryItem>()
  const sequence = useRef(0)
  async function load() {
    const request = ++sequence.current; setReading(true)
    try { const value = await integrationRequest<RoutingHistory>('history'); if (request === sequence.current) setHistory(value) }
    catch (error) { if (request === sequence.current) { setHistory(undefined); setNotice({ text: settingsError(error, '操作记录无法读取。'), error: true }) } }
    finally { if (request === sequence.current) setReading(false) }
  }
  useEffect(() => { if (open) void load(); return () => { sequence.current++ } }, [open, revision])
  async function undo() {
    if (!selected || !history || busy || undoing) return
    setBusy(true); setUndoing(true); setNotice(undefined)
    try {
      const result = await integrationRequest<AutomaticApplyResult>('undo', { id: selected.id, revision: history.revision })
      setNotice({ text: result.outcome === 'applied' ? '已撤销这次分流修改；新连接仍需验证。' : result.message, error: result.outcome !== 'applied' })
    } catch (error) { setNotice({ text: settingsError(error, '操作失败'), error: true }) }
    finally { setSelected(undefined); await onChanged().catch(() => {}); await load(); setUndoing(false); setBusy(false) }
  }
  return <Drawer title={t('操作记录')} open={open} width={640} onClose={() => { if (!undoing) onClose() }} keyboard={!undoing && !selected} maskClosable={!undoing && !selected} closable={!undoing} className="routing-history-drawer"
    extra={<Button disabled={busy} loading={reading} onClick={() => void load()}>{t('刷新')}</Button>}>
    <p className="subtle">{t('最近 20 条分流事务，仅保存在本机。撤销只恢复分流，不修改应用资料。')}</p>
    {notice && <Alert showIcon type={notice.error ? 'warning' : 'success'} title={t(notice.text)} />}
    {Boolean(history?.unreadable) && <Alert showIcon type="warning" title={t('有 {0} 条记录无法读取，原文件已保留。', [history!.unreadable])} />}
    {history && !history.items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('还没有分流操作记录')} />}
    <div className="routing-history-list">{history?.items.map(item => <article key={item.id}>
      <div className="routing-history-heading"><div><strong>{t(sources[item.source])}</strong><small>{item.at ? formatDateTime(item.at) : t('时间未记录')}</small></div>
        <Tag color={item.phase === 'confirmed' ? 'blue' : item.phase === 'rolled-back' ? 'default' : 'warning'}>{t(phases[item.phase])}</Tag></div>
      <Collapse ghost size="small" items={[{ key: 'changes', label: t('{0} 个应用有变化', [item.changes.length]), children: <><Changes changes={item.changes} />{item.strategyChanged && <p>{t('这次涉及代理策略，请通过策略或备份预览恢复。')}</p>}{!item.changes.length && !item.strategyChanged && <p>{t('旧记录没有保存字段差异。')}</p>}</> }]} />
      <div className="routing-history-action"><span>{item.undoReason ? t(item.undoReason) : t('可撤销最近一次修改')}</span><Button size="small" disabled={Boolean(item.undoReason) || !connected || busy || reading} onClick={() => setSelected(item)}>{t('撤销这次修改')}</Button></div>
    </article>)}</div>
    <Modal open={Boolean(selected)} title={t('确认撤销这次分流修改？')} onCancel={() => { if (!undoing) setSelected(undefined) }} keyboard={!undoing} maskClosable={!undoing} closable={!undoing} footer={<Space><Button disabled={undoing} onClick={() => setSelected(undefined)}>{t('取消')}</Button><Button type="primary" loading={undoing} disabled={!connected || busy && !undoing} onClick={() => void undo()}>{t('确认撤销')}</Button></Space>}>
      <p>{t('将重新校验并应用下面的差异；如果此后已有新修改，会停止撤销。')}</p><p className="subtle">{t('撤销只恢复联网方式，辅助进程重新识别。')}</p>{selected && <Changes changes={selected.changes} reverse />}
    </Modal>
  </Drawer>
}
