import { Button, Dropdown, Empty, Table, Tooltip } from 'antd'
import { DeleteOutlined, InfoCircleOutlined, MoreOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import type { Key } from 'react'
import type { Application, RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { RouteSelector } from './RouteSelector'
import type { IntegrationStatus } from '../../shared/integration'
import { managedFor } from '../../core/applicationInventory'
import { applicationKey } from '../../core/applicationViews'
import type { PendingRoute } from '../../core/routingQueue'
import { ApplicationStatus } from './ApplicationStatus'
import { HelpTip } from './HelpTip'

interface Props {
  applications: Application[]
  selected: Key[]
  setSelected: (keys: Key[]) => void
  changeMode: (ids: string[], mode: RouteMode) => void
  details: (app: Application) => void
  remove: (app: Application) => void
  clearFilters: () => void
  status?: IntegrationStatus
  busyIds: string[]
  pendingRoutes: Record<string, PendingRoute>
  failures: Record<string, string>
  loading: boolean
  favorites: string[]
  toggleFavorite: (app: Application) => void
  emptyDescription?: string
  groupBusy?: boolean
}

export function ApplicationTable({ applications, selected, setSelected, changeMode, details, remove, clearFilters, status, busyIds, pendingRoutes, failures, loading, favorites, toggleFavorite, emptyDescription, groupBusy }: Props) {
  const disabled = groupBusy || !status?.connected || Boolean(status.untrackedRuleCount) || (Boolean(status?.pending) && !busyIds.length)
  const selector = (app: Application) => status?.untrackedRuleCount ? <span className="secondary-copy">待核对历史规则 <HelpTip title="当前分流待核对">Clash Party 仍有历史 AppRoute 规则，本机管理记录已为空。请先核对记录或在恢复网络中停用历史规则，再设置联网方式。</HelpTip></span> : <RouteSelector disabled={disabled} legacyProxy={app.mode === 'proxy' && managedFor(app, status?.managed)?.target !== status?.proxyGroup} pending={Boolean(pendingRoutes[app.id])} label={`${app.name} 的连接方式`} value={pendingRoutes[app.id]?.mode ?? app.mode} onChange={(mode) => changeMode([app.id], mode)} />
  const feedback = (app: Application) => <ApplicationStatus application={app} status={status} pending={pendingRoutes[app.id]} failure={failures[app.id]} onDetails={() => details(app)} />
  return <Table<Application>
    className="application-table"
    rowKey="id"
    dataSource={applications}
    loading={loading && !applications.length}
    rowSelection={{ selectedRowKeys: selected, onChange: setSelected, columnWidth: 42, preserveSelectedRowKeys: true,
      getCheckboxProps: (app) => ({ 'aria-label': `选择 ${app.name}` }) }}
    pagination={applications.length > 12 ? { pageSize: 12, showSizeChanger: false, hideOnSinglePage: true } : false}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription ?? '没有找到匹配的应用'}>
      <Button onClick={clearFilters}>查看全部应用</Button>
    </Empty> }}
    columns={[
      { title: '应用', key: 'name', render: (_, app) => <div><button className="application-name" onClick={() => details(app)} aria-label={`查看 ${app.name} 详情`}>
        <ApplicationIcon name={app.name} icon={app.icon} application={app} />
        <span className="application-label"><strong>{app.name}</strong><span className="process-label">{app.processes[0]}{app.processes.length > 1 && ` +${app.processes.length - 1}`}</span></span>
      </button><div className="compact-row-status">{feedback(app)}</div><div className="mobile-route">{selector(app)}</div></div> },
      { title: '状态', key: 'status', width: 174, responsive: ['xl'], render: (_, app) => feedback(app) },
      { title: <span>联网方式 <HelpTip title="点击即应用"><p>选择后自动应用，可连续操作。等待中的选项尚未生效，失败会恢复上一版。</p><p>按 Clash 规则：沿用原有规则。直接联网：不经远端节点。跟随代理组：由顶部策略选择出口。</p></HelpTip></span>, key: 'mode', width: 322, responsive: ['md'], render: (_, app) => selector(app) },
      { title: '', key: 'actions', width: 52, render: (_, app) => <Dropdown trigger={['click']} menu={{
        items: [
          { key: 'details', icon: <InfoCircleOutlined />, label: '应用详情' },
          { key: 'favorite', icon: favorites.includes(applicationKey(app)) ? <StarFilled /> : <StarOutlined />, label: favorites.includes(applicationKey(app)) ? '取消收藏' : '加入收藏' },
          { key: 'retry', label: '重新识别并应用', disabled: disabled || app.mode === 'rule' || Boolean(pendingRoutes[app.id]) },
          { type: 'divider' },
          { key: 'delete', icon: <DeleteOutlined />, label: '从列表移除', danger: true, disabled: app.mode !== 'rule' || disabled || Boolean(pendingRoutes[app.id]) },
        ],
        onClick: ({ key }) => {
          if (key === 'details') details(app)
          else if (key === 'favorite') toggleFavorite(app)
          else if (key === 'retry') changeMode([app.id], app.mode)
          else if (key === 'delete') remove(app)
        },
      }}><Tooltip title="更多操作"><Button type="text" aria-label={`${app.name} 更多操作`} icon={<MoreOutlined rotate={90} />} /></Tooltip></Dropdown> },
    ]}
  />
}
