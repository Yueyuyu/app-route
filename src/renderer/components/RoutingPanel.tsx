import { Alert, App, Button, Collapse, Descriptions, Drawer, Empty, Tag } from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { DiagnosticCheck, IntegrationStatus } from '../../shared/integration'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { proxyOutletLabel } from '../../core/proxyGroups'
import { ProxyStrategyDrawer } from './ProxyStrategyDrawer'
import { HelpTip } from './HelpTip'
import { strategyLabels, type ProxyStrategy } from '../../shared/proxyStrategy'

interface Props {
  status?: IntegrationStatus; error: string; refresh: () => Promise<unknown>; busy: boolean
  setProxyStrategy: (value: ProxyStrategy, revision: string) => Promise<void>
  inspectionOpen: boolean; setInspectionOpen: (open: boolean) => void
}
export function RoutingPanel({ status, error, refresh, busy, setProxyStrategy, inspectionOpen, setInspectionOpen }: Props) {
  const { modal, message } = App.useApp()
  const [working, setWorking] = useState('')
  const [checks, setChecks] = useState<DiagnosticCheck[]>([])
  const outlet = status?.proxyGroup ? status.outlets?.[status.proxyGroup] : undefined
  const currentNode = !status?.connected ? '等待连接' : !status.proxyGroup ? '尚未选择代理组' : proxyOutletLabel(outlet)
  const legacy = status?.managed.some(app => app.mode === 'proxy' && app.target !== status.proxyGroup)
  const nodeWarning = outlet && (['direct', 'reject', 'missing', 'unknown'].includes(outlet.kind) || outlet.health === 'unhealthy')
  async function run(action: string) {
    setWorking(action)
    try {
      if (action === 'diagnose') { setChecks(await integrationRequest<DiagnosticCheck[]>(action, {})); setInspectionOpen(true) }
      else { const result = await integrationRequest<{ restored: boolean; message: string }>(action, {}); void (result.restored ? message.success(result.message) : message.warning(result.message)) }
    } catch (e) { void message.error(e instanceof Error ? e.message : '操作失败') }
    finally { await refresh(); setWorking('') }
  }
  function recover() {
    modal.confirm({ title: '恢复到 AppRoute 接管前的规则？', content: <div className="confirmation-copy"><p>停用所有 AppRoute 专属分流和自动策略，应用重新沿用 Clash Party 原有规则。</p><p>保留原有订阅、代理组、系统代理和 TUN 设置。</p></div>, okText: '恢复原有规则', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => run('recover') })
  }
  return <>
    <section className="routing-panel" aria-label="代理与网络状态">
      <div className="routing-summary">
        <div className="routing-summary-copy"><span className="eyebrow">当前代理策略</span><strong>{status?.proxyGroup ?? '尚未设置代理组'} <HelpTip title="代理策略"><p>{strategyLabels[status?.proxyStrategy?.mode ?? 'existing']}。只影响选择“跟随代理组”的应用。</p><p>组当前选择与应用实际使用的节点分别显示。新连接跟随选择，旧连接不会强制断开。</p></HelpTip></strong><span className="current-node">当前节点：{currentNode}</span></div>
        <div className="routing-summary-actions"><ProxyStrategyDrawer status={status} busy={busy || Boolean(working)} apply={setProxyStrategy} /><Button onClick={() => setInspectionOpen(true)}>连接详情</Button><Button danger icon={<SafetyCertificateOutlined />} disabled={busy || Boolean(working)} onClick={recover}>恢复网络</Button></div>
      </div>
      {error || !status?.connected ? <Alert className="compact-alert" type="warning" showIcon title={error ? '连接中断，请检查 Clash Party' : status ? '尚未连接 Clash Party' : '正在连接 Clash Party…'} action={<Button size="small" onClick={() => void refresh()}>重试</Button>} /> : null}
      {status?.strategyWarning && <Alert className="compact-alert" type="warning" showIcon title={status.strategyWarning} />}
      {Boolean(status?.untrackedRuleCount) && <Alert className="compact-alert" type="warning" showIcon title={`${status!.untrackedRuleCount} 条历史规则仍在运行，管理记录缺失`} action={<Button size="small" onClick={() => setInspectionOpen(true)}>查看详情</Button>} />}
      {status?.connected && status.mode !== 'rule' && <Alert className="compact-alert" type="warning" showIcon title="Clash Party 当前不是规则模式，应用分流可能不按预期执行。" />}
      {legacy && <Alert className="compact-alert" type="warning" showIcon title="部分应用仍使用旧出口，请在代理策略中统一绑定。" />}
      {nodeWarning && <Alert className="compact-alert" type="warning" showIcon title={proxyOutletLabel(outlet)} action={<Button size="small" onClick={() => setInspectionOpen(true)}>查看原因</Button>} />}
      {status?.connected && status.managed.length > 0 && !status.rulesLoaded && !status.pending && <Alert className="compact-alert" type="error" showIcon title="已保存规则与当前运行状态不一致" action={<Button size="small" onClick={() => setInspectionOpen(true)}>检查</Button>} />}
      {status?.pending && <div className="transaction-progress" role="status">正在自动检查 · 失败将恢复上一版设置</div>}
    </section>
    <Drawer title="连接详情与恢复" open={inspectionOpen} onClose={() => setInspectionOpen(false)} size={580}
      footer={<div className="drawer-footer"><Button onClick={() => setInspectionOpen(false)}>关闭</Button><Button icon={<ReloadOutlined />} loading={working === 'diagnose'} disabled={busy || Boolean(working)} onClick={() => void run('diagnose')}>网络自检</Button><Button danger disabled={busy || Boolean(working)} onClick={recover}>恢复网络</Button></div>}>
      <div className="detail-section"><h3>Clash Party <Tag color={status?.connected ? 'success' : 'default'}>{status?.connected ? '已连接' : '未连接'}</Tag></h3>
        <p className="secondary-copy">连接状态来自内核控制接口；不代表所有节点都可用。</p>
        <Descriptions column={1} size="small" items={[
          { key: 'version', label: '内核版本', children: status?.version ?? '未读取' },
          { key: 'strategy', label: '代理策略', children: strategyLabels[status?.proxyStrategy?.mode ?? 'existing'] },
          { key: 'node', label: '组当前选择', children: currentNode },
          { key: 'probe', label: '最近探测', children: outlet?.checkedAt ? new Date(outlet.checkedAt).toLocaleTimeString() + ' · ' + (outlet.delay ? outlet.delay + ' ms' : '失败') + (outlet.health === 'unknown' ? '（记录已过期）' : '') : '尚无近期记录，可运行网络自检' },
        ]} />
        {error && <Alert type="error" showIcon title={error} />}
      </div>
      <div className="detail-section"><h3>规则与验证</h3><Descriptions column={1} size="small" items={[
        { key: 'rules', label: '运行规则', children: !status?.connected ? '待连接后确认' : status.untrackedRuleCount ? status.untrackedRuleCount + ' 条历史规则，缺少管理记录' : status.managed.length ? status.rulesLoaded ? '规则已加载 · ' + status.managed.length + ' 个应用' : '规则未确认加载' : '无专属规则' },
        { key: 'persistence', label: '重启后保留', children: status?.untrackedRuleCount ? '记录缺失，无法确认' : !status?.managed.length ? '无专属设置，无需验证' : status.persistenceObserved ? '已观察到客户端重新生成规则' : '尚未验证' },
      ]} />{status?.warning && <Alert type="info" showIcon title={status.warning} />}</div>
      <div className="detail-section"><h3>离线恢复</h3><p>{status?.recoveryReady ? '双击桌面的 AppRoute - Restore Network，无需联网即可恢复。' : '首次应用前会自动准备独立恢复工具。准备失败时不会修改规则。'}</p>{status?.recoveryPath && <code className="recovery-path">{status.recoveryPath}</code>}{status?.lastRecovery && <p className="secondary-copy">上次恢复：{status.lastRecovery}</p>}</div>
      <Collapse items={[{ key: 'checks', label: '网络自检结果' + (checks.length ? ' · ' + checks.filter(check => check.ok).length + '/' + checks.length + ' 通过' : ''), children: checks.length ? checks.map(check => <div className="diagnostic-item" key={check.name}><Tag color={check.ok ? 'success' : 'warning'}>{check.ok ? '通过' : '待处理'}</Tag><strong>{check.name}</strong><p>{check.detail}</p></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击底部“网络自检”开始检查" /> }]} />
    </Drawer>
  </>
}
