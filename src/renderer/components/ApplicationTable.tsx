import type { PendingRoute } from '../../core/routingQueue'
import { Button, Dropdown, Empty, Table, Tag, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, MoreOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import type { Key } from 'react'
import type { Application, RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { RouteSelector } from './RouteSelector'
import type { IntegrationStatus } from '../../shared/integration'
import { managedFor, routingPresentation } from '../../core/applicationInventory'
import { applicationKey } from '../../core/applicationViews'
import { proxyOutletLabel } from '../../core/proxyGroups'

interface Props {
  applications: Application[]
  selected: Key[]
  setSelected: (keys: Key[]) => void
  changeMode: (ids: string[], mode: RouteMode) => void
  edit: (app: Application) => void
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

export function ApplicationTable({ applications, selected, setSelected, changeMode, edit, remove, clearFilters, status, busyIds, pendingRoutes, failures, loading, favorites, toggleFavorite, emptyDescription, groupBusy }: Props) {
  const disabled = groupBusy || !status?.connected || Boolean(status.untrackedRuleCount) || (Boolean(status?.pending) && !busyIds.length)
  const selector = (app: Application) => status?.untrackedRuleCount ? <span>待核对历史规则</span> : <RouteSelector disabled={disabled} legacyProxy={app.mode === 'proxy' && managedFor(app, status?.managed)?.target !== status?.proxyGroup} pending={Boolean(pendingRoutes[app.id])} label={`${app.name} 的连接方式`} value={pendingRoutes[app.id]?.mode ?? app.mode} onChange={(mode) => changeMode([app.id], mode)} />
  function feedback(app: Application) {
    const pending = pendingRoutes[app.id]
    if (pending) return <div className="application-routing-status" aria-live="polite"><Tag color="processing">{pending.phase === 'queued' ? '等待应用' : '正在应用与检查…'}</Tag><small>待应用选项尚未确认生效，可以继续选择；检查失败会自动恢复。</small></div>
    const state = routingPresentation(app, status)
    const managed = managedFor(app, status?.managed)
    const outlet = managed?.mode === 'proxy' ? status?.outlets?.[managed.target ?? ''] : undefined
    const observed = status?.evidence.filter(item => item.applicationId === managed?.id)
    const observedNodes = [...new Set(observed?.map(item => item.node ?? item.outbound))]
    return <div className="application-routing-status" aria-live="polite">
      <Tooltip title={failures[app.id] ?? state.detail}><Tag color={busyIds.includes(app.id) ? 'processing' : failures[app.id] ? 'error' : state.color}>{busyIds.includes(app.id) ? '正在应用与检查…' : failures[app.id] ? '应用失败' : state.label}</Tag></Tooltip>
      <small>{busyIds.includes(app.id) ? '正在识别进程、写入规则并检查网络；失败会自动恢复。' : failures[app.id] ?? state.detail}</small>
      {managed && <small className="application-policy">已保存出口：{managed.mode === 'proxy' ? managed.target ?? '未指定，请检查' : 'DIRECT · 本地直连'}</small>}
      {managed?.mode === 'proxy' && <><small>{managed.target === status?.proxyGroup ? '组当前选择' : '旧出口当前选择'}：{proxyOutletLabel(outlet)}</small><small>实际连接节点：{observedNodes.length ? observedNodes.join('、') : '尚未观测到'}{observed?.some(item => item.usesCurrentNode === false) ? '（部分连接与当前选择不同，等待重连）' : ''}</small></>}
      {managedFor(app, status?.managed) && <span className="process-family-info" title={[app.processes.join('、'), ...(app.processWarnings ?? [])].join('\n')}>已识别 {app.processes.length} 个进程：{app.processes.slice(0, 3).join('、')}{app.processes.length > 3 ? ' 等（详情查看全部）' : ''}</span>}
    </div>
  }
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
      { title: '收藏', key: 'favorite', width: 48, render: (_, app) => <Button type="text" className={favorites.includes(applicationKey(app)) ? 'favorite-button is-favorite' : 'favorite-button'} aria-label={`${favorites.includes(applicationKey(app)) ? '取消收藏' : '收藏'} ${app.name}`} aria-pressed={favorites.includes(applicationKey(app))} icon={favorites.includes(applicationKey(app)) ? <StarFilled /> : <StarOutlined />} onClick={() => toggleFavorite(app)} /> },
      { title: '应用名称', key: 'name', render: (_, app) => <div><button className="application-name" onClick={() => edit(app)} aria-label={`查看 ${app.name} 详情`}>
        <ApplicationIcon name={app.name} icon={app.icon} application={app} />
        <span className="application-label"><strong>{app.name}</strong><span className="process-label">{app.processes[0]}{app.processes.length > 1 && ` +${app.processes.length - 1}`}</span></span>
      </button><div className="mobile-route">{selector(app)}</div>{feedback(app)}</div> },
      { title: '分类', dataIndex: 'category', key: 'category', width: '18%', responsive: ['lg'], render: (value) => <span className="category-label">{value}</span> },
      { title: <span>连接方式 · 点击即应用 <Tooltip title="AppRoute 自动写入 Clash Party 并检查；失败恢复。选择代理使用上方显示的出口。"><InfoCircleOutlined className="muted-icon" /></Tooltip></span>, key: 'mode', width: 340, responsive: ['md'], render: (_, app) => selector(app) },
      { title: '', key: 'actions', width: 52, render: (_, app) => <Dropdown trigger={['click']} menu={{
        items: [{ key: 'edit', icon: <EditOutlined />, label: '应用详情' }, { key: 'retry', label: '重新识别并应用', disabled: disabled || app.mode === 'rule' }, { type: 'divider' }, { key: 'delete', icon: <DeleteOutlined />, label: '从列表移除', danger: true, disabled: app.mode !== 'rule' || disabled }],
        onClick: ({ key }) => key === 'edit' ? edit(app) : key === 'retry' ? changeMode([app.id], app.mode) : remove(app),
      }}><Tooltip title="更多操作"><Button type="text" aria-label={`${app.name} 更多操作`} icon={<MoreOutlined rotate={90} />} /></Tooltip></Dropdown> },
    ]}
  />
}
