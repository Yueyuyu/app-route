import { useEffect, useState } from 'react'
import { Alert, Button, Modal, Select, Space, Tag } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import type { Application } from '../../shared/application'
import type { AutomaticApplyResult, IntegrationStatus, ManagedApplication } from '../../shared/integration'
import { temporaryDurations } from '../../shared/temporaryRouting'
import { formatDateTime, t } from '../i18n'
import { routeLabels } from '../types'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { settingsError } from '../settingsError'

export function TemporaryRoutingPanel({ application, managed, status, busy, setBusy, open, setOpen, onChanged }: {
  application: Application; managed?: ManagedApplication; status?: IntegrationStatus; busy: boolean; setBusy: (value: boolean) => void
  open: boolean; setOpen: (value: boolean) => void; onChanged: () => Promise<unknown>
}) {
  const [mode, setMode] = useState<'direct' | 'proxy'>('direct'), [minutes, setMinutes] = useState<number>(30), [ending, setEnding] = useState(false)
  const [working, setWorking] = useState(false), [notice, setNotice] = useState<{ text: string; error: boolean }>()
  useEffect(() => { setNotice(undefined); setOpen(false) }, [application.id])
  const lease = managed?.temporary, expired = lease && Date.parse(lease.expiresAt) <= Date.now()
  const previous = lease?.previous ?? { mode: managed?.mode ?? 'rule', target: managed?.target }
  const disabled = Boolean(managed?.domainExceptions?.length) || busy || !window.appRoute || !status?.connected || Boolean(status.pending) || !application.path || Boolean(status.untrackedRuleCount || status.dataIssue)
  function show(end: boolean) { setEnding(end); setMode(lease ? managed!.mode === 'proxy' ? 'proxy' : 'direct' : application.mode === 'direct' && status?.proxyGroup ? 'proxy' : 'direct'); setOpen(true); setNotice(undefined) }
  async function confirm() {
    if (disabled || working || !status) return
    setWorking(true); setBusy(true); setNotice(undefined)
    try {
      const result = await integrationRequest<AutomaticApplyResult>(ending ? 'temporary-end' : 'temporary', ending
        ? { revision: status.revision, applicationId: managed!.id, id: lease!.id }
        : { revision: status.revision, application: { ...application, mode }, minutes })
      setNotice({ text: result.outcome === 'applied' ? ending ? '已结束临时分流，新连接仍需验证。' : '临时分流已应用，新连接仍需验证。' : result.message, error: result.outcome !== 'applied' })
    } catch (error) { setNotice({ text: settingsError(error, '操作失败'), error: true }) }
    finally { await onChanged().catch(() => {}); setWorking(false); setBusy(false); setOpen(false) }
  }
  return <section className="detail-section temporary-routing" aria-label={t('临时分流')}>
    <div className="temporary-routing-heading"><h3><ClockCircleOutlined /> {t('临时分流')}</h3><Button disabled={disabled} onClick={() => show(false)}>{t(lease ? '调整期限' : '设置期限')}</Button></div>
    {Boolean(managed?.domainExceptions?.length) && <p className="secondary-copy">{t('请先移除域名例外，再设置临时分流。')}</p>}
    {lease && <><p><Tag color={expired ? 'warning' : 'blue'}>{t(expired ? '到期待恢复' : '临时设置中')}</Tag>{t('恢复时间：{0}', [formatDateTime(lease.expiresAt)])}</p><p className="subtle">{t('恢复为：{0}', [t(routeLabels[previous.mode])])}{previous.target ? ` · ${previous.target}` : ''}</p><Button size="small" disabled={disabled} onClick={() => show(true)}>{t('现在恢复原选择')}</Button></>}
    {notice && <Alert showIcon type={notice.error ? 'warning' : 'success'} title={t(notice.text)} />}
    <Modal open={open} title={t(ending ? '结束临时分流' : '临时分流')} onCancel={() => { if (!working) setOpen(false) }} keyboard={!working} maskClosable={!working} closable={!working}
      footer={<Space><Button disabled={working} onClick={() => setOpen(false)}>{t('取消')}</Button><Button type="primary" loading={working} disabled={disabled && !working} onClick={() => void confirm()}>{t(ending ? '恢复原选择' : '应用临时分流')}</Button></Space>}>
      <p><strong>{application.name}</strong></p>
      {!ending && <div className="temporary-routing-fields"><label>{t('临时联网方式')}<Select aria-label={t('临时联网方式')} value={mode} onChange={setMode} options={(['direct', 'proxy'] as const).map(value => ({ value, label: t(routeLabels[value]), disabled: value === 'proxy' && !status?.proxyGroup }))} /></label><label>{t('持续时间')}<Select aria-label={t('持续时间')} value={minutes} onChange={setMinutes} options={temporaryDurations.map(value => ({ value, label: t('{0} 分钟', [value]) }))} /></label></div>}
      {!ending && mode === 'proxy' && <p>{t('已绑定代理组')}：{status?.proxyGroup}</p>}
      <p>{t('恢复为：{0}', [t(routeLabels[previous.mode])])}{previous.target ? ` · ${previous.target}` : ''}</p>
      <p className="subtle">{t('只影响这个应用。中途手动改选会取消期限；续期仍恢复最初选择。')}</p>
      <Alert type="info" showIcon title={t('后台到期恢复')} description={t('关闭窗口或退出界面后仍由独立守护处理。重启电脑后需打开 AppRoute；内核离线或恢复检查失败时保留当前设置，并显示到期待恢复。')} />
    </Modal>
  </section>
}
