import { t, formatTime } from '../i18n'
import { Alert, App, Button, Collapse, Descriptions, Drawer, Empty, Tag } from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { DiagnosticCheck, IntegrationStatus } from '../../shared/integration'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { outletLabel } from '../i18n'
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
  const currentNode = !status?.connected ? t("等待连接") : !status.proxyGroup ? t("尚未选择代理组") : outletLabel(outlet)
  const legacy = status?.managed.some(app => app.mode === 'proxy' && app.target !== status.proxyGroup)
  const nodeWarning = outlet && (['direct', 'reject', 'missing', 'unknown'].includes(outlet.kind) || outlet.health === 'unhealthy')
  async function run(action: string) {
    setWorking(action)
    try {
      if (action === 'diagnose') { setChecks(await integrationRequest<DiagnosticCheck[]>(action, {})); setInspectionOpen(true) }
      else { const result = await integrationRequest<{ restored: boolean; message: string }>(action, {}); void (result.restored ? message.success(t(result.message)) : message.warning(t(result.message))) }
    } catch (e) { void message.error(t(e instanceof Error ? e.message : "操作失败")) }
    finally { await refresh(); setWorking('') }
  }
  function recover() {
    modal.confirm({ title: t("恢复到 AppRoute 接管前的规则？"), content: <div className="confirmation-copy"><p>{t("停用所有 AppRoute 专属分流和自动策略，应用重新沿用 Clash Party 原有规则。")}</p><p>{t("保留原有订阅、代理组、系统代理和 TUN 设置。")}</p></div>, okText: t("恢复原有规则"), cancelText: t("取消"), okButtonProps: { danger: true }, onOk: () => run('recover') })
  }
  return <>
    <section className="routing-panel" aria-label={t("代理与网络状态")}>
      <div className="routing-summary">
        <div className="routing-summary-copy"><span className="eyebrow">{t("当前代理策略")}</span><strong>{status?.proxyGroup ?? t("尚未设置代理组")} <HelpTip title={t("代理策略")}><p>{t(strategyLabels[status?.proxyStrategy?.mode ?? 'existing'])}{t("。只影响选择“跟随代理组”的应用。")}</p><p>{t("组当前选择与应用实际使用的节点分别显示。新连接跟随选择，旧连接不会强制断开。")}</p></HelpTip></strong><span className="current-node">{t("当前节点：")}{currentNode}</span></div>
        <div className="routing-summary-actions"><ProxyStrategyDrawer status={status} busy={busy || Boolean(working)} apply={setProxyStrategy} /><Button onClick={() => setInspectionOpen(true)}>{t("连接详情")}</Button><Button danger icon={<SafetyCertificateOutlined />} disabled={busy || Boolean(working)} onClick={recover}>{t("恢复网络")}</Button></div>
      </div>
      {error || !status?.connected ? <Alert className="compact-alert" type="warning" showIcon title={error ? t("连接中断，请检查 Clash Party") : status ? t("尚未连接 Clash Party") : t("正在连接 Clash Party…")} action={<Button size="small" onClick={() => void refresh()}>{t("重试")}</Button>} /> : null}
      {status?.strategyWarning && <Alert className="compact-alert" type="warning" showIcon title={t(status.strategyWarning)} />}
      {Boolean(status?.untrackedRuleCount) && <Alert className="compact-alert" type="warning" showIcon title={t("{0} 条历史规则仍在运行，管理记录缺失", [status!.untrackedRuleCount])} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("查看详情")}</Button>} />}
      {status?.connected && status.mode !== 'rule' && <Alert className="compact-alert" type="warning" showIcon title={t("Clash Party 当前不是规则模式，应用分流可能不按预期执行。")} />}
      {legacy && <Alert className="compact-alert" type="warning" showIcon title={t("部分应用仍使用旧出口，请在代理策略中统一绑定。")} />}
      {nodeWarning && <Alert className="compact-alert" type="warning" showIcon title={outletLabel(outlet)} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("查看原因")}</Button>} />}
      {status?.connected && status.managed.length > 0 && !status.rulesLoaded && !status.pending && <Alert className="compact-alert" type="error" showIcon title={t("已保存规则与当前运行状态不一致")} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("检查")}</Button>} />}
      {status?.pending && <div className="transaction-progress" role="status">{t("正在自动检查 · 失败将恢复上一版设置")}</div>}
    </section>
    <Drawer title={t("连接详情与恢复")} open={inspectionOpen} onClose={() => setInspectionOpen(false)} size={580}
      footer={<div className="drawer-footer"><Button onClick={() => setInspectionOpen(false)}>{t("关闭")}</Button><Button icon={<ReloadOutlined />} loading={working === 'diagnose'} disabled={busy || Boolean(working)} onClick={() => void run('diagnose')}>{t("网络自检")}</Button><Button danger disabled={busy || Boolean(working)} onClick={recover}>{t("恢复网络")}</Button></div>}>
      <div className="detail-section"><h3>Clash Party <Tag color={status?.connected ? 'success' : 'default'}>{status?.connected ? t("已连接") : t("未连接")}</Tag></h3>
        <p className="secondary-copy">{t("连接状态来自内核控制接口；不代表所有节点都可用。")}</p>
        <Descriptions column={1} size="small" items={[
          { key: 'version', label: t("内核版本"), children: status?.version ?? t("未读取") },
          { key: 'strategy', label: t("代理策略"), children: t(strategyLabels[status?.proxyStrategy?.mode ?? 'existing']) },
          { key: 'node', label: t("组当前选择"), children: currentNode },
          { key: 'probe', label: t("最近探测"), children: outlet?.checkedAt ? formatTime(outlet.checkedAt) + ' · ' + (outlet.delay ? outlet.delay + ' ms' : t("失败")) + (outlet.health === 'unknown' ? t("（记录已过期）") : '') : t("尚无近期记录，可运行网络自检") },
        ]} />
        {error && <Alert type="error" showIcon title={t(error)} />}
      </div>
      <div className="detail-section"><h3>{t("规则与验证")}</h3><Descriptions column={1} size="small" items={[
        { key: 'rules', label: t("运行规则"), children: !status?.connected ? t("待连接后确认") : status.untrackedRuleCount ? t("{0} 条历史规则仍在运行，管理记录缺失", [status.untrackedRuleCount]) : status.managed.length ? status.rulesLoaded ? t("规则已加载 · {0} 个应用", [status.managed.length]) : t("规则未确认加载") : t("无专属规则") },
        { key: 'persistence', label: t("重启后保留"), children: status?.untrackedRuleCount ? t("记录缺失，无法确认") : !status?.managed.length ? t("无专属设置，无需验证") : status.persistenceObserved ? t("已观察到客户端重新生成规则") : t("尚未验证") },
      ]} />{status?.warning && <Alert type="info" showIcon title={t(status.warning)} />}</div>
      <div className="detail-section"><h3>{t("离线恢复")}</h3><p>{status?.recoveryReady ? t("双击桌面的 AppRoute - Restore Network，无需联网即可恢复。") : t("首次应用前会自动准备独立恢复工具。准备失败时不会修改规则。")}</p>{status?.recoveryPath && <code className="recovery-path">{status.recoveryPath}</code>}{status?.lastRecovery && <p className="secondary-copy">{t("上次恢复：")}{t(status.lastRecovery)}</p>}</div>
      <Collapse items={[{ key: 'checks', label: t("网络自检结果") + (checks.length ? ' · ' + checks.filter(check => check.ok).length + '/' + checks.length + ' ' + t("通过") : ''), children: checks.length ? checks.map(check => <div className="diagnostic-item" key={check.name}><Tag color={check.ok ? 'success' : 'warning'}>{check.ok ? t("通过") : t("待处理")}</Tag><strong>{t(check.name)}</strong><p>{t(check.detail)}</p></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("点击底部“网络自检”开始检查")} /> }]} />
    </Drawer>
  </>
}
