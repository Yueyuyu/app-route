import { Alert, Button, Table, Tag } from 'antd'
import { ApartmentOutlined, ArrowRightOutlined, GlobalOutlined, HomeOutlined, ExportOutlined } from '@ant-design/icons'
import { routeDescriptions, routeLabels, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'

export function DraftPage({ applications, onExport }: { applications: Application[]; onExport: () => void }) {
  const rules = applications.filter((app) => app.mode !== 'rule')
  return <section className="secondary-page">
    <div className="page-heading"><div><h1>应用设置</h1><p>显示后台已记录的专属设置，实际新连接验证见应用管理。</p></div><Button icon={<ExportOutlined />} onClick={onExport}>导出设置记录</Button></div>
    <Alert type="info" showIcon title="设置记录不是可直接导入 Clash 的配置文件。" description="保存的规则和实际连接分开验证；查看应用管理中的状态，不将导出记录当作生效证明。" />
    <div className="draft-heading"><h2>应用专属设置</h2><span>{rules.length} 个应用</span></div>
    <Table rowKey="id" pagination={false} dataSource={rules} locale={{ emptyText: '目前所有应用都按 Clash 规则，没有专属设置。' }} columns={[
      { title: '应用', dataIndex: 'name', render: (_, app) => <div className="draft-app"><ApplicationIcon name={app.name} icon={app.icon} application={app} /><strong>{app.name}</strong></div> },
      { title: '连接方式', dataIndex: 'mode', render: (mode: RouteMode) => <Tag color={mode === 'direct' ? 'green' : 'blue'}>{routeLabels[mode]}</Tag> },
      { title: '适用进程', dataIndex: 'processes', responsive: ['md'], render: (processes: string[]) => <span className="process-label">{processes.join('、')}</span> },
    ]} />
    <p className="draft-note">强制走代理的应用：代理来源为 Clash Party，请在应用管理页选择实际出口。</p>
  </section>
}

export function HelpPage() {
  const entries = [
    { mode: 'rule' as const, icon: <ApartmentOutlined />, example: '适合浏览器：访问国内网站直连，访问国外网站走代理，具体以现有规则为准。', flow: ['应用', 'Clash Party 现有规则', '直连或代理节点'] },
    { mode: 'direct' as const, icon: <HomeOutlined />, example: '适合 QQ 音乐、国内会议等应用。仍可能由 Clash 接管后直连，不代表绕过 Clash 程序。', flow: ['应用', '本地网络', '目标网站'] },
    { mode: 'proxy' as const, icon: <GlobalOutlined />, example: '适合需要固定使用代理的软件。被识别并接管的连接使用指定代理组，组内节点可能按设置切换。', flow: ['应用', 'Clash Party 指定代理组', '目标网站'] },
  ]
  return <section className="secondary-page help-page"><div className="page-heading"><div><h1>连接方式说明</h1><p>当前已接入 Clash Party，下面说明三种连接方式的含义。</p></div></div>
    {entries.map((entry) => <article className={`help-entry help-${entry.mode}`} key={entry.mode}><div className="help-icon">{entry.icon}</div><div><h2>{routeLabels[entry.mode]}</h2><p>{routeDescriptions[entry.mode]}</p><p className="help-example">{entry.example}</p><div className="route-flow">{entry.flow.map((step, index) => <span key={step}>{index > 0 && <ArrowRightOutlined />}<span>{step}</span></span>)}</div></div></article>)}
    <Alert showIcon type="info" title="当前版本：Clash Party 接入与独立恢复" description="启动后显示本机软件，点击联网方式自动应用并检查，失败自动恢复；处理中断时由独立守护在 120 秒内回退。辅助进程按运行关系和安装路径识别；未使用系统代理的流量不一定被接管。" />
  </section>
}
