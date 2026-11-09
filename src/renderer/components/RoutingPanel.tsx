import { useEffect, useState } from 'react'
import { Alert, App, Button, Collapse, Select, Space, Tag } from 'antd'
import { SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Application } from '../../shared/application.ts'
import type { DiagnosticCheck } from '../../shared/integration.ts'
import { integrationRequest, useRoutingIntegration } from '../hooks/useRoutingIntegration.ts'
import { routeLabels } from '../types'

export function RoutingPanel({ selected, onApplied }: { selected: Application[]; onApplied: () => void }) {
  const { status, error, refresh } = useRoutingIntegration()
  const { modal, message } = App.useApp()
  const [target, setTarget] = useState<string>()
  const [busy, setBusy] = useState('')
  const [checks, setChecks] = useState<DiagnosticCheck[]>([])
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  async function run(action: string, body: unknown = {}) {
    setBusy(action)
    try {
      const result = await integrationRequest<any>(action, body)
      if (action === 'diagnose') setChecks(result)
      else if (action === 'recover') void (result.restored ? message.success(result.message) : message.warning(result.message))
      else if (action === 'apply') { onApplied(); void message.success('已开始试运行，请检查网络后点击保留设置。') }
      else void message.success(action === 'confirm' ? '设置已保留' : '已恢复上一次设置')
    } catch (e) { void message.error(e instanceof Error ? e.message : '操作失败', 8) }
    finally { await refresh(); setBusy('') }
  }
  const hasExamples = selected.some(app => app.source === 'example')
  const needsProxy = selected.some(app => app.mode === 'proxy')
  const pending = status?.pending
  const canApply = Boolean(status?.connected && status.mode === 'rule' && selected.length && !hasExamples && (!needsProxy || target) && !pending)
  function previewApply() {
    modal.confirm({
      title: `应用 ${selected.length} 个应用的分流设置`,
      content: <><p>{selected.map(app => `${app.name}：${routeLabels[app.mode]}`).join('；')}</p><p>先试运行 120 秒，未确认将由独立进程自动恢复。已有连接可能需要重新连接。</p></>,
      okText: '开始试运行', cancelText: '取消',
      onOk: () => run('apply', { revision: status?.revision, target, applications: selected.map(({ icon: _icon, path: _path, ...app }) => app) }),
    })
  }
  return <section className="routing-panel" aria-label="实际分流与网络恢复">
    <div className="routing-toolbar"><Space wrap>
      <Tag color={status?.connected ? 'green' : 'default'}>{status?.connected ? `Clash Party 已连接 · ${status.version}` : 'Clash Party 未连接'}</Tag>
      <span>代理出口</span><Select aria-label="代理出口" placeholder="请选择纯代理出口" value={target} onChange={setTarget} showSearch optionFilterProp="label" style={{ width: 230 }} options={status?.choices.map(choice => ({ value: choice.name, label: `${choice.name}${choice.type === 'Selector' || choice.type === 'Fallback' ? ` → ${choice.current}` : ''}` }))} />
      <Button type="primary" disabled={!canApply || Boolean(busy)} loading={busy === 'apply'} onClick={previewApply}>应用所选 {selected.length || ''}</Button>
    </Space><Space wrap><Button icon={<ReloadOutlined />} loading={busy === 'diagnose'} disabled={Boolean(busy)} onClick={() => void run('diagnose')}>网络自检</Button><Button danger icon={<SafetyCertificateOutlined />} disabled={Boolean(busy)} onClick={() => modal.confirm({ title: '恢复网络：停用 AppRoute 专属规则', content: '保留原有订阅、代理组、系统代理和 TUN 设置，重新加载当前 Clash Party 原有配置。', okText: '恢复网络', cancelText: '取消', onOk: () => run('recover') })}>恢复网络</Button></Space></div>
    {pending && <Alert type="warning" showIcon title={`试运行中：${Math.max(0, Math.ceil((pending.deadline - now) / 1000))} 秒后自动恢复`} description="请先确认常用网站和应用能联网。关闭页面或 AppRoute 服务不会取消独立恢复倒计时。" action={<Space><Button type="primary" disabled={Boolean(busy)} onClick={() => void run('confirm', { id: pending.id })}>保留设置</Button><Button disabled={Boolean(busy)} onClick={() => void run('rollback', { id: pending.id })}>撤销本次</Button></Space>} />}
    {(error || status?.warning || hasExamples) && <Alert type="info" showIcon title={error || (hasExamples ? '所选列表包含示例应用，请扫描或手动添加真实应用后再应用。' : status?.warning)} />}
    <Collapse ghost items={[{ key: 'inspection', label: `生效检查与离线恢复 · 已管理 ${status?.managed.length ?? 0} 个应用`, children: <>
      <p>配置状态：{status?.managed.length ? status.rulesLoaded ? '已在内核加载；仍需观察实际新连接' : '未确认加载' : '没有 AppRoute 专属规则'}</p>
      <p>Clash Party 持久化：{status?.persistenceObserved ? '已观察到客户端生成的 AppRoute 规则' : '尚未观察到客户端重新生成规则；首次接入需重新打开 Clash Party 验证'}</p>
      {status?.managed.map(app => { const evidence = status.evidence.filter(item => item.applicationId === app.id); return <p key={app.id}><strong>{app.name}</strong> · {routeLabels[app.mode]} {app.target ? `→ ${app.target}` : ''} · {evidence.length ? evidence.every(item => item.matched) ? '检测到符合设置的新连接' : '检测到不符合设置的连接，请检查' : '尚未检测到新连接'}</p> })}
      {status?.evidence.map((item, i) => <div className="connection-evidence" key={`${item.applicationId}-${i}`}><Tag color={item.matched ? 'green' : 'orange'}>{item.process}</Tag>{item.destination} → {item.outbound}</div>)}
      <p><strong>断网或页面打不开时：</strong>{status?.recoveryReady ? '双击桌面的 AppRoute - Restore Network，或下面的独立工具；不需要 ChatGPT、网络或 npm。' : '首次应用前会自动安装独立恢复工具和桌面快捷方式；安装失败不会修改规则。'}</p>
      <code className="recovery-path">{status?.recoveryPath}</code>
      <p>恢复只撤销 AppRoute 的规则，不重置网卡或清空原有代理。首次登记后需要 Clash Party 重新读取覆写列表；订阅刷新后可在这里检查是否仍已加载。</p>
      {status?.lastRecovery && <p>上次恢复：{status.lastRecovery}</p>}
      {checks.map(check => <p key={check.name}><Tag color={check.ok ? 'green' : 'orange'}>{check.ok ? '通过' : '待处理'}</Tag>{check.name}：{check.detail}</p>)}
    </> }]} />
  </section>
}
