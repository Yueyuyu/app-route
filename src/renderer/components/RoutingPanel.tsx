import { Alert, App, Button, Collapse, Select, Space, Tag } from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { DiagnosticCheck, IntegrationStatus } from '../../shared/integration'
import { integrationRequest } from '../hooks/useRoutingIntegration'

interface Props { status?: IntegrationStatus; error: string; refresh: () => Promise<unknown>; busy: boolean; target?: string; setTarget: (value: string) => void }
export function RoutingPanel({ status, error, refresh, busy, target, setTarget }: Props) {
  const { modal, message } = App.useApp()
  const [working, setWorking] = useState('')
  const [checks, setChecks] = useState<DiagnosticCheck[]>([])
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
      <span>走代理时使用</span><Select aria-label="代理出口" placeholder="请选择代理出口" disabled={busy || Boolean(working) || Boolean(status?.pending)} value={target} onChange={setTarget} showSearch optionFilterProp="label" style={{ width: 230 }} options={status?.choices.map(choice => ({ value: choice.name, label: `${choice.name}${['Selector', 'Fallback', 'URLTest'].includes(choice.type) ? ` → ${choice.current}` : ''}` }))} />
    </Space><Space wrap><Button icon={<ReloadOutlined />} loading={working === 'diagnose'} disabled={busy || Boolean(working)} onClick={() => void run('diagnose')}>网络自检</Button><Button danger icon={<SafetyCertificateOutlined />} disabled={busy || Boolean(working)} onClick={() => modal.confirm({ title: '恢复网络：停用 AppRoute 专属规则', content: '保留原有订阅、代理组、系统代理和 TUN 设置，重新加载当前原有配置。', okText: '恢复网络', cancelText: '取消', onOk: () => run('recover') })}>恢复网络</Button></Space></div>
    {status?.pending && <Alert type="info" showIcon title="正在自动检查，独立恢复守护已启动" description="检查通过后自动保留；失败或处理意外中断时恢复上一版设置，最长 120 秒。" />}
    {(error || status?.warning) && <Alert type="info" showIcon title={error || status?.warning} />}
    <Collapse ghost items={[{ key: 'inspection', label: `生效检查与离线恢复 · 已管理 ${status?.managed.length ?? 0} 个应用`, children: <>
      <p>配置状态：{status?.managed.length ? status.rulesLoaded ? '规则已在内核加载；逐个应用的新连接状态见列表' : '未确认加载' : '没有 AppRoute 专属规则'}</p>
      <p>客户端持久化：{status?.persistenceObserved ? '已观察到客户端重新生成 AppRoute 规则' : '尚未观察到客户端重新生成；当前加载与重启后保留分别验证'}</p>
      {status?.evidence.map((item, i) => <div className="connection-evidence" key={`${item.applicationId}-${i}`}><Tag color={item.matched ? 'green' : 'orange'}>{item.process}</Tag>{item.destination} → {item.outbound}</div>)}
      <p><strong>页面打不开时：</strong>{status?.recoveryReady ? '双击桌面的 AppRoute - Restore Network，不需要 ChatGPT 或网络。' : '首次应用前自动安装离线恢复工具；安装失败不会修改规则。'}</p>
      <code className="recovery-path">{status?.recoveryPath}</code>
      {status?.lastRecovery && <p>上次恢复：{status.lastRecovery}</p>}
      {checks.map(check => <p key={check.name}><Tag color={check.ok ? 'green' : 'orange'}>{check.ok ? '通过' : '待处理'}</Tag>{check.name}：{check.detail}</p>)}
    </> }]} />
  </section>
}
