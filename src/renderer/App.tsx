import { useMemo, useState, type Key } from 'react'
import { Alert, App as AntApp, Breadcrumb, Button, Drawer, Dropdown, Input, Menu, Select, Tabs, Tag } from 'antd'
import { AppstoreOutlined, BookOutlined, CloseOutlined, ExportOutlined, FileTextOutlined, InfoCircleOutlined, MenuOutlined, PlusOutlined, ScanOutlined, SearchOutlined, SettingOutlined, PictureOutlined } from '@ant-design/icons'
import { ApplicationTable } from './components/ApplicationTable'
import { ApplicationEditor } from './components/ApplicationEditor'
import { DraftPage, HelpPage } from './components/SecondaryPages'
import { useApplicationInventory } from './hooks/useApplicationInventory'
import { useRoutingIntegration } from './hooks/useRoutingIntegration'
import { inventoryWithRouting } from '../core/applicationInventory'
import { RoutingPanel } from './components/RoutingPanel'
import { IconManagement } from './components/IconManagement'
import { Brand } from './components/Brand'
import { ApplicationIconsProvider } from './hooks/useApplicationIcons'
import { routeLabels, type Application, type Page, type RouteMode } from './types'

const pageLabels: Record<Page, string> = { apps: '应用管理', drafts: '应用设置', help: '使用说明', icons: '图标管理' }

export default function App() {
  const inventory = useApplicationInventory()
  const routing = useRoutingIntegration()
  const applications = useMemo(() => inventoryWithRouting(inventory.applications, routing.status), [inventory.applications, routing.status])
  const [preferredTarget, setPreferredTarget] = useState<string>()
  const target = routing.status?.choices.some(choice => choice.name === preferredTarget) ? preferredTarget : routing.status?.suggestedTarget
  const applying = routing.busyIds.length > 0
  const { message, modal } = AntApp.useApp()
  const [page, setPage] = useState<Page>('apps')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Key[]>([])
  const [editing, setEditing] = useState<Application>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const counts = useMemo(() => ({
    all: applications.length,
    proxy: applications.filter((app) => app.mode === 'proxy').length,
    direct: applications.filter((app) => app.mode === 'direct').length,
    rule: applications.filter((app) => app.mode === 'rule').length,
  }), [applications])
  const visible = useMemo(() => applications.filter((app) =>
    (filter === 'all' || app.mode === filter) && (category === 'all' || app.category === category) &&
    `${app.name} ${app.processes.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())),
  [applications, filter, category, search])

  async function changeMode(ids: string[], mode: RouteMode) {
    const chosen = applications.filter(app => ids.includes(app.id))
    if (mode === 'proxy' && !target) { void message.info('请先在上方选择代理出口，以后点击走代理会直接使用该出口。'); return }
    try { const result = await routing.apply(chosen, mode, target); setSelected([]); void message.success(result.message) }
    catch (e) { void message.error(e instanceof Error ? e.message : '应用失败，请检查状态', 8) }
  }
  function exportDraft() {
    const data = { version: 1, kind: 'application-routing-snapshot', app: 'AppRoute', verified: false, proxyProvider: 'Clash Party',
      exportedAt: new Date().toISOString(), applications: applications.map(({ icon: _icon, ...app }) => app) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'AppRoute-设置记录.json'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    void message.success('已导出当前设置记录；连接验证状态请以页面为准')
  }
  function removeApplication(app: Application) {
    modal.confirm({ title: `从列表移除「${app.name}」？`, content: '只从当前列表移除；重新扫描后本机应用会再次出现。不会卸载软件。', okText: '移除', cancelText: '保留', okButtonProps: { danger: true }, onOk: () => {
      inventory.removeApplication(app.id); setSelected((keys) => keys.filter((key) => key !== app.id))
    } })
  }
  const navigation = <Menu selectedKeys={[page]} mode="inline" onClick={({ key }) => { setPage(key as Page); setMenuOpen(false) }} items={[
    { key: 'apps', icon: <AppstoreOutlined />, label: '应用管理' },
    { key: 'drafts', icon: <FileTextOutlined />, label: '应用设置' },
    { key: 'help', icon: <BookOutlined />, label: '使用说明' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置', children: [{ key: 'icons', icon: <PictureOutlined />, label: '图标管理' }] },
  ]} />

  return <ApplicationIconsProvider applications={inventory.applications} onResolved={inventory.syncIcons}><div className="app-shell">
    <aside className="sidebar"><Brand />
      {navigation}
      <div className="sidebar-bottom"><div className="integration-status"><i /><div><strong>Clash Party</strong><span>连接与恢复状态见页面上方</span></div></div><small>集成测试版 0.2.0-preview.1</small></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar-left"><Button type="text" className="mobile-menu-button" icon={<MenuOutlined />} aria-label="打开导航" onClick={() => setMenuOpen(true)} /><Breadcrumb items={[{ title: '工作空间' }, { title: pageLabels[page] }]} /></div><div className="topbar-right"><Tag variant="filled">集成测试版</Tag><img className="topbar-app-icon" src="/brand/app-route-inline.svg" width={34} height={34} alt="AppRoute" /></div></header>
      <main className="main-content">
        {page === 'apps' ? <section aria-label="应用管理">
          <div className="page-heading"><div><h1>应用管理</h1><p>为每个应用选择连接方式，网络由你掌控。</p></div><div className="heading-actions"><Button icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setEditorOpen(true) }}>添加应用</Button><Button type="primary" icon={<ScanOutlined />} loading={inventory.loading} disabled={applying} onClick={() => void inventory.scan()}>重新扫描</Button></div></div>
          <RoutingPanel status={routing.status} error={routing.error} refresh={routing.refresh} busy={applying} target={target} setTarget={setPreferredTarget} />
          <Alert className="preview-notice" type="info" showIcon title="本机真实应用 · 点击连接方式即自动应用，失败自动恢复。" description="规则加载与新连接验证分别显示。页面开启时自动检测进入 Clash 的新辅助进程；已有连接不会自动切换。" />
          {inventory.error && <Alert type="warning" showIcon title={inventory.error} action={<Button onClick={() => void inventory.scan()}>重试扫描</Button>} />}
          <div className="list-toolbar"><Tabs activeKey={filter} onChange={(key) => { setFilter(key); setSelected([]) }} items={[
            { key: 'all', label: <span>全部应用 <b>{counts.all}</b></span> },
            { key: 'proxy', label: <span>强制代理 <b>{counts.proxy}</b></span> },
            { key: 'direct', label: <span>直接联网 <b>{counts.direct}</b></span> },
            { key: 'rule', label: <span>按规则 <b>{counts.rule}</b></span> },
          ]} /><div className="list-search"><Input prefix={<SearchOutlined />} aria-label="搜索应用名称或进程" placeholder="搜索应用名称或进程" value={search} onChange={(event) => { setSearch(event.target.value); setSelected([]) }} allowClear /><Select aria-label="应用分类筛选" value={category} onChange={(value) => { setCategory(value); setSelected([]) }} options={[{ value: 'all', label: '所有分类' }, ...[...new Set(applications.map((app) => app.category))].map((value) => ({ value, label: value }))]} /></div></div>
          {selected.length > 0 && <div className="bulk-toolbar"><span>已选择 <strong>{selected.length}</strong> 个应用</span><Dropdown trigger={['click']} menu={{ items: (Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ key: mode, label: routeLabels[mode] })), onClick: ({ key }) => { changeMode(selected.map(String), key as RouteMode) } }}><Button size="small" disabled={applying || Boolean(routing.status?.pending)}>批量应用连接方式</Button></Dropdown><Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setSelected([])}>取消选择</Button></div>}
          <ApplicationTable status={routing.status} busyIds={routing.busyIds} failures={routing.failures} loading={inventory.loading} applications={visible} selected={selected} setSelected={setSelected} changeMode={changeMode} edit={(app) => { setEditing(app); setEditorOpen(true) }} remove={removeApplication} clearFilters={() => { setSearch(''); setCategory('all'); setFilter('all') }} />
          <div className="table-footer"><span>{visible.length === applications.length ? `共 ${counts.all} 个应用` : `显示 ${visible.length} / ${counts.all} 个应用`} · {inventory.loading ? '正在读取本机应用…' : '本机应用与手动添加'}</span><Button type="link" size="small" icon={<InfoCircleOutlined />} onClick={() => setPage('help')}>这三种连接方式有什么区别？</Button></div>
        </section> : page === 'drafts' ? <DraftPage applications={applications} onExport={exportDraft} /> : page === 'icons' ? <IconManagement /> : <HelpPage />}
      </main>
      <footer className="workspace-footer"><div className="save-status"><i className={inventory.saveError ? 'error' : ''} /><strong>{inventory.saveError ? '列表缓存未能保存' : '点击即应用'}</strong><span>{inventory.saveError ? '本地存储不可用，下次将重新扫描' : routing.status?.recoveryReady ? '独立恢复入口已准备 · 每次应用自动检查' : '首次应用前自动准备独立恢复工具'}</span></div><Button icon={<ExportOutlined />} onClick={exportDraft}>导出设置记录</Button></footer>
    </div>
    <ApplicationEditor open={editorOpen} application={editing} applications={applications} onClose={() => setEditorOpen(false)} onSave={(app) => { inventory.saveApplication(app); void message.success('应用资料已保存，请在列表中选择联网方式') }} />
    <Drawer title={<Brand />} className="navigation-drawer" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} size={280}>{navigation}</Drawer>
  </div></ApplicationIconsProvider>
}
