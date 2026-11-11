import type { ProxyStrategy } from '../../shared/proxyStrategy'
import { ProxyStrategyDrawer } from './ProxyStrategyDrawer'
import { Alert, App, Button, Collapse, Select, Space, Tag } from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { DiagnosticCheck, IntegrationStatus } from '../../shared/integration'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { proxyOutletLabel } from '../../core/proxyGroups'

interface Props { status?: IntegrationStatus; error: string; refresh: () => Promise<unknown>; busy: boolean; setProxyGroup: (value: string) => Promise<void>; setProxyStrategy: (value: ProxyStrategy, revision: string) => Promise<void> }
export function RoutingPanel({ status, error, refresh, busy, setProxyGroup, setProxyStrategy }: Props) {
  const { modal, message } = App.useApp()
  const [working, setWorking] = useState('')
  const [checks, setChecks] = useState<DiagnosticCheck[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>()
  const candidate = selectedGroup ?? status?.proxyGroup ?? status?.suggestedTarget
  const outlet = status?.proxyGroup ? status.outlets?.[status.proxyGroup] : undefined
  const legacy = status?.managed.some(app => app.mode === 'proxy' && app.target !== status.proxyGroup)
  async function bindGroup() {
    if (!candidate) return
    setWorking('group')
    try { await setProxyGroup(candidate); setSelectedGroup(undefined); void message.success('已绑定代理组，所有代理应用随组内选择切换。') }
    catch (e) { void message.error(e instanceof Error ? e.message : '绑定失败') }
    finally { setWorking('') }
  }
  async function run(action: string) {
    setWorking(action)
    try {
      if (action === 'diagnose') setChecks(await integrationRequest<DiagnosticCheck[]>(action, {}))
      else { const result = await integrationRequest<{ restored: boolean; message: string }>(action, {}); void (result.restored ? message.success(result.message) : message.warning(result.message)) }
    } catch (e) { void message.error(e instanceof Error ? e.message : '操作失败') }
    finally { await refresh(); setWorking('') }
  }
  return <section className="routing-panel" aria-label="实际分流与网络恢复">
    <div className="routing-toolbar"><Space wrap>
      <Tag color={status?.connected ? 'green' : 'default'}>{status?.connected ? `Clash Party 已连接 · ${status.version}` : 'Clash Party 未连接'}</Tag>
      <ProxyStrategyDrawer status={status} busy={busy || Boolean(working)} apply={setProxyStrategy} />
      <span>统一跟随代理组</span><Select aria-label="跟随代理组" placeholder="选择常用代理组" disabled={busy || Boolean(working) || !status?.connected || Boolean(status?.pending)} value={candidate} onChange={setSelectedGroup} showSearch optionFilterProp="label" style={{ width: 230 }} options={status?.groupChoices?.map(choice => ({ value: choice.name, label: choice.name }))} />
      <Button loading={working === 'group'} disabled={busy || Boolean(working) || !status?.connected || Boolean(status?.pending) || !status?.groupChoices?.some(group => group.name === candidate) || (candidate === status?.proxyGroup && !legacy)} onClick={() => void bindGroup()}>绑定全部代理应用</Button>
    </Space><Space wrap><Button icon={<ReloadOutlined />} loading={working === 'diagnose'} disabled={busy || Boolean(working)} onClick={() => void run('diagnose')}>网络自检</Button><Button danger icon={<SafetyCertificateOutlined />} disabled={busy || Boolean(working)} onClick={() => modal.confirm({ title: '恢复网络：停用 AppRoute 专属规则与自动策略', content: '保留原有订阅、代理组、系统代理和 TUN 设置，重新加载当前原有配置。', okText: '恢复网络', cancelText: '取消', onOk: () => run('recover') })}>恢复网络</Button></Space></div>
    <div className="proxy-group-current" aria-live="polite"><strong>组当前选择：</strong>{status?.connected && !status.proxyGroup ? '尚未绑定，请选择常用代理组' : proxyOutletLabel(outlet)}{outlet?.chain.length && outlet.chain.length > 2 ? <small>{outlet.chain.join(' → ')}</small> : null}
      <small>{outlet?.checkedAt ? `最近节点探测：${new Date(outlet.checkedAt).toLocaleTimeString()} · ${outlet.delay ? `${outlet.delay} ms` : '失败'}${outlet.health === 'unknown' ? '（记录已过期）' : ''}；应用实际出口以连接记录为准。` : '节点已选中不代表网络可用，尚无近期探测证据；可运行网络自检。'}</small>
    </div>
    <p className="routing-policy-hint">在 Clash Party 切换“{status?.proxyGroup ?? '已绑定代理组'}”的节点，新连接会自动跟随，无需逐个设置；现有连接可能保留旧节点。<br />更换跟随组时，点击“绑定全部代理应用”统一更新；直接联网和按规则的应用保持原设置。</p>
    {status?.strategyWarning && <Alert type="warning" showIcon title={status.strategyWarning} />}
    {legacy && <Alert type="warning" showIcon title="仍有应用保留旧出口" description="这些应用还没有统一跟随，已保存目标见应用行。绑定代理组后会统一迁移，失败自动恢复。" />}
    {outlet?.type === 'Selector' && <p className="routing-policy-hint">这是手动选择组，节点失效后需要你在 Clash Party 换节点。需要自动避开故障时，可在该组中选择已有的自动选择／故障转移组。</p>}
    {outlet && (['direct', 'reject', 'missing', 'unknown'].includes(outlet.kind) || outlet.health === 'unhealthy') && <Alert type="warning" showIcon title={proxyOutletLabel(outlet)} description="跟随的是组的真实选择，不保证始终经远端代理。AppRoute 不会擅自改组或切换节点；请在 Clash Party 调整，组消失时可在这里重新绑定。" />}
    {status?.pending && <Alert type="info" showIcon title="正在自动检查，独立恢复守护已启动" description="检查通过后自动保留；失败或处理意外中断时恢复上一版设置，最长 120 秒。" />}
    {(error || status?.warning) && <Alert type="info" showIcon title={error || status?.warning} />}
    <Collapse ghost items={[{ key: 'inspection', label: `生效检查与离线恢复 · 已管理 ${status?.managed.length ?? 0} 个应用`, children: <>
      <p>配置状态：{status?.managed.length ? status.rulesLoaded ? '规则已在内核加载；逐个应用的新连接状态见列表' : '未确认加载' : '没有 AppRoute 专属规则'}</p>
      <p>客户端持久化：{status?.persistenceObserved ? '已观察到客户端重新生成 AppRoute 规则' : '尚未观察到客户端重新生成；当前加载与重启后保留分别验证'}</p>
      {status?.evidence.map((item, i) => <div className="connection-evidence" key={`${item.applicationId}-${i}`}><Tag color={item.matched ? 'green' : 'orange'}>{item.process}</Tag>{item.destination} → {item.outbound}{item.usesCurrentNode === false && ' · 与组当前选择不同（已有连接）'}</div>)}
      <p><strong>页面打不开时：</strong>{status?.recoveryReady ? '双击桌面的 AppRoute - Restore Network，不需要 ChatGPT 或网络。' : '首次应用前自动安装离线恢复工具；安装失败不会修改规则。'}</p>
      <code className="recovery-path">{status?.recoveryPath}</code>
      {status?.lastRecovery && <p>上次恢复：{status.lastRecovery}</p>}
      {checks.map(check => <p key={check.name}><Tag color={check.ok ? 'green' : 'orange'}>{check.ok ? '通过' : '待处理'}</Tag>{check.name}：{check.detail}</p>)}
    </> }]} />
  </section>
}
