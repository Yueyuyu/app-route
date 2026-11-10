import { Button, Dropdown, Empty, Table, Tag, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, MoreOutlined } from '@ant-design/icons'
import type { Key } from 'react'
import type { Application, RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { RouteSelector } from './RouteSelector'
import type { IntegrationStatus } from '../../shared/integration'
import { managedFor, routingPresentation } from '../../core/applicationInventory'

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
  failures: Record<string, string>
  loading: boolean
}

export function ApplicationTable({ applications, selected, setSelected, changeMode, edit, remove, clearFilters, status, busyIds, failures, loading }: Props) {
  const disabled = busyIds.length > 0 || Boolean(status?.pending) || !status?.connected
  function feedback(app: Application) {
    const state = routingPresentation(app, status)
    return <div className="application-routing-status" aria-live="polite">
      <Tooltip title={failures[app.id] ?? state.detail}><Tag color={busyIds.includes(app.id) ? 'processing' : failures[app.id] ? 'error' : state.color}>{busyIds.includes(app.id) ? '正在应用与检查…' : failures[app.id] ? '应用失败' : state.label}</Tag></Tooltip>
      <small>{busyIds.includes(app.id) ? '正在识别进程、写入规则并检查网络；失败会自动恢复。' : failures[app.id] ?? state.detail}</small>
      {managedFor(app, status?.managed) && <span className="process-family-info" title={[app.processes.join('、'), ...(app.processWarnings ?? [])].join('\n')}>已识别 {app.processes.length} 个进程：{app.processes.slice(0, 3).join('、')}{app.processes.length > 3 ? ' 等（详情查看全部）' : ''}</span>}
    </div>
  }
  return <Table<Application>
    className="application-table"
    rowKey="id"
    dataSource={applications}
    loading={loading && !applications.length}
    rowSelection={{ selectedRowKeys: selected, onChange: setSelected, columnWidth: 48,
      getCheckboxProps: (app) => ({ 'aria-label': `选择 ${app.name}` }) }}
    pagination={applications.length > 12 ? { pageSize: 12, showSizeChanger: false, hideOnSinglePage: true } : false}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有找到匹配的应用">
      <Button onClick={clearFilters}>清除筛选</Button>
    </Empty> }}
    columns={[
      { title: '应用名称', key: 'name', render: (_, app) => <div><button className="application-name" onClick={() => edit(app)} aria-label={`查看 ${app.name} 详情`}>
        <ApplicationIcon name={app.name} icon={app.icon} application={app} />
        <span className="application-label"><strong>{app.name}</strong><span className="process-label">{app.processes[0]}{app.processes.length > 1 && ` +${app.processes.length - 1}`}</span></span>
      </button><div className="mobile-route"><RouteSelector disabled={disabled} label={`${app.name} 的连接方式`} value={app.mode} onChange={(mode) => changeMode([app.id], mode)} /></div>{feedback(app)}</div> },
      { title: '分类', dataIndex: 'category', key: 'category', width: '18%', responsive: ['lg'], render: (value) => <span className="category-label">{value}</span> },
      { title: <span>连接方式 · 点击即应用 <Tooltip title="AppRoute 自动写入 Clash Party 并检查；失败恢复。选择代理使用上方显示的出口。"><InfoCircleOutlined className="muted-icon" /></Tooltip></span>, key: 'mode', width: 340, responsive: ['md'], render: (_, app) => <RouteSelector disabled={disabled} label={`${app.name} 的连接方式`} value={app.mode} onChange={(mode) => changeMode([app.id], mode)} /> },
      { title: '', key: 'actions', width: 52, render: (_, app) => <Dropdown trigger={['click']} menu={{
        items: [{ key: 'edit', icon: <EditOutlined />, label: '应用详情' }, { key: 'retry', label: '重新识别并应用', disabled: disabled || app.mode === 'rule' }, { type: 'divider' }, { key: 'delete', icon: <DeleteOutlined />, label: '从列表移除', danger: true, disabled: app.mode !== 'rule' || disabled }],
        onClick: ({ key }) => key === 'edit' ? edit(app) : key === 'retry' ? changeMode([app.id], app.mode) : remove(app),
      }}><Tooltip title="更多操作"><Button type="text" aria-label={`${app.name} 更多操作`} icon={<MoreOutlined rotate={90} />} /></Tooltip></Dropdown> },
    ]}
  />
}
