import { useState } from 'react'
import { Alert, Button, Empty, Input, Modal, Select, Space, Table, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { IntegrationStatus, ManagedApplication, AutomaticApplyResult } from '../../shared/integration'
import type { DomainException } from '../../shared/domainExceptions'
import { validateDomainExceptions } from '../../core/domainExceptions'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { settingsError } from '../settingsError'
import { t } from '../i18n'
import { routeLabels } from '../types'

export function DomainExceptionsPanel({ managed, status, busy, setBusy, open, setOpen, onChanged }: {
  managed?: ManagedApplication; status?: IntegrationStatus; busy: boolean; setBusy: (value: boolean) => void
  open: boolean; setOpen: (value: boolean) => void; onChanged: () => Promise<unknown>
}) {
  const [rows, setRows] = useState<DomainException[]>([]), [revision, setRevision] = useState('')
  const [working, setWorking] = useState(false), [error, setError] = useState('')
  const disabled = busy || !window.appRoute || !status?.connected || Boolean(status.pending || status.dataIssue || status.untrackedRuleCount || managed?.temporary) || !managed?.processPaths?.length
  const existing = managed?.domainExceptions ?? []
  function edit() { setRows(existing.map(({ domain, kind, mode }) => ({ domain, kind, mode }))); setRevision(status!.revision); setError(''); setOpen(true) }
  function change(index: number, values: Partial<DomainException>) { setRows(current => current.map((row, i) => i === index ? { ...row, ...values } : row)); setError('') }
  async function save() {
    if (disabled || !managed || working) return
    let exceptions: DomainException[]
    try { exceptions = validateDomainExceptions(rows) } catch (error) { setError(settingsError(error, '操作失败')); return }
    setWorking(true); setBusy(true); setError('')
    try {
      const result = await integrationRequest<AutomaticApplyResult>('domain-exceptions', { applicationId: managed.id, revision, exceptions })
      if (result.outcome !== 'applied') throw new Error(result.message)
      setOpen(false)
    } catch (error) { setError(settingsError(error, '操作失败')) }
    finally { await onChanged().catch(() => {}); setWorking(false); setBusy(false) }
  }
  return <section className="detail-section domain-exceptions" aria-label={t('域名例外')}>
    <div className="temporary-routing-heading"><h3>{t('域名例外')}<small>{existing.length}</small></h3><Button disabled={disabled} onClick={edit}>{t('编辑例外')}</Button></div>
    {!managed ? <p className="secondary-copy">{t('先为应用选择直连或代理，再设置域名例外。')}</p> : managed.temporary ? <p className="secondary-copy">{t('请先结束临时分流，再设置域名例外。')}</p> : !existing.length ? <p className="secondary-copy">{t('所有目标沿用这个应用的联网方式。')}</p> : <ul className="process-list">{existing.map(item => <li key={item.kind + item.domain}><code>{item.kind === 'suffix' ? '*.' : ''}{item.domain}</code><Tag>{t(routeLabels[item.mode])}</Tag>{item.target && <small>{item.target}</small>}</li>)}</ul>}
    <Modal className="domain-exceptions-modal" title={t('域名例外')} open={open} width={760} styles={{ body: { maxHeight: 'calc(100dvh - 240px)', overflowY: 'auto' } }} onCancel={() => { if (!working) setOpen(false) }} maskClosable={!working} keyboard={!working} closable={!working}
      footer={<Space><Button disabled={working} onClick={() => setOpen(false)}>{t('取消')}</Button><Button type="primary" aria-label={t('应用例外')} loading={working} disabled={disabled && !working} onClick={() => void save()}>{t('应用例外')}</Button></Space>}>
      <p><strong>{managed?.name}</strong></p><p className="secondary-copy">{t('仅影响此应用。精确域名优先，其次是更长的域名后缀；其他目标沿用应用设置。')}</p>
      <Table size="small" rowKey={(_, index) => String(index)} pagination={false} dataSource={rows} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('没有域名例外')} /> }} scroll={{ x: 620 }} columns={[
        { title: t('匹配方式'), width: 160, render: (_, row, index) => <Select aria-label={t('匹配方式') + ' ' + (index + 1)} value={row.kind} disabled={working} onChange={kind => change(index, { kind })} options={[{ value: 'exact', label: t('精确域名') }, { value: 'suffix', label: t('域名及其子域名') }]} /> },
        { title: t('域名'), render: (_, row, index) => <Input aria-label={t('域名') + ' ' + (index + 1)} value={row.domain} placeholder="example.com" disabled={working} onChange={event => change(index, { domain: event.target.value })} /> },
        { title: t('联网方式'), width: 160, render: (_, row, index) => <Select aria-label={t('联网方式') + ' ' + (index + 1)} value={row.mode} disabled={working} onChange={mode => change(index, { mode })} options={(['direct', 'proxy'] as const).map(value => ({ value, label: t(routeLabels[value]), disabled: value === 'proxy' && !status?.proxyGroup }))} /> },
        { width: 44, render: (_, _row, index) => <Button type="text" icon={<DeleteOutlined />} aria-label={t('删除例外') + ' ' + (index + 1)} disabled={working} onClick={() => setRows(current => current.filter((_, i) => i !== index))} /> },
      ]} />
      <Button style={{ marginTop: 12 }} icon={<PlusOutlined />} aria-label={t('添加例外')} disabled={working || rows.length >= 20} onClick={() => setRows(current => [...current, { kind: 'exact', domain: '', mode: 'direct' }])}>{t('添加例外')}</Button>
      <p className="secondary-copy">{t('代理例外跟随已绑定组；组消失时拒绝对应连接。切回按规则会移除本应用的全部例外。')}</p>
      {rows.some(item => item.mode === 'proxy') && <p>{t('已绑定代理组')}：{status?.proxyGroup}</p>}
      {error && <Alert showIcon type="warning" title={t(error)} />}
    </Modal>
  </section>
}
