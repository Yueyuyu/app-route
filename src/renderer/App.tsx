import { useMemo, useState, type Key } from 'react'
import { Alert, App as AntApp, Avatar, Breadcrumb, Button, Drawer, Dropdown, Input, Menu, Select, Tabs, Tag } from 'antd'
import { AppstoreOutlined, BookOutlined, CloseOutlined, DeploymentUnitOutlined, ExportOutlined, FileTextOutlined, InfoCircleOutlined, MenuOutlined, PlusOutlined, ScanOutlined, SearchOutlined } from '@ant-design/icons'
import { ApplicationTable } from './components/ApplicationTable'
import { ApplicationEditor } from './components/ApplicationEditor'
import { ScanApplications } from './components/ScanApplications'
import { DraftPage, HelpPage } from './components/SecondaryPages'
import { useApplicationDraft } from './hooks/useApplicationDraft'
import { RoutingPanel } from './components/RoutingPanel'
import { routeLabels, type Application, type Page, type RouteMode } from './types'

const pageLabels: Record<Page, string> = { apps: '应用管理', drafts: '规则草稿', help: '使用说明' }

export default function App() {
  const draft = useApplicationDraft()
  const { message, modal } = AntApp.useApp()
  const [page, setPage] = useState<Page>('apps')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Key[]>([])
  const [editing, setEditing] = useState<Application>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const counts = useMemo(() => ({
    all: draft.applications.length,
    proxy: draft.applications.filter((app) => app.mode === 'proxy').length,
    direct: draft.applications.filter((app) => app.mode === 'direct').length,
    rule: draft.applications.filter((app) => app.mode === 'rule').length,
  }), [draft.applications])
  const visible = useMemo(() => draft.applications.filter((app) =>
    (filter === 'all' || app.mode === filter) && (category === 'all' || app.category === category) &&
    `${app.name} ${app.processes.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())),
  [draft.applications, filter, category, search])
  const hasRealApps = draft.applications.some((app) => app.source !== 'example')
  const hasExamples = draft.applications.some((app) => app.source === 'example')

  function changeMode(ids: string[], mode: RouteMode) {
    draft.changeMode(ids, mode)
    setSelected(current => [...new Set([...current, ...ids])])
    void message.success(`已更新 ${ids.length} 个应用的草稿：${routeLabels[mode]}`)
  }
  function exportDraft() {
    const data = { version: 1, kind: 'application-routing-draft', app: 'AppRoute', applied: false, proxyProvider: null, proxyGroup: null,
      exportedAt: new Date().toISOString(), applications: draft.applications.map(({ icon: _icon, ...app }) => app) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'AppRoute-设置草稿.json'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    void message.success('设置草稿已导出，尚未应用到 Clash')
  }
  function removeApplication(app: Application) {
    modal.confirm({ title: `从列表移除「${app.name}」？`, content: '只删除这条本地草稿，不会卸载软件或修改网络。', okText: '移除', cancelText: '保留', okButtonProps: { danger: true }, onOk: () => {
      draft.removeApplication(app.id); setSelected((keys) => keys.filter((key) => key !== app.id))
    } })
  }
  const navigation = <Menu selectedKeys={[page]} mode="inline" onClick={({ key }) => { setPage(key as Page); setMenuOpen(false) }} items={[
    { key: 'apps', icon: <AppstoreOutlined />, label: '应用管理' },
    { key: 'drafts', icon: <FileTextOutlined />, label: '规则草稿' },
    { key: 'help', icon: <BookOutlined />, label: '使用说明' },
  ]} />

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-icon"><DeploymentUnitOutlined /></span><div><strong>AppRoute</strong><span>应用分流 · 各走其路</span></div></div>
      {navigation}
      <div className="sidebar-bottom"><div className="integration-status"><i /><div><strong>Clash Party</strong><span>连接与恢复状态见页面上方</span></div></div><small>集成测试版 0.2.0-preview.1</small></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar-left"><Button type="text" className="mobile-menu-button" icon={<MenuOutlined />} aria-label="打开导航" onClick={() => setMenuOpen(true)} /><Breadcrumb items={[{ title: '工作空间' }, { title: pageLabels[page] }]} /></div><div className="topbar-right"><Tag variant="filled">集成测试版</Tag><Avatar size={34} style={{ background: '#e5edff', color: '#3265ed' }}>AR</Avatar></div></header>
      <main className="main-content">
        {page === 'apps' ? <section aria-label="应用管理">
          <div className="page-heading"><div><h1>应用管理</h1><p>为每个应用选择连接方式，网络由你掌控。</p></div><div className="heading-actions"><Button icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setEditorOpen(true) }}>添加应用</Button><Button type="primary" icon={<ScanOutlined />} onClick={() => setScanOpen(true)}>扫描应用</Button></div></div>
          <RoutingPanel selected={draft.applications.filter(app => selected.includes(app.id))} onApplied={() => setSelected([])} />
          <Alert className="preview-notice" type="info" showIcon title="选择联网方式后，点击“应用所选”才会改变实际分流。示例应用不能直接应用。" />
          <div className="list-toolbar"><Tabs activeKey={filter} onChange={(key) => { setFilter(key); setSelected([]) }} items={[
            { key: 'all', label: <span>全部应用 <b>{counts.all}</b></span> },
            { key: 'proxy', label: <span>强制代理 <b>{counts.proxy}</b></span> },
            { key: 'direct', label: <span>直接联网 <b>{counts.direct}</b></span> },
            { key: 'rule', label: <span>按规则 <b>{counts.rule}</b></span> },
          ]} /><div className="list-search"><Input prefix={<SearchOutlined />} aria-label="搜索应用名称或进程" placeholder="搜索应用名称或进程" value={search} onChange={(event) => { setSearch(event.target.value); setSelected([]) }} allowClear /><Select aria-label="应用分类筛选" value={category} onChange={(value) => { setCategory(value); setSelected([]) }} options={[{ value: 'all', label: '所有分类' }, ...[...new Set(draft.applications.map((app) => app.category))].map((value) => ({ value, label: value }))]} /></div></div>
          {selected.length > 0 && <div className="bulk-toolbar"><span>已选择 <strong>{selected.length}</strong> 个应用</span><Dropdown trigger={['click']} menu={{ items: (Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ key: mode, label: routeLabels[mode] })), onClick: ({ key }) => { changeMode(selected.map(String), key as RouteMode) } }}><Button size="small">批量设置连接方式</Button></Dropdown><Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setSelected([])}>取消选择</Button></div>}
          <ApplicationTable applications={visible} selected={selected} setSelected={setSelected} changeMode={changeMode} edit={(app) => { setEditing(app); setEditorOpen(true) }} remove={removeApplication} clearFilters={() => { setSearch(''); setCategory('all'); setFilter('all') }} />
          <div className="table-footer"><span>{visible.length === draft.applications.length ? `共 ${counts.all} 个应用` : `显示 ${visible.length} / ${counts.all} 个应用`} · {hasRealApps ? hasExamples ? '包含本机应用与示例' : '本机与手动添加' : '示例列表'}</span><Button type="link" size="small" icon={<InfoCircleOutlined />} onClick={() => setPage('help')}>这三种连接方式有什么区别？</Button></div>
        </section> : page === 'drafts' ? <DraftPage applications={draft.applications} onExport={exportDraft} /> : <HelpPage />}
      </main>
      <footer className="workspace-footer"><div className="save-status"><i className={draft.saveError ? 'error' : ''} /><strong>{draft.saveError ? '草稿未能保存' : '草稿已保存'}</strong><span>{draft.saveError ? '本地存储不可用，请导出备份' : '修改先存为草稿，应用后检查实际连接'}</span></div><Button icon={<ExportOutlined />} onClick={exportDraft}>导出草稿</Button></footer>
    </div>
    <ApplicationEditor open={editorOpen} application={editing} applications={draft.applications} onClose={() => setEditorOpen(false)} onSave={(app) => { draft.saveApplication(app); void message.success('应用设置已保存为草稿') }} />
    <ScanApplications open={scanOpen} onClose={() => setScanOpen(false)} onAdd={(apps) => { draft.addScannedApplications(apps); void message.success(`已将 ${apps.length} 个本机应用添加到草稿`) }} />
    <Drawer title="AppRoute 应用分流" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} size={260}>{navigation}</Drawer>
  </div>
}
