import { t } from '../i18n'
import { Alert, Button, Collapse, Empty, Table, Tag } from 'antd'
import { ApartmentOutlined, GlobalOutlined, HomeOutlined, ExportOutlined } from '@ant-design/icons'
import { routeDescriptions, routeLabels, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { ApplicationStatus } from './ApplicationStatus'
import { HelpTip } from './HelpTip'
import type { IntegrationStatus } from '../../shared/integration'
import { managedFor } from '../../core/applicationInventory'
import { outletLabel } from '../i18n'

export function DraftPage({ applications, status, onExport, onDetails }: { applications: Application[]; status?: IntegrationStatus; onExport: () => void; onDetails: (app: Application) => void }) {
  const rules = applications.filter(app => app.mode !== 'rule')
  const hasUntrackedRules = Boolean(status?.untrackedRuleCount)
  return <section className="secondary-page">
    <div className="page-heading"><div><h1>{t("分流规则")}</h1><p>{t("查看 AppRoute 已保存的专属设置。")}</p></div><Button icon={<ExportOutlined />} disabled={hasUntrackedRules} onClick={onExport}>{t("导出记录")}</Button></div>
    {hasUntrackedRules && <Alert className="inventory-update" type="warning" showIcon title={t("存在历史运行规则，当前列表缺少对应管理记录")} description={t("请在应用管理的连接详情中核对。记录恢复前暂不可导出。")} />}
    <div className="rules-overview"><span><strong>{t(hasUntrackedRules ? "{0} 个应用有管理记录" : "{0} 个应用已设分流", [rules.length])}</strong></span><span><i className="legend-dot direct" />{t("直接联网")} · {rules.filter(app => app.mode === 'direct').length}</span><span><i className="legend-dot proxy" />{t("跟随代理组")} · {rules.filter(app => app.mode === 'proxy').length}</span><HelpTip title={t("分流规则")}><p>{t("这里只列出 AppRoute 管理的专属规则；未设置的应用继续沿用 Clash Party 原有规则。")}</p><p>{t("导出的是设置记录，不能直接作为 Clash 配置导入，也不是实际连接已验证的证明。")}</p></HelpTip></div>
    <Table className="rules-table" rowKey="id" pagination={rules.length > 12 ? { pageSize: 12, showSizeChanger: false } : false} dataSource={rules} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasUntrackedRules ? t("管理记录缺失，请先核对历史规则") : t("暂无专属规则，可在应用管理中设置")} /> }} columns={[
      { title: t("应用"), key: 'app', render: (_, app) => <button className="application-name" onClick={() => onDetails(app)}><ApplicationIcon name={app.name} icon={app.icon} application={app} /><span className="application-label"><strong>{app.name}</strong><span className="process-label">{t("{0} 个进程", [app.processes.length])}</span></span></button> },
      { title: t("联网方式"), dataIndex: 'mode', width: 136, render: (mode: RouteMode) => <Tag color={mode === 'direct' ? 'green' : 'blue'}>{t(routeLabels[mode])}</Tag> },
      { title: <span>{t("预期出口")}<HelpTip title={t("预期出口")}>{t("显示规则指向的出口，以及代理组当前选择。已有连接可能继续使用旧节点；实际连接证据请打开应用详情查看。")}</HelpTip></span>, key: 'target', responsive: ['lg'], render: (_, app) => <span className="rule-outlet">{app.mode === 'direct' ? t("本地直连") : status?.connected ? outletLabel(status.outlets?.[managedFor(app, status.managed)?.target ?? '']) : t("待连接后确认")}</span> },
      { title: t("状态"), key: 'status', width: 180, responsive: ['md'], render: (_, app) => <ApplicationStatus application={app} status={status} onDetails={() => onDetails(app)} /> },
      { title: '', key: 'details', width: 70, render: (_, app) => <Button type="link" onClick={() => onDetails(app)}>{t("详情")}</Button> },
    ]} />
  </section>
}

export function HelpPage() {
  const entries = [
    { mode: 'rule' as const, icon: <ApartmentOutlined />, description: t("保持原样，让 Clash Party 的原有规则决定每条连接的出口。"), example: t("适合：不需要单独设置的应用") },
    { mode: 'direct' as const, icon: <HomeOutlined />, description: t("识别并进入 Clash 的新连接使用本地网络，不经远端代理节点。"), example: t("例如：QQ 音乐、国内网盘") },
    { mode: 'proxy' as const, icon: <GlobalOutlined />, description: t("新连接交给已绑定的代理组，自动跟随组内选择。"), example: t("节点选择方式在“代理策略”中设置") },
  ]
  const questions = [
    { key: 'mine', label: t("“我的应用”为什么有这些软件？"), children: <p>{t("你收藏的应用，以及已设置“直接联网”或“跟随代理组”的应用，会显示在这里。它不是使用频率排行。取消收藏且改回“按 Clash 规则”后，该应用只留在全部应用中。")}</p> },
    { key: 'search', label: t("怎么查找新装的软件？"), children: <p>{t("搜索框始终查找全部应用，支持应用名称、进程名和路径，不区分大小写与空格。新安装的应用会自动发现；还没出现时点击“扫描应用”，便携软件可通过“添加应用”选择程序文件。分类、联网方式与收藏筛选仍会生效，可点击“清除筛选”。")}</p> },
    { key: 'status', label: t("蓝色、绿色和黄色状态有什么区别？"), children: <div className="status-guide"><p><Tag color="blue">{t("规则已加载")}</Tag>{t("设置已写入内核，等待观察新连接。")}</p><p><Tag color="success">{t("已验证新连接")}</Tag>{t("已经观察到符合设置的连接，不代表所有进程与所有流量均已验证。")}</p><p><Tag color="warning">{t("需要检查")}</Tag>{t("如节点不可用、辅助进程待补充等。")}</p><p><Tag color="error">{t("异常")}</Tag>{t("规则不一致或应用失败。点击状态查看原因。")}</p></div> },
    { key: 'strategy', label: t("代理策略怎么选？切换后多久生效？"), children: <><p>{t("沿用现有策略：继续跟随 Clash Party 的已有组。故障备用：按你排列的优先顺序使用可用节点。延迟优先：由 Mihomo 根据探测延迟选择候选节点。")}</p><p>{t("后两种创建 AppRoute 专用组，不改原有组。所有候选不可用时不会自动直连。延迟不等于下载速度；已有连接可能保留原节点，后续新连接才跟随新选择。")}</p></> },
    { key: 'limits', label: t("与 Clash Party 的规则模式有什么关系？"), children: <><p>{t("Clash Party 继续保持规则模式。AppRoute 只为指定应用增加优先规则，不会把整台电脑改成全局代理。")}</p>{entries.map(entry => <p key={entry.mode}><strong>{t(routeLabels[entry.mode])}：</strong>{t(routeDescriptions[entry.mode])}</p>)}<p>{t("未进入 Clash 或未识别的进程无法保证符合设置；代理组若选择 DIRECT / REJECT，会按真实选择直连或拒绝。")}</p></> },
    { key: 'recovery', label: t("如果断网，怎么恢复？"), children: <><p>{t("页面可用时点击“恢复网络”，停用 AppRoute 专属规则，保留原有订阅、代理组及系统网络设置。")}</p><p>{t("页面打不开时，双击桌面的 AppRoute - Restore Network，无需网络或 ChatGPT。应用失败会自动回退，意外中断由独立守护兜底。")}</p><p>{t("当前仍为预览版；客户端重启、订阅切换的持久化验收状态见“连接详情”。")}</p></> },
  ]
  return <section className="secondary-page help-page"><div className="page-heading"><div><h1>{t("使用帮助")}</h1><p>{t("选应用、选联网方式，再看状态。")}</p></div></div>
    <div className="quick-start"><span><b>1</b>{t("找到或收藏应用")}</span><span><b>2</b>{t("点击联网方式")}</span><span><b>3</b>{t("查看加载与连接状态")}</span></div>
    <div className="help-cards">{entries.map(entry => <article className={'help-card help-' + entry.mode} key={entry.mode}><div className="help-icon">{entry.icon}</div><h2>{t(routeLabels[entry.mode])}</h2><p>{entry.description}</p><small>{entry.example}</small></article>)}</div>
    <h2 className="section-heading">{t("常见问题")}</h2><Collapse className="help-questions" items={questions} />
  </section>
}
