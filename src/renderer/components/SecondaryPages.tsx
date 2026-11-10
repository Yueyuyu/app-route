import { Alert, Button, Table, Tag } from 'antd'
import { ApartmentOutlined, ArrowRightOutlined, GlobalOutlined, HomeOutlined, ExportOutlined } from '@ant-design/icons'
import { routeDescriptions, routeLabels, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import type { IntegrationStatus } from '../../shared/integration'
import { managedFor } from '../../core/applicationInventory'

export function DraftPage({ applications, status, onExport }: { applications: Application[]; status?: IntegrationStatus; onExport: () => void }) {
  const rules = applications.filter((app) => app.mode !== 'rule')
  return <section className="secondary-page">
    <div className="page-heading"><div><h1>应用设置</h1><p>显示后台已记录的专属设置，实际新连接验证见应用管理。</p></div><Button icon={<ExportOutlined />} onClick={onExport}>导出设置记录</Button></div>
    <Alert type="info" showIcon title="设置记录不是可直接导入 Clash 的配置文件。" description="保存的规则和实际连接分开验证；查看应用管理中的状态，不将导出记录当作生效证明。" />
    <div className="draft-heading"><h2>应用专属设置</h2><span>{rules.length} 个应用</span></div>
    <Table rowKey="id" pagination={false} dataSource={rules} locale={{ emptyText: '目前所有应用都按 Clash 规则，没有专属设置。' }} columns={[
      { title: '应用', dataIndex: 'name', width: 210, render: (_, app) => <div className="draft-app"><ApplicationIcon name={app.name} icon={app.icon} application={app} /><strong>{app.name}</strong></div> },
      { title: '连接方式', dataIndex: 'mode', width: 115, render: (mode: RouteMode) => <Tag color={mode === 'direct' ? 'green' : 'blue'}>{routeLabels[mode]}</Tag> },
      { title: '已保存出口', key: 'target', width: 210, render: (_, app) => app.mode === 'direct' ? 'DIRECT · 本地直连' : managedFor(app, status?.managed)?.target ?? '未确认，请检查' },
      { title: '适用进程', dataIndex: 'processes', responsive: ['md'], ellipsis: true, render: (processes: string[]) => <span className="process-label" title={processes.join('、')}>{processes.join('、')}</span> },
    ]} />
    <p className="draft-note">出口来自 Clash Party。此处显示每个应用已经保存的设置；修改应用管理顶部的下拉框不会自动修改这些记录。实际是否符合设置，请查看新连接验证。</p>
  </section>
}

export function HelpPage() {
  const entries = [
    { mode: 'rule' as const, icon: <ApartmentOutlined />, example: '例如原规则让百度直连、Google 使用“自动选择”组，同一个浏览器访问它们就会使用不同出口。并非所有国外网站都必然走同一节点，具体取决于你的规则。', flow: ['应用的新连接', 'Clash Party 原有规则', '规则决定直连或代理'] },
    { mode: 'direct' as const, icon: <HomeOutlined />, example: '例如 QQ 音乐选择直接联网，被识别的新连接走本地网络。系统代理仍可开启；AppRoute 不会关闭其他 VPN，也不承诺绕过电脑上的所有网络软件。', flow: ['应用的新连接', 'Clash 内核的 DIRECT', '本地网络 → 目标网站'] },
    { mode: 'proxy' as const, icon: <GlobalOutlined />, example: '例如选定“新加坡节点 A”，该应用被识别的新连接就优先使用它；选定“自动选择”组，则跟随这个组的策略。只有保存的是同一个代理组，才会跟随你在 Clash Party 对那个组的切换。', flow: ['应用的新连接', 'AppRoute 为应用保存的节点或组', '远端代理 → 目标网站'] },
  ]
  return <section className="secondary-page help-page"><div className="page-heading"><div><h1>连接方式说明</h1><p>当前已接入 Clash Party，下面说明三种连接方式的含义。</p></div></div>
    <Alert showIcon type="info" title="Clash 的规则模式，与这里的三个应用选项，是两个层次" description="Clash Party 保持规则模式。AppRoute 的“按 Clash 规则”沿用原有判断；“直接联网”和“指定代理”则给这个应用增加优先规则。它们不会把整台电脑切成全局代理。" />
    {entries.map((entry) => <article className={`help-entry help-${entry.mode}`} key={entry.mode}><div className="help-icon">{entry.icon}</div><div><h2>{routeLabels[entry.mode]}</h2><p>{routeDescriptions[entry.mode]}</p><p className="help-example">{entry.example}</p><div className="route-flow">{entry.flow.map((step, index) => <span key={step}>{index > 0 && <ArrowRightOutlined />}<span>{step}</span></span>)}</div></div></article>)}
    <Alert showIcon type="info" title="选了代理，不等于所有流量都已经验证" description="先选择出口，再点击应用行的“指定代理”。顶部只决定之后的应用操作，已有设置以各行保存的出口为准。未进入 Clash 或未识别的进程不保证符合设置，旧连接不会自动切换；“规则已加载”只表示规则存在，“已验证新连接”才表示观察到了符合设置的连接。" />
    <p className="draft-note">仅提供不含 DIRECT / REJECT 成员的代理出口。应用自检失败会撤销本次修改并显示结果；处理中断由独立守护兜底。正式发布前仍需完成客户端重启、订阅切换等验收。</p>
  </section>
}
