import { Alert, App as AntApp, Button, Empty, Input, Modal, Select, Tabs, Tag, Tooltip } from 'antd'
import { CheckCircleOutlined, PictureOutlined, ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import { applicationIconCatalog, catalogIconUrl } from '../../core/applicationIcons'
import { iconSourceLabels, type ApplicationIconView } from '../../shared/applicationIcon'
import { useApplicationIcons } from '../hooks/useApplicationIcons'
import { ApplicationIcon } from './ApplicationIcon'

/** 用户图片在本机缩小并转成 PNG；原始文件名、元数据与路径不发送给服务。 */
async function thumbnail(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url; await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('图片边长不能超过 4096 像素。')
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
    const context = canvas.getContext('2d')!
    const scale = 128 / Math.max(image.naturalWidth, image.naturalHeight), width = image.naturalWidth * scale, height = image.naturalHeight * scale
    context.drawImage(image, (128 - width) / 2, (128 - height) / 2, width, height)
    return canvas.toDataURL('image/png')
  } finally { URL.revokeObjectURL(url) }
}

export function IconManagement() {
  const icons = useApplicationIcons()!
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('local')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [choosing, setChoosing] = useState<ApplicationIconView>()
  const [choiceSearch, setChoiceSearch] = useState('')
  const upload = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<ApplicationIconView | undefined>(undefined)
  const all = icons.state?.applications ?? []
  const local = all.filter(app => app.origin === 'scan' && app.available)
  const needsAttention = (app: ApplicationIconView) => app.needsAttention || icons.failedImages.includes(app.icon)
  const rows = all.filter(app => (app.origin !== 'scan' || app.available) &&
    `${app.name} ${app.processes.join(' ')}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'attention' ? needsAttention(app) : filter === 'failed' ? icons.failedImages.includes(app.icon) : app.source === filter)))
  const builtin = applicationIconCatalog.applications.filter(app => `${app.name} ${app.aliases.join(' ')} ${app.processes.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const total = tab === 'local' ? rows.length : builtin.length
  const visible = rows.slice((page - 1) * 24, page * 24)

  async function perform(action: () => Promise<void>, success: string) {
    try { await action(); void message.success(success) } catch (e) { void message.error(e instanceof Error ? e.message : '操作失败') }
  }
  async function choosePublic(id: string) {
    if (!choosing) return
    await perform(async () => {
      const response = await fetch(catalogIconUrl(id))
      if (!response.ok) throw new Error('公共图标读取失败')
      await icons.replace(choosing.key, await thumbnail(await response.blob())); setChoosing(undefined)
    }, '已使用所选图标')
  }
  const color = (app: ApplicationIconView) => needsAttention(app) ? 'orange' : app.source === 'custom' ? 'purple' : app.source === 'local' ? 'green' : 'blue'
  return <section aria-label="图标管理" className="icon-management">
    <div className="page-heading"><div><h1>图标管理</h1><p>让每个应用都有清晰的标识，图标与替换记录保存在本机。</p></div>
      <Button type="primary" icon={<ReloadOutlined />} loading={icons.busy} onClick={() => void perform(icons.scan, '已重新扫描并检查本机图标')}>检查并补齐本机图标</Button></div>
    <div className="icon-statistics">
      <div><span>本次识别的应用</span><strong>{icons.state?.scannedAt ? local.length : '—'}</strong><small>{icons.state?.scannedAt ? `最近检查 ${new Date(icons.state.scannedAt).toLocaleString('zh-CN')}` : '点击右上方开始检查'}</small></div>
      <div><span>本机已有专属图标</span><strong>{local.filter(app => !needsAttention(app)).length}</strong><small>本机提取、公共库匹配或用户替换</small></div>
      <div><span>仍待完善</span><strong className={local.some(needsAttention) ? 'icon-attention-count' : ''}>{local.filter(needsAttention).length}</strong><small>默认图标、低清晰度或加载失败</small></div>
      <div><span>内置公共图标</span><strong>{applicationIconCatalog.applications.length}</strong><small>离线使用，附带素材来源</small></div>
    </div>
    {icons.error && <Alert type="error" showIcon title={icons.error} action={<Button size="small" onClick={() => void icons.refresh()}>重试</Button>} />}
    {icons.state?.scanWarnings.map(warning => <Alert key={warning} type="warning" showIcon title={warning} />)}
    <div className="icon-manager-toolbar"><Tabs activeKey={tab} onChange={key => { setTab(key); setPage(1); setSearch('') }} items={[{ key: 'local', label: '本机应用与草稿' }, { key: 'builtin', label: '公共图标库' }]} />
      <div className="icon-manager-search"><Input prefix={<SearchOutlined />} aria-label="搜索图标" placeholder="搜索应用名称或进程" value={search} allowClear onChange={e => { setSearch(e.target.value); setPage(1) }} />
        {tab === 'local' && <Select aria-label="图标来源筛选" value={filter} onChange={value => { setFilter(value); setPage(1) }} options={[{ value: 'all', label: '全部来源' }, { value: 'attention', label: '待完善' }, { value: 'failed', label: '加载失败' }, ...Object.entries(iconSourceLabels).map(([value, label]) => ({ value, label }))]} />}</div>
    </div>
    {tab === 'local' ? <>
      <div className="icon-grid">{visible.map(app => <article className="icon-card" key={app.key}>
        <div className="icon-card-heading"><ApplicationIcon name={app.name} icon={app.icon} resolved /><div><Tooltip title={app.name}><strong>{app.name}</strong></Tooltip><span>{app.processes[0]}</span></div></div>
        <div className="icon-card-meta"><Tag color={color(app)}>{icons.failedImages.includes(app.icon) ? '加载失败' : iconSourceLabels[app.source]}</Tag><span>{app.width ? `${app.width} × ${app.height}` : '矢量图标'}</span></div>
        <p>{app.origin === 'example' ? '示例应用 · ' : ''}{app.detail}</p>
        <div className="icon-card-actions"><Button size="small" icon={<UploadOutlined />} disabled={icons.busy} aria-label={`替换 ${app.name} 图标`} onClick={() => { uploadTarget.current = app; upload.current?.click() }}>替换</Button>
          <Button size="small" type="text" disabled={icons.busy} onClick={() => { setChoosing(app); setChoiceSearch('') }}>选公共图标</Button>
          {app.hasCustom && <Button size="small" type="link" disabled={icons.busy} aria-label={`恢复 ${app.name} 自动图标`} onClick={() => void perform(() => icons.reset(app.key), '已恢复自动选择')}>恢复自动</Button>}</div>
      </article>)}</div>
      {!rows.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filter === 'attention' ? '当前列表没有待完善图标' : '没有匹配的应用'} />}
    </> : <div className="icon-grid icon-library-grid">{builtin.slice((page - 1) * 24, page * 24).map(app => {
      const collection = applicationIconCatalog.collections[app.collection as keyof typeof applicationIconCatalog.collections]
      return <article className="icon-card" key={app.id}><div className="icon-card-heading"><ApplicationIcon name={app.name} icon={catalogIconUrl(app.id)} resolved /><div><strong>{app.name}</strong><span>{app.category}</span></div></div>
        <p>{app.processes.join(' · ')}</p><div className="icon-card-meta"><a href={collection.sourceUrl} target="_blank" rel="noreferrer">{collection.name}</a><Tag>{collection.license}</Tag></div></article>
    })}</div>}
    <div className="icon-manager-footer"><span>{total} 个结果 · {tab === 'local' ? '自动提取成功不等于已人工核对外观' : '素材许可与商标权分别保留'}</span><div><Button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>上一页</Button><span>{page} / {Math.max(1, Math.ceil(total / 24))}</span><Button disabled={page * 24 >= total} onClick={() => setPage(value => value + 1)}>下一页</Button></div></div>
    <div className="icon-manager-note"><CheckCircleOutlined /> 替换图标后立即生效，不改变应用的联网方式。扫描覆盖开始菜单、安装登记、可见进程与可读取的商店应用；未识别的软件可先手动添加。</div>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="选择本机图标文件" onChange={event => {
      const file = event.target.files?.[0], target = uploadTarget.current; event.target.value = ''
      if (!file || !target) return
      void perform(async () => { if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('请选择不超过 2 MB 的 PNG、JPG 或 WebP 图片。'); await icons.replace(target.key, await thumbnail(file)) }, '图标已替换')
    }} />
    <Modal title={`为 ${choosing?.name ?? ''} 选择公共图标`} open={!!choosing} onCancel={() => setChoosing(undefined)} footer={null} width={660}>
      <Input prefix={<SearchOutlined />} aria-label="搜索公共图标" placeholder="搜索公共图标" value={choiceSearch} onChange={e => setChoiceSearch(e.target.value)} />
      <div className="icon-picker">{applicationIconCatalog.applications.filter(app => `${app.name} ${app.aliases.join(' ')}`.toLowerCase().includes(choiceSearch.toLowerCase())).map(app => <Button key={app.id} disabled={icons.busy} onClick={() => void choosePublic(app.id)}><img src={catalogIconUrl(app.id)} alt="" /><span>{app.name}</span></Button>)}</div>
      <p className="icon-picker-hint"><PictureOutlined /> 选择后作为本机自定义图标保存，随时可以恢复自动选择。</p>
    </Modal>
  </section>
}
