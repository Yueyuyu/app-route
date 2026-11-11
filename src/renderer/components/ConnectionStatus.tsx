import { useId, useRef, useState } from 'react'
import { Button, Popover } from 'antd'
import { CloseOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons'
import type { IntegrationStatus } from '../../shared/integration'
import type { NetworkDiagnostics } from '../hooks/useNetworkDiagnostics'
import { outletLabel, t } from '../i18n'
import { DiagnosticReportTime } from './DiagnosticReportTime'

interface Props {
  status?: IntegrationStatus; error: string; busy: boolean
  diagnostics: NetworkDiagnostics
  onDetails: (tab?: string) => void
}

export function ConnectionStatus({ status, error, busy, diagnostics, onDetails }: Props) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  // 只依据控制接口显示连接；节点健康、规则状态不能混入这个绿点。
  const state = error ? 'error' : status?.connected ? 'connected' : status ? 'offline' : 'connecting'
  const label = state === 'connected' ? t('内核已连接') : state === 'error' ? t('连接异常') : state === 'offline' ? t('未连接') : t('正在连接…')
  const outlet = status?.proxyGroup ? status.outlets?.[status.proxyGroup] : undefined
  function close() { setOpen(false); trigger.current?.focus() }
  function details(tab = 'overview') { setOpen(false); onDetails(tab) }
  return <Popover trigger="click" placement="topLeft" arrow={false} open={open} onOpenChange={setOpen} afterOpenChange={visible => { if (visible && open) closeButton.current?.focus() }} destroyOnHidden
    classNames={{ root: 'connection-popover' }} content={<section id={panelId} className="connection-quick" role="region" aria-label={t('连接概况')}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <div className="connection-quick-heading"><div><strong>Clash Party</strong><span><i className={`connection-dot ${state}`} />{label}</span></div><Button ref={closeButton} type="text" size="small" aria-label={t('关闭')} icon={<CloseOutlined />} onClick={close} /></div>
      <dl>
        <div><dt>{t('连接方式')}</dt><dd>{t('本机控制接口')}</dd></div>
        <div><dt>{t('代理组')}</dt><dd>{status?.proxyGroup ?? t('尚未选择代理组')}</dd></div>
        <div><dt>{t('当前节点')}</dt><dd>{status?.connected && !error ? status.proxyGroup ? outletLabel(outlet) : '—' : t('等待连接')}</dd></div>
      </dl>
      {(error || (!status?.connected && status?.warning)) && <p className="connection-quick-error" role="status">{t(error || status!.warning!)}</p>}
      <p className="connection-quick-note">{t('连接状态来自内核控制接口；不代表所有节点都可用。')}</p>
      <DiagnosticReportTime diagnostics={diagnostics} />
      {diagnostics.checks.length > 0 && <button className="diagnostic-summary" onClick={() => details('recovery')}><span>{t(diagnostics.staleReason ? '上次结果：通过 {0}/{1} 项' : '自检通过 {0}/{1} 项', [diagnostics.checks.filter(check => check.ok).length, diagnostics.checks.length])}</span><RightOutlined /></button>}
      <div className="connection-quick-actions"><Button onClick={() => details()}>{t('查看详情')}</Button><Button icon={<ReloadOutlined />} loading={diagnostics.busy} disabled={busy} onClick={() => void diagnostics.run()}>{t('网络自检')}</Button></div>
    </section>}>
    <button ref={trigger} className="integration-status" aria-label={t('查看 Clash Party 连接状态')} aria-expanded={open} aria-controls={open ? panelId : undefined}
      onKeyDown={event => { if (event.key === 'Escape') close() }}>
      <i className={`connection-dot ${state}`} /><span className="integration-status-copy"><strong>Clash Party</strong><span>{label}</span></span><RightOutlined className="integration-status-chevron" />
    </button>
  </Popover>
}
