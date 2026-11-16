import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Tag } from 'antd'
import { EditOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { managedFor } from '../../core/applicationInventory'
import { diagnoseApplication, diagnosisFingerprint, groupConnectionSamples, type ApplicationDiagnosis } from '../../core/applicationDiagnosis'
import { formatDateTime, formatTime, outletLabel, t } from '../i18n'
import type { PendingRoute } from '../../core/routingQueue'
import type { IntegrationStatus } from '../../shared/integration'
import type { RunningApplicationProcess } from '../../shared/desktop'
import { routeLabels, type Application } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { ApplicationStatus } from './ApplicationStatus'
import { DomainExceptionsPanel } from './DomainExceptionsPanel'
import { TemporaryRoutingPanel } from './TemporaryRoutingPanel'

export function ApplicationDetails({ application, status, favorite, pending, failure, close, edit, toggleFavorite, check, busy, setBusy }: {
  application?: Application; status?: IntegrationStatus; favorite: boolean; pending?: PendingRoute; failure?: string
  close: () => void; edit: (app: Application) => void; toggleFavorite: (app: Application) => void
  check: () => Promise<{ status?: IntegrationStatus; running?: RunningApplicationProcess[] }>
  busy: boolean; setBusy: (value: boolean) => void
}) {
  const [checking, setChecking] = useState(false), [report, setReport] = useState<ApplicationDiagnosis>()
  const [temporaryOpen, setTemporaryOpen] = useState(false), [exceptionsOpen, setExceptionsOpen] = useState(false)
  const currentId = useRef(application?.id); currentId.current = application?.id
  useEffect(() => { setReport(undefined); setExceptionsOpen(false) }, [application?.id])
  const managed = application && managedFor(application, status?.managed)
  const evidence = status?.connected ? status.evidence.filter(item => item.applicationId === managed?.id) : []
  const observation = status?.connected ? status.observations?.[managed?.id ?? ''] : undefined
  const samples = groupConnectionSamples(evidence ?? [])
  const observedProcesses = observation?.processes ?? [...new Set((evidence ?? []).map(item => item.process))]
  const count = observation?.connectionCount ?? evidence?.length ?? 0
  async function inspect() {
    if (!application || checking) return
    const selected = application; setChecking(true)
    try { const result = await check(); if (currentId.current === selected.id) setReport(diagnoseApplication(selected, result.status, result.running)) }
    catch { if (currentId.current === selected.id) setReport(diagnoseApplication(selected)) }
    finally { setChecking(false) }
  }
  return <Drawer title={t('应用详情')} open={Boolean(application)} onClose={() => { if (!temporaryOpen && !exceptionsOpen && !busy) close() }} keyboard={!temporaryOpen && !exceptionsOpen && !busy} maskClosable={!temporaryOpen && !exceptionsOpen && !busy} closable={!busy} size={600} footer={<div className="drawer-footer"><Button onClick={close} disabled={busy}>{t('关闭')}</Button>{application && <><Button disabled={busy} icon={<EditOutlined />} onClick={() => edit(application)}>{t('编辑资料')}</Button><Button type="primary" aria-label={t('检查这个应用')} aria-busy={checking} loading={checking} onClick={() => void inspect()}>{t('检查这个应用')}</Button></>}</div>}>
    {application && <>
      {status && !status.connected && <Alert className="detail-offline" type="warning" showIcon title={t('连接已中断，以下保留最近一次读取的记录。')} />}
      <div className="detail-app-heading"><ApplicationIcon name={application.name} icon={application.icon} application={application} /><div><h2>{application.name}</h2><span>{t(application.category)}</span></div><Button aria-label={(favorite ? t('取消收藏') : t('收藏')) + ' ' + application.name} aria-pressed={favorite} icon={favorite ? <StarFilled /> : <StarOutlined />} onClick={() => toggleFavorite(application)}>{favorite ? t('已收藏') : t('收藏')}</Button></div>
      <div className="detail-section"><h3>{t(routeLabels[application.mode])}</h3><ApplicationStatus application={application} status={status} pending={pending} failure={failure} />
        <p className="observation-summary">{count ? t('已观察到 {0} 个组件、{1} 条连接', [observedProcesses.length, count]) : t('尚未观察到新连接')}</p>
        {observation && <p className="secondary-copy">{t('最近观察：{0}', [formatDateTime(observation.observedAt)])}</p>}<p className="secondary-copy">{t('其余组件暂未观察到联网，仅核对进入 Clash 的连接。')}</p>
        {managed?.mode === 'proxy' && <Descriptions column={1} size="small" items={[{ key: 'target', label: t('已绑定代理组'), children: managed.target }, { key: 'node', label: t('组当前选择'), children: outletLabel(status?.outlets?.[managed.target ?? '']) }]} />}
      </div>
      {report && <section className="detail-section application-diagnosis" aria-label={t('应用检查结果')}><h3>{t('应用检查结果')}<small>{formatTime(report.checkedAt)}</small></h3>
        {report.fingerprint !== diagnosisFingerprint(status, managed?.id) && <Alert type="info" title={t('设置或连接已变化，请重新检查。')} />}
        <Alert type={report.checks.some(item => item.state === 'fail') ? 'warning' : 'info'} title={t(report.next)} />
        <ol>{report.checks.map(item => <li key={item.name}><details><summary><strong>{t(item.name)}</strong><Tag color={item.state === 'pass' ? 'success' : item.state === 'fail' ? 'error' : 'default'}>{t(item.state === 'pass' ? '通过' : item.state === 'fail' ? '需检查' : '待观察')}</Tag></summary><p>{t(item.detail)}</p></details></li>)}</ol>
      </section>}
      <div className="detail-section"><h3>{t('连接样本')}<small>{evidence?.length ?? 0}</small></h3><p className="secondary-copy">{t('相同组件、目标和出口已合并。样本用于解释，不代表全部流量。')}</p>
        {samples.length ? <Collapse className="connection-samples" items={samples.map(group => ({ key: group.key, label: <span><strong>{group.sample.process}</strong> · {group.sample.destination}<Tag color={group.sample.matched ? 'success' : 'error'}>{t(group.sample.matched ? '符合设置' : '不符合设置')}</Tag><small>{t('样本 {0} 条', [group.count])}</small></span>, children: <><p className="route-explanation">{group.sample.process} → {t(group.sample.currentRuleMatched ? 'AppRoute 专属规则' : '其他规则或尚未匹配')} → {group.sample.routeChain?.join(' → ') || group.sample.outbound}</p><p>{t('最近建立：{0}', [formatDateTime(group.latestStartedAt)])}{group.sample.usesCurrentNode === false && t('（旧节点）')}</p></> }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('尚未观察到新连接')} />}
      </div>
      <DomainExceptionsPanel managed={managed} status={status} busy={busy} setBusy={setBusy} open={exceptionsOpen} setOpen={setExceptionsOpen} onChanged={check} />
      <TemporaryRoutingPanel application={application} managed={managed} status={status} busy={busy} setBusy={setBusy} open={temporaryOpen} setOpen={setTemporaryOpen} onChanged={check} />
      <Collapse items={[
        { key: 'processes', label: t('主程序与辅助进程 · {0} 个', [application.processes.length]), children: <><p className="secondary-copy">{t('应用规则按程序路径匹配；辅助进程由后端识别。')}</p><ul className="process-list">{application.processes.map(name => <li key={name}>{name} <Tag>{t(observedProcesses.includes(name) ? '已观察连接' : '暂未观察')}</Tag></li>)}</ul>{application.processWarnings?.map(warning => <Alert key={warning} type="warning" title={t(warning)} />)}</> },
        { key: 'source', label: t('程序位置与来源'), children: <Descriptions column={1} size="small" items={[{ key: 'source', label: t('来源'), children: application.source === 'scan' ? t('本机扫描') : t('手动添加或管理记录') }, { key: 'path', label: t('主程序'), children: <code className="break-text">{application.path || t('未记录')}</code> }]} /> },
      ]} />
    </>}
  </Drawer>
}
