import { useEffect, useMemo, useState, type Key } from 'react'
import { Alert, App as AntApp, Breadcrumb, Button, Collapse, Drawer, Dropdown, Input, Menu, Select, Tabs, Tag } from 'antd'
import { AppstoreOutlined, BookOutlined, CloseOutlined, FileTextOutlined, InfoCircleOutlined, MenuOutlined, PlusOutlined, ScanOutlined, SearchOutlined, PictureOutlined, StarOutlined } from '@ant-design/icons'
import { ApplicationTable } from './components/ApplicationTable'
import { ApplicationEditor } from './components/ApplicationEditor'
import { DraftPage, HelpPage } from './components/SecondaryPages'
import { useApplicationInventory } from './hooks/useApplicationInventory'
import { useRoutingIntegration } from './hooks/useRoutingIntegration'
import { applicationKey, applicationView, filterApplications, isSystemTool, type ApplicationView } from '../core/applicationViews'
import { inventoryWithRouting } from '../core/applicationInventory'
import { RoutingPanel } from './components/RoutingPanel'
import { IconManagement } from './components/IconManagement'
import { Brand } from './components/Brand'
import { ApplicationIconsProvider } from './hooks/useApplicationIcons'
import { ApplicationDetails } from './components/ApplicationDetails'
import { HelpTip } from './components/HelpTip'
import { routeLabels, type Application, type Page, type RouteMode } from './types'

const pageLabels: Record<Page, string> = { apps: '应用管理', drafts: '分流规则', help: '使用帮助', icons: '图标管理' }

export default function App() {
  const inventory = useApplicationInventory()
  const routing = useRoutingIntegration()
  const applications = useMemo(() => inventoryWithRouting(inventory.applications, routing.status), [inventory.applications, routing.status])
  const target = routing.status?.proxyGroup
  const applying = routing.busyIds.length > 0 || routing.groupBusy
  const { message, modal } = AntApp.useApp()
  useEffect(() => {
    if (routing.notice) void message.open({ key: 'routing-result', type: routing.notice.type, content: routing.notice.text, duration: routing.notice.type === 'error' ? 8 : 3 })
  }, [routing.notice, message])
  const [page, setPage] = useState<Page>('apps')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<ApplicationView>('mine')
  const [selected, setSelected] = useState<Key[]>([])
  const [editing, setEditing] = useState<Application>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailId, setDetailId] = useState<string>()
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const detailApplication = applications.find(app => app.id === detailId)
  const searching = Boolean(search.trim())

  const views = useMemo(() => ({ mine: applicationView(applications, 'mine', inventory.favorites, inventory.running),
    running: applicationView(applications, 'running', inventory.favorites, inventory.running),
    all: applicationView(applications, 'all', inventory.favorites, inventory.running) }), [applications, inventory.favorites, inventory.running])
  const visible = useMemo(() => filterApplications(applications, { view, favorites: inventory.favorites, running: inventory.running, query: search, mode: filter, category, favoritesOnly }), [applications, view, inventory.favorites, inventory.running, filter, category, search, favoritesOnly])
  const folded = searching ? [] : visible.filter(app => isSystemTool(app) && !inventory.favorites.includes(applicationKey(app)) && app.mode === 'rule')
  const primary = visible.filter(app => !folded.includes(app))
  function showAll() { setView('all'); setSearch(''); setCategory('all'); setFilter('all'); setFavoritesOnly(false); setSelected([]) }

  function changeMode(ids: string[], mode: RouteMode) {
    const chosen = applications.filter(app => ids.includes(app.id))
    if (routing.groupBusy || routing.status?.untrackedRuleCount) return
    if (mode === 'proxy' && !routing.status?.groupChoices?.some(group => group.name === target)) { void message.info('请先在上方绑定 Clash Party 代理组，所有代理应用会共用它。'); return }
    routing.apply(chosen, mode, target); setSelected([])
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
    { key: 'drafts', icon: <FileTextOutlined />, label: '分流规则' },
    { key: 'icons', icon: <PictureOutlined />, label: '图标管理' },
    { key: 'help', icon: <BookOutlined />, label: '使用帮助' },
  ]} />

  return <ApplicationIconsProvider applications={inventory.applications} onResolved={inventory.syncIcons}><div className={`app-shell${window.appRoute ? ' desktop-shell' : ''}`}>
    <aside className="sidebar"><Brand />
      {navigation}
      <div className="sidebar-bottom"><button className="integration-status" onClick={() => { setPage('apps'); setInspectionOpen(true) }} aria-label="查看 Clash Party 连接状态"><i className={routing.status?.connected ? 'connected' : routing.error ? 'disconnected' : ''} /><div><strong>Clash Party</strong><span>{routing.status?.connected ? '已连接' : routing.error ? '连接中断' : routing.status ? '未连接' : '正在连接…'}</span></div><InfoCircleOutlined /></button><small>AppRoute · 预览版 <HelpTip title="桌面应用">{window.appRoute ? '关闭窗口会收至托盘。右键托盘图标可退出；离线恢复入口独立运行。' : '当前为开发预览。正式桌面入口从本地程序启动。'}</HelpTip></small></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar-left"><Button type="text" className="mobile-menu-button" icon={<MenuOutlined />} aria-label="打开导航" onClick={() => setMenuOpen(true)} /><Breadcrumb items={[{ title: '工作空间' }, { title: pageLabels[page] }]} /></div><div className="topbar-right"><Tag variant="filled">{window.appRoute ? '桌面应用' : '开发预览'}</Tag><img className="topbar-app-icon" src="/brand/app-route-inline.svg" width={34} height={34} alt="AppRoute" /></div></header>
      <main className="main-content">
        {page === 'apps' ? <section aria-label="应用管理">
          <div className="page-heading"><div><h1>应用管理</h1><p>为常用应用选择联网方式。</p></div><div className="heading-actions"><Button icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setEditorOpen(true) }}>添加应用</Button><Button icon={<ScanOutlined />} loading={inventory.loading} disabled={applying} onClick={() => void inventory.scan(true)}>扫描应用</Button></div></div>
          <RoutingPanel status={routing.status} error={routing.error} refresh={routing.refresh} busy={applying} setProxyStrategy={routing.setProxyStrategy} inspectionOpen={inspectionOpen} setInspectionOpen={setInspectionOpen} />
          {inventory.error && <Alert type="warning" showIcon title={inventory.error} action={<Button onClick={() => void inventory.scan(true)}>重试扫描</Button>} />}
          {inventory.newCount > 0 && <Alert className="inventory-update" type="success" showIcon title={`发现 ${inventory.newCount} 个新应用，已加入全部应用，联网方式沿用原有规则。`} action={<Button size="small" onClick={showAll}>查看全部</Button>} />}
          <div className="list-toolbar"><Tabs activeKey={searching ? 'search' : view} onChange={key => { if (key === 'search') return; setSearch(''); setView(key as ApplicationView); setSelected([]); void inventory.refreshRunning() }} items={[
            { key: 'mine', label: <span>我的应用 <b>{views.mine.length}</b></span> },
            { key: 'running', label: <span>正在运行 <b>{views.running.length}</b></span> },
            { key: 'all', label: <span>全部应用 <b>{views.all.length}</b></span> },
            ...(searching ? [{ key: 'search', label: <span>搜索结果 <b>{visible.length}</b></span> }] : []),
          ]} /><div className="list-search"><Input prefix={<SearchOutlined />} aria-label="搜索全部应用" placeholder="搜索全部应用" value={search} onChange={event => { setSearch(event.target.value); setSelected([]) }} allowClear /></div></div>
          <div className="view-filters"><span>{searching ? `全部应用中找到 ${visible.length} 项` : view === 'mine' ? '收藏 + 已设分流' : view === 'running' ? '当前运行的应用' : `本机 ${applications.length} 个应用`}<HelpTip title={searching ? '搜索范围' : '应用列表'}><p>{searching ? '按名称、主进程、辅助进程和路径搜索全部应用，不受当前标签或系统工具折叠限制。下方筛选条件仍生效。' : '“我的应用”包含你收藏的应用，以及已设置直接联网或跟随代理组的应用，不根据使用频率猜测。'}</p><p>可在“更多”或应用详情中收藏，不改变联网方式。新安装的软件自动加入“全部应用”，也可手动扫描。</p></HelpTip></span><div>
            <Button icon={<StarOutlined />} type={favoritesOnly ? 'primary' : 'default'} aria-pressed={favoritesOnly} onClick={() => { setFavoritesOnly(value => !value); setSelected([]) }}>只看收藏</Button>
            <Select aria-label="联网方式筛选" value={filter} onChange={value => { setFilter(value); setSelected([]) }} options={[{ value: 'all', label: '全部联网方式' }, ...(['rule', 'direct', 'proxy'] as RouteMode[]).map(value => ({ value, label: routeLabels[value] }))]} />
            <Select aria-label="应用分类筛选" value={category} onChange={value => { setCategory(value); setSelected([]) }} options={[{ value: 'all', label: '所有分类' }, ...[...new Set(applications.map(app => app.category))].map(value => ({ value, label: value }))]} />
          </div></div>
          {(filter !== 'all' || category !== 'all' || favoritesOnly) && <div className="active-filters"><span>筛选：{[filter !== 'all' && routeLabels[filter as RouteMode], category !== 'all' && category, favoritesOnly && '已收藏'].filter(Boolean).join(' · ')}</span><Button size="small" type="link" onClick={() => { setFilter('all'); setCategory('all'); setFavoritesOnly(false); setSelected([]) }}>清除筛选</Button></div>}
          {view === 'running' && inventory.runningError && <Alert type="warning" title={inventory.runningError} action={<Button onClick={() => void inventory.refreshRunning()}>重试</Button>} />}
          {selected.length > 0 && <div className="bulk-toolbar"><span>已选择 <strong>{selected.length}</strong> 个应用</span><Button size="small" icon={<StarOutlined />} onClick={() => { inventory.addFavorites(applications.filter(app => selected.includes(app.id))); setSelected([]); void message.success('已加入我的应用，联网方式保持不变') }}>加入收藏</Button><Dropdown trigger={['click']} menu={{ items: (Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ key: mode, label: routeLabels[mode] })), onClick: ({ key }) => { changeMode(selected.map(String), key as RouteMode) } }}><Button size="small" disabled={routing.groupBusy || Boolean(routing.status?.untrackedRuleCount) || !routing.status?.connected || (Boolean(routing.status?.pending) && !applying)}>批量应用连接方式</Button></Dropdown><Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setSelected([])}>取消选择</Button></div>}
          {(primary.length > 0 || folded.length === 0) && <ApplicationTable groupBusy={routing.groupBusy} status={routing.status} busyIds={routing.busyIds} pendingRoutes={routing.pendingRoutes} failures={routing.failures} loading={inventory.loading || !inventory.ready} applications={primary} favorites={inventory.favorites} toggleFavorite={inventory.toggleFavorite} selected={selected} setSelected={setSelected} changeMode={changeMode} details={app => setDetailId(app.id)} remove={removeApplication} clearFilters={showAll} emptyDescription={searching ? '没有匹配的应用，请尝试名称、进程或清除筛选' : view === 'mine' ? '收藏常用软件，或设置专属分流后，它们会出现在这里' : '没有找到匹配的应用'} />}
          {folded.length > 0 && <Collapse className="system-tools" items={[{ key: 'tools', label: `系统工具与维护程序 · ${folded.length} 个`, children: <ApplicationTable groupBusy={routing.groupBusy} status={routing.status} busyIds={routing.busyIds} pendingRoutes={routing.pendingRoutes} failures={routing.failures} loading={false} applications={folded} favorites={inventory.favorites} toggleFavorite={inventory.toggleFavorite} selected={selected} setSelected={setSelected} changeMode={changeMode} details={app => setDetailId(app.id)} remove={removeApplication} clearFilters={showAll} /> }]} />}
          <div className="table-footer"><span>当前视图 {visible.length} 个 · 本机共 {applications.length} 个{inventory.loading ? ' · 正在检查新应用…' : inventory.scannedAt ? ` · 最近检查 ${new Date(inventory.scannedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}</span><Button type="link" size="small" icon={<InfoCircleOutlined />} onClick={() => setPage('help')}>联网方式说明</Button></div>

        </section> : page === 'drafts' ? <DraftPage applications={applications} status={routing.status} onExport={exportDraft} onDetails={app => setDetailId(app.id)} /> : page === 'icons' ? <IconManagement /> : <HelpPage />}
      </main>
      {inventory.saveError && <footer className="workspace-footer"><span>列表缓存未能保存，下次将重新扫描。</span></footer>}
    </div>
    <ApplicationEditor open={editorOpen} application={editing} applications={applications} onClose={() => setEditorOpen(false)} onSave={(app) => { inventory.saveApplication(app); if (!editing) inventory.addFavorites([app]); void message.success('应用资料已保存，请在列表中选择联网方式') }} />
    <ApplicationDetails application={detailApplication} status={routing.status} favorite={Boolean(detailApplication && inventory.favorites.includes(applicationKey(detailApplication)))} pending={detailId ? routing.pendingRoutes[detailId] : undefined} failure={detailId ? routing.failures[detailId] : undefined} close={() => setDetailId(undefined)} edit={app => { setDetailId(undefined); setEditing(app); setEditorOpen(true) }} toggleFavorite={inventory.toggleFavorite} />
    <Drawer title={<Brand />} className="navigation-drawer" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} size={280}>{navigation}</Drawer>
  </div></ApplicationIconsProvider>
}
