import { Alert, App, Button, Collapse, Descriptions, Empty, Space, Table, Tabs, Tag } from 'antd'
import { useState } from 'react'
import type { IntegrationStatus } from '../../shared/integration'
import type { NetworkDiagnostics } from '../hooks/useNetworkDiagnostics'
import { DiagnosticReportTime } from './DiagnosticReportTime'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { formatTime, outletLabel, t } from '../i18n'
import { strategyLabels } from '../../shared/proxyStrategy'

interface Props { status?: IntegrationStatus; error: string; diagnostics: NetworkDiagnostics; tab: string; setTab: (tab: string) => void; refresh: () => Promise<unknown>; busy: boolean }
export function ConnectionInspector({ status, error, diagnostics, tab, setTab, refresh, busy }: Props) {
  const checks = diagnostics.checks
  const { modal, message } = App.useApp()
  const [repairing, setRepairing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const outlet = status?.proxyGroup ? status.outlets?.[status.proxyGroup] : undefined
  async function previewRepair() {
    setRepairing(true)
    try {
      const preview = await integrationRequest<{ fingerprint: string; applications: { name: string; mode: string; processCount: number }[] }>('repair-preview', {})
      modal.confirm({ title: t('恢复对应管理记录'), width: 560, okText: t('核对无误，恢复记录'), cancelText: t('取消'),
        content: <><p>{t('仅补回下面的管理记录，不重载或改写当前分流。损坏原文保留在本机备份。')}</p><div style={{ maxHeight: 320, overflow: 'auto' }}>{preview.applications.map((app, index) => <p key={index}>{app.name} · {app.mode === 'proxy' ? t('跟随代理组') : t('直接联网')} · {t('{0} 个进程', [app.processCount])}</p>)}</div></>,
        onOk: async () => { try { await integrationRequest('repair-records', { fingerprint: preview.fingerprint }); await refresh(); void message.success(t('管理记录已恢复')) } catch (error) { void message.error(t(error instanceof Error ? error.message : '操作失败')); throw error } } })
    } catch (error) { void message.error(t(error instanceof Error ? error.message : '操作失败')) }
    finally { setRepairing(false) }
  }
  async function exportReport() {
    setExporting(true)
    try { const result = await integrationRequest<{ saved: boolean }>('diagnostics-export', {}); if (result.saved) void message.success(t('诊断文件已保存')) }
    catch (error) { void message.error(t(error instanceof Error ? error.message : '操作失败')) }
    finally { setExporting(false) }
  }
  return <Tabs activeKey={tab} onChange={setTab} items={[
    { key: 'overview', label: t('连接概况'), children: <>
      <div className="connection-hero"><span className="eyebrow">Clash Party</span><h2>{status?.connected ? t('已连接') : t('未连接')}<Tag color={status?.connected ? 'success' : 'default'}>{status?.connected ? t('控制接口正常') : t('等待连接')}</Tag></h2><p>{t('连接状态来自内核控制接口；不代表所有节点都可用。')}</p></div>
      <div className="connection-node"><span className="eyebrow">{t('当前节点')}</span><strong>{status?.connected ? status.proxyGroup ? outletLabel(outlet) : t('尚未选择代理组') : t('等待连接')}</strong><span>{status?.proxyGroup ?? '—'}</span></div>
      {error && <Alert type="error" showIcon title={t(error)} />}
      <Collapse items={[{ key: 'technical', label: t('连接参数'), children: <Descriptions column={1} size="small" items={[
        { key: 'version', label: t('内核版本'), children: status?.version ?? '—' },
        { key: 'strategy', label: t('代理策略'), children: t(strategyLabels[status?.proxyStrategy?.mode ?? 'existing']) },
        { key: 'probe', label: t('最近探测'), children: outlet?.checkedAt ? formatTime(outlet.checkedAt) + ' · ' + (outlet.delay ? `${outlet.delay} ms` : t('失败')) : t('尚无近期记录，可运行网络自检') },
      ]} /> }]} />
    </> },
    { key: 'rules', label: t('应用规则'), children: <>
      <div className="detail-section"><h3>{status?.managed.length ?? 0} <small>{t('个应用已设置')}</small></h3><Tag color={status?.rulesLoaded ? 'blue' : 'default'}>{status?.rulesLoaded ? t('规则已加载') : t('规则未确认加载')}</Tag><p className="secondary-copy">{t('规则加载与实际连接分别验证。等待应用联网时，可打开该应用并建立新连接。')}</p>
        <Descriptions column={1} size="small" items={[
          { key: 'persistence', label: t('重启后保留'), children: status?.persistenceObserved ? t('已观察到客户端重新生成规则') : t('尚未验证') },
          { key: 'verified', label: t('已验证新连接'), children: new Set(status?.evidence.filter(item => item.matched).map(item => item.applicationId)).size },
          { key: 'missing', label: t('代理组消失时'), children: status?.missingTargetAction === 'block' ? t('停止匹配的新连接') : t('沿用原有规则') },
        ]} /></div>
      {(status?.untrackedRuleCount || status?.dataIssue) ? <Alert type="warning" showIcon title={t('管理记录需要核对')} description={<Space orientation="vertical"><span>{t('先核对当前规则，再恢复记录；不会重新应用旧缓存。')}</span><Button loading={repairing} disabled={busy || !status.connected || Boolean(status.pending)} onClick={() => void previewRepair()}>{t('核对并恢复记录')}</Button></Space>} /> : null}
      <Collapse items={[{ key: 'rules-details', label: t('已管理应用'), children: status?.managed.length ? status.managed.map(app => <div className="managed-rule-line" key={app.id}><span>{app.name}</span><Tag>{app.mode === 'direct' ? t('直接联网') : t('跟随代理组')}</Tag></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('无专属规则')} /> },
        ...(status?.warning ? [{ key: 'checks', label: t('验证说明'), children: <p>{t(status.warning)}</p> }] : [])]} />
    </> },
    { key: 'recovery', label: t('恢复与诊断'), children: <>
      <div className="detail-section"><h3>{t('离线恢复')} <Tag color={status?.recoveryReady ? 'success' : 'default'}>{status?.recoveryReady ? t('已准备') : t('尚未准备')}</Tag></h3><p>{status?.recoveryReady ? t('双击桌面的 AppRoute - Restore Network，无需联网即可恢复。') : t('首次应用前会自动准备独立恢复工具。准备失败时不会修改规则。')}</p>
        {status?.pending?.recoveryRequired && <Alert type="error" title={t('恢复尚未确认，请运行网络自检或离线恢复。')} />}</div>
      <DiagnosticReportTime diagnostics={diagnostics} />
      <Collapse className={diagnostics.staleReason ? 'diagnostic-history' : undefined} items={[
        { key: 'checks', label: t('网络自检结果') + (checks.length ? ` · ${checks.filter(check => check.ok).length}/${checks.length}` : ''), children: checks.length ? checks.map(check => <div className="diagnostic-item" key={check.name}><Tag color={check.ok ? 'success' : 'warning'}>{check.ok ? t('通过') : t('待处理')}</Tag><strong>{t(check.name)}</strong><p>{t(check.detail)}</p></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('点击底部“网络自检”开始检查')} /> },
        { key: 'timings', label: t('最近操作耗时'), children: <Table size="small" pagination={false} rowKey={(_, index) => String(index)} dataSource={[...(status?.timings ?? [])].reverse().slice(0, 16)} columns={[{ title: t('阶段'), dataIndex: 'phase', render: value => t(value) }, { title: t('耗时'), dataIndex: 'durationMs', render: value => `${value} ms` }, { title: t('状态'), dataIndex: 'ok', render: ok => <Tag color={ok ? 'success' : 'error'}>{ok ? t('通过') : t('失败')}</Tag> }]} /> },
        { key: 'files', label: t('恢复位置与数据保留'), children: <><code className="recovery-path">{status?.recoveryPath}</code><p>{t('最近 20 份状态备份和 20 个已结束事务保留在本机；待恢复或无法识别的事务不会自动删除。')}</p>{status?.lastRecovery && <p>{t('上次恢复：')}{t(status.lastRecovery)}</p>}</> },
      ]} />
      {window.appRoute && <div className="detail-section"><Button loading={exporting} onClick={() => void exportReport()}>{t('导出脱敏诊断')}</Button><p className="secondary-copy">{t('仅包含状态、数量和阶段耗时，不包含应用名、节点名、路径、访问目标或配置。')}</p></div>}
    </> },
  ]} />
}
