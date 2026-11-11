import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Tag } from 'antd'
import { EditOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { managedFor } from '../../core/applicationInventory'
import { proxyOutletLabel } from '../../core/proxyGroups'
import type { PendingRoute } from '../../core/routingQueue'
import type { IntegrationStatus } from '../../shared/integration'
import { routeLabels, type Application } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { ApplicationStatus } from './ApplicationStatus'

export function ApplicationDetails({ application, status, favorite, pending, failure, close, edit, toggleFavorite }: {
  application?: Application; status?: IntegrationStatus; favorite: boolean; pending?: PendingRoute; failure?: string
  close: () => void; edit: (app: Application) => void; toggleFavorite: (app: Application) => void
}) {
  const managed = application && managedFor(application, status?.managed)
  const evidence = status?.evidence.filter(item => item.applicationId === managed?.id) ?? []
  return <Drawer title="应用详情" open={Boolean(application)} onClose={close} size={560} footer={<div className="drawer-footer"><Button onClick={close}>关闭</Button>{application && <Button icon={<EditOutlined />} onClick={() => edit(application)}>编辑资料</Button>}</div>}>
    {application && <>
      {status && !status.connected && <Alert className="detail-offline" type="warning" showIcon title="连接已中断，以下保留最近一次读取的记录。" />}
      <div className="detail-app-heading"><ApplicationIcon name={application.name} icon={application.icon} application={application} /><div><h2>{application.name}</h2><span>{application.category}</span></div><Button aria-label={`${favorite ? '取消收藏' : '收藏'} ${application.name}`} aria-pressed={favorite} icon={favorite ? <StarFilled /> : <StarOutlined />} onClick={() => toggleFavorite(application)}>{favorite ? '已收藏' : '收藏'}</Button></div>
      <div className="detail-section"><h3>联网状态</h3><ApplicationStatus application={application} status={status} pending={pending} failure={failure} />
        <Descriptions column={1} size="small" items={[
          { key: 'mode', label: '已保存方式', children: status?.untrackedRuleCount ? '缺少记录，待核对' : routeLabels[application.mode] },
          ...(managed?.mode === 'proxy' ? [
            { key: 'target', label: '已绑定代理组', children: managed.target ?? '未指定' },
            { key: 'node', label: '组当前选择', children: proxyOutletLabel(status?.outlets?.[managed.target ?? '']) },
          ] : []),
          { key: 'membership', label: '我的应用收录', children: [favorite && '已收藏', application.mode !== 'rule' && '已设置专属分流'].filter(Boolean).join('、') || '尚未收录；收藏后即可加入' },
        ]} />
      </div>
      <div className="detail-section"><h3>实际连接 <small>{evidence.length} 条</small></h3>
        <p className="secondary-copy">只显示已观察到的连接；已有连接可能仍使用旧节点。</p>
        {evidence.length ? <div className="evidence-list">{evidence.map((item, index) => <div key={index}><strong>{item.process}</strong><Tag color={item.matched ? 'success' : 'error'}>{item.matched ? '符合设置' : '不符合设置'}</Tag><span>{item.destination} → {item.node ?? item.outbound}{item.usesCurrentNode === false ? '（旧节点）' : ''}</span></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未观察到新连接" />}
      </div>
      <Collapse items={[
        { key: 'processes', label: `主程序与辅助进程 · ${application.processes.length} 个`, children: <><p className="secondary-copy">应用规则按程序路径匹配；辅助进程由后端识别。</p><ul className="process-list">{application.processes.map(name => <li key={name}>{name}</li>)}</ul>{application.processWarnings?.map(warning => <Alert key={warning} type="warning" title={warning} />)}</> },
        { key: 'source', label: '程序位置与来源', children: <Descriptions column={1} size="small" items={[
          { key: 'source', label: '来源', children: application.source === 'scan' ? '本机扫描' : '手动添加或管理记录' },
          { key: 'path', label: '主程序', children: <code className="break-text">{application.path || '未记录'}</code> },
        ]} /> },
      ]} />
    </>}
  </Drawer>
}
