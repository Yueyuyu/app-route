import { deferredFeature } from './deferredFeature'
import { t } from '../i18n'
import { Alert, App, Button, Drawer } from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import type { IntegrationStatus } from '../../shared/integration'
import type { NetworkDiagnostics } from '../hooks/useNetworkDiagnostics'
import { integrationRequest } from '../hooks/useRoutingIntegration'
import { outletLabel } from '../i18n'
import { ProxyStrategyDrawer } from './ProxyStrategyDrawer'
import { HelpTip } from './HelpTip'
import { strategyLabels, type ProxyStrategy } from '../../shared/proxyStrategy'

const ConnectionInspector = deferredFeature(() => import('./ConnectionInspector').then(module => ({ default: module.ConnectionInspector })))

interface Props {
  status?: IntegrationStatus; error: string; refresh: () => Promise<unknown>; busy: boolean
  setProxyStrategy: (value: ProxyStrategy, revision: string, missingTargetAction?: 'block' | 'original') => Promise<void>
  inspectionOpen: boolean; setInspectionOpen: (open: boolean) => void
  tab: string; setTab: (tab: string) => void; diagnostics: NetworkDiagnostics
}
export function RoutingPanel({ status, error, refresh, busy: applying, setProxyStrategy, inspectionOpen, setInspectionOpen, tab, setTab, diagnostics }: Props) {
  const { modal, message } = App.useApp()
  const [working, setWorking] = useState('')
  const inspectionClose = useRef<HTMLButtonElement>(null)
  const busy = applying || diagnostics.busy
  const outlet = status?.proxyGroup ? status.outlets?.[status.proxyGroup] : undefined
  const currentNode = !status?.connected ? t("等待连接") : !status.proxyGroup ? t("尚未选择代理组") : outletLabel(outlet)
  const legacy = status?.managed.some(app => app.mode === 'proxy' && app.target !== status.proxyGroup)
  const nodeWarning = outlet && (['direct', 'reject', 'missing', 'unknown'].includes(outlet.kind) || outlet.health === 'unhealthy')
  async function run(action: string) {
    setWorking(action)
    try {
      if (action === 'diagnose') { if (await diagnostics.run()) { setTab('recovery'); setInspectionOpen(true) } }
      else { const result = await integrationRequest<{ restored: boolean; message: string }>(action, {}); void (result.restored ? message.success(t(result.message)) : message.warning(t(result.message))) }
    } catch (e) { void message.error(t(e instanceof Error ? e.message : "操作失败")) }
    finally { if (action !== 'diagnose') await refresh(); setWorking('') }
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
      {Boolean(status?.untrackedRuleCount || status?.dataIssue) && <Alert className="compact-alert" type="warning" showIcon title={status?.dataIssue ? t("管理记录需要核对") : t("{0} 条历史规则仍在运行，管理记录缺失", [status!.untrackedRuleCount])} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("查看详情")}</Button>} />}
      {status?.connected && status.mode !== 'rule' && <Alert className="compact-alert" type="warning" showIcon title={t("Clash Party 当前不是规则模式，应用分流可能不按预期执行。")} />}
      {legacy && <Alert className="compact-alert" type="warning" showIcon title={t("部分应用仍使用旧出口，请在代理策略中统一绑定。")} />}
      {nodeWarning && <Alert className="compact-alert" type="warning" showIcon title={outletLabel(outlet)} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("查看原因")}</Button>} />}
      {status?.connected && status.managed.length > 0 && !status.rulesLoaded && !status.pending && <Alert className="compact-alert" type="error" showIcon title={t("已保存规则与当前运行状态不一致")} action={<Button size="small" onClick={() => setInspectionOpen(true)}>{t("检查")}</Button>} />}
      {status?.connected && !status.proxyGroup && !status.managed.length && !status.untrackedRuleCount && !status.dataIssue && <div className="first-use-guide"><strong>{t('开始使用')}</strong><span>{t('① 确认 Clash Party 已连接')}</span><span>{t('② 需要代理时，先选择代理策略')}</span><span>{t('③ 在全部应用中选择联网方式')}</span></div>}
      {status?.pending?.recoveryRequired && <Alert type="error" showIcon title={t('恢复尚未确认，请运行网络自检或离线恢复。')} />}
      {status?.pending && !status.pending.recoveryRequired && <div className="transaction-progress" role="status">{t("正在自动检查 · 失败将恢复上一版设置")}</div>}
    </section>
    <Drawer title={t("连接详情与恢复")} open={inspectionOpen} onClose={() => setInspectionOpen(false)} size={580} afterOpenChange={visible => { if (visible) inspectionClose.current?.focus() }}
      footer={<div className="drawer-footer"><Button ref={inspectionClose} onClick={() => setInspectionOpen(false)}>{t("关闭")}</Button><Button icon={<ReloadOutlined />} loading={diagnostics.busy} disabled={busy || Boolean(working)} onClick={() => void run('diagnose')}>{t("网络自检")}</Button><Button danger disabled={busy || Boolean(working)} onClick={recover}>{t("恢复网络")}</Button></div>}>
      {inspectionOpen && <ConnectionInspector status={status} error={error} diagnostics={diagnostics} tab={tab} setTab={setTab} refresh={refresh} busy={busy || Boolean(working)} />}
    </Drawer>
  </>
}
