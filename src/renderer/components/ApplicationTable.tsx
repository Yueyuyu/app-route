import { Button, Dropdown, Empty, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, MoreOutlined } from '@ant-design/icons'
import type { Key } from 'react'
import type { Application, RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { RouteSelector } from './RouteSelector'

interface Props {
  applications: Application[]
  selected: Key[]
  setSelected: (keys: Key[]) => void
  changeMode: (ids: string[], mode: RouteMode) => void
  edit: (app: Application) => void
  remove: (app: Application) => void
  clearFilters: () => void
}

export function ApplicationTable({ applications, selected, setSelected, changeMode, edit, remove, clearFilters }: Props) {
  return <Table<Application>
    className="application-table"
    rowKey="id"
    dataSource={applications}
    rowSelection={{ selectedRowKeys: selected, onChange: setSelected, columnWidth: 48,
      getCheckboxProps: (app) => ({ 'aria-label': `选择 ${app.name}` }) }}
    pagination={applications.length > 12 ? { pageSize: 12, showSizeChanger: false, hideOnSinglePage: true } : false}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有找到匹配的应用">
      <Button onClick={clearFilters}>清除筛选</Button>
    </Empty> }}
    columns={[
      { title: '应用名称', key: 'name', render: (_, app) => <div><button className="application-name" onClick={() => edit(app)} aria-label={`查看 ${app.name} 详情`}>
        <ApplicationIcon name={app.name} icon={app.icon} />
        <span className="application-label"><strong>{app.name}</strong><span className="process-label">{app.processes[0]}{app.processes.length > 1 && ` +${app.processes.length - 1}`}</span></span>
      </button><div className="mobile-route"><RouteSelector label={`${app.name} 的连接方式`} value={app.mode} onChange={(mode) => changeMode([app.id], mode)} /></div></div> },
      { title: '分类', dataIndex: 'category', key: 'category', width: '18%', responsive: ['lg'], render: (value) => <span className="category-label">{value}</span> },
      { title: <span>连接方式 <Tooltip title="这里的 Clash 是你正在使用的 Clash Party。代理使用它的节点；直接联网不经过远端节点。"><InfoCircleOutlined className="muted-icon" /></Tooltip></span>, key: 'mode', width: 340, responsive: ['md'], render: (_, app) => <RouteSelector label={`${app.name} 的连接方式`} value={app.mode} onChange={(mode) => changeMode([app.id], mode)} /> },
      { title: '', key: 'actions', width: 52, render: (_, app) => <Dropdown trigger={['click']} menu={{
        items: [{ key: 'edit', icon: <EditOutlined />, label: '应用详情' }, { type: 'divider' }, { key: 'delete', icon: <DeleteOutlined />, label: '从列表移除', danger: true }],
        onClick: ({ key }) => key === 'edit' ? edit(app) : remove(app),
      }}><Tooltip title="更多操作"><Button type="text" aria-label={`${app.name} 更多操作`} icon={<MoreOutlined rotate={90} />} /></Tooltip></Dropdown> },
    ]}
  />
}
