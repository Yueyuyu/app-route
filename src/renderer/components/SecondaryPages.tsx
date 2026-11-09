import { Alert, Button, Table, Tag } from 'antd'
import { ApartmentOutlined, ArrowRightOutlined, GlobalOutlined, HomeOutlined, ExportOutlined } from '@ant-design/icons'
import { routeDescriptions, routeLabels, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'

export function DraftPage({ applications, onExport }: { applications: Application[]; onExport: () => void }) {
  const rules = applications.filter((app) => app.mode !== 'rule')
  return <section className="secondary-page">
    <div className="page-heading"><div><h1>规则草稿</h1><p>这里保存你的选择，接入 Clash Party 后才能应用。</p></div><Button icon={<ExportOutlined />} onClick={onExport}>导出草稿</Button></div>
    <Alert type="info" showIcon title="这是一份设置草稿，不是可直接导入 Clash 的配置文件。" description="代理组尚未指定，所有选择都还没有改变实际网络。按 Clash 规则的应用会保留原有分流。" />
    <div className="draft-heading"><h2>应用专属设置</h2><span>{rules.length} 个应用</span></div>
    <Table rowKey="id" pagination={false} dataSource={rules} locale={{ emptyText: '目前所有应用都按 Clash 规则，没有专属设置。' }} columns={[
      { title: '应用', dataIndex: 'name', render: (_, app) => <div className="draft-app"><ApplicationIcon name={app.name} icon={app.icon} /><strong>{app.name}</strong></div> },
      { title: '连接方式', dataIndex: 'mode', render: (mode: RouteMode) => <Tag color={mode === 'direct' ? 'green' : 'blue'}>{routeLabels[mode]}</Tag> },
      { title: '适用进程', dataIndex: 'processes', responsive: ['md'], render: (processes: string[]) => <span className="process-label">{processes.join('、')}</span> },
    ]} />
    <p className="draft-note">强制走代理的应用：代理来源为 Clash Party，代理组将在实际接入时选择。</p>
  </section>
}

export function HelpPage() {
  const entries = [
    { mode: 'rule' as const, icon: <ApartmentOutlined />, example: '适合浏览器：访问国内网站直连，访问国外网站走代理，具体以现有规则为准。', flow: ['应用', 'Clash Party 现有规则', '直连或代理节点'] },
    { mode: 'direct' as const, icon: <HomeOutlined />, example: '适合 QQ 音乐、国内会议等应用。仍可能由 Clash 接管后直连，不代表绕过 Clash 程序。', flow: ['应用', '本地网络', '目标网站'] },
    { mode: 'proxy' as const, icon: <GlobalOutlined />, example: '适合需要固定使用代理的软件。被识别并接管的连接使用指定代理组，组内节点可能按设置切换。', flow: ['应用', 'Clash Party 指定代理组', '目标网站'] },
  ]
  return <section className="secondary-page help-page"><div className="page-heading"><div><h1>连接方式说明</h1><p>当前预览以 Clash Party 为首版接入目标，下面说明该接入方式的含义。</p></div></div>
    {entries.map((entry) => <article className={`help-entry help-${entry.mode}`} key={entry.mode}><div className="help-icon">{entry.icon}</div><div><h2>{routeLabels[entry.mode]}</h2><p>{routeDescriptions[entry.mode]}</p><p className="help-example">{entry.example}</p><div className="route-flow">{entry.flow.map((step, index) => <span key={step}>{index > 0 && <ArrowRightOutlined />}<span>{step}</span></span>)}</div></div></article>)}
    <Alert showIcon type="info" title="当前版本：界面预览与本机应用扫描" description="修改会自动保存为浏览器本地草稿。当前没有连接 Clash 控制接口，不会改变网络。扫描无法覆盖所有便携版、商店应用和子进程；可以在应用详情中补充进程。" />
  </section>
}
