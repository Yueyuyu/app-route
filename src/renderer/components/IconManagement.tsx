import { t } from '../i18n'
import { Alert, App as AntApp, Button, Empty, Input, Modal, Select, Tabs, Tag, Tooltip } from 'antd'
import { ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import { applicationIconCatalog, catalogIconUrl } from '../../core/applicationIcons'
import { iconSourceLabels, type ApplicationIconView } from '../../shared/applicationIcon'
import { useApplicationIcons } from '../hooks/useApplicationIcons'
import { ApplicationIcon } from './ApplicationIcon'
import { HelpTip } from './HelpTip'

/** 用户图片在本机缩小并转成 PNG；原始文件名、元数据与路径不发送给服务。 */
async function thumbnail(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url; await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error(t("图片边长不能超过 4096 像素。"))
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
  const [choiceId, setChoiceId] = useState<string>()
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
  const choices = applicationIconCatalog.applications.filter(app => `${app.name} ${app.aliases.join(' ')}`.toLowerCase().includes(choiceSearch.toLowerCase()))

  async function perform(action: () => Promise<void>, success: string) {
    try { await action(); void message.success(success) } catch (e) { void message.error(t(e instanceof Error ? e.message : "操作失败")) }
  }
  async function choosePublic(id: string) {
    if (!choosing) return
    await perform(async () => {
      const response = await fetch(catalogIconUrl(id))
      if (!response.ok) throw new Error(t("公共图标读取失败"))
      await icons.replace(choosing.key, await thumbnail(await response.blob())); setChoosing(undefined)
    }, t("已使用所选图标"))
  }
  const color = (app: ApplicationIconView) => needsAttention(app) ? 'orange' : app.source === 'custom' ? 'purple' : app.source === 'local' ? 'green' : 'blue'
  return <section aria-label={t("图标管理")} className="icon-management">
    <div className="page-heading"><div><h1>{t("图标管理")}</h1><p>{t("补齐或替换应用图标，保存在本机。")}<HelpTip title={t("图标来源")}>{t("优先使用自定义图标，再从本机程序与公共库自动匹配。替换图标不改变联网方式，随时可以恢复自动选择。")}</HelpTip></p></div>
      <Button icon={<ReloadOutlined />} loading={icons.busy} onClick={() => void perform(icons.scan, t("已重新扫描并检查本机图标"))}>{t("检查并补齐")}</Button></div>
    <div className="icon-statistics">
      <div><span>{t("本机应用")}</span><strong>{icons.state?.scannedAt ? local.length : '—'}</strong></div>
      <div><span>{t("已有图标")}</span><strong>{local.filter(app => !needsAttention(app)).length}</strong></div>
      <div><span>{t("待完善")}</span><strong className={local.some(needsAttention) ? 'icon-attention-count' : ''}>{local.filter(needsAttention).length}</strong></div>
      <div><span>{t("公共图标")}</span><strong>{applicationIconCatalog.applications.length}</strong></div>
    </div>
    {icons.error && <Alert type="error" showIcon title={t(icons.error)} action={<Button size="small" onClick={() => void icons.refresh()}>{t("重试")}</Button>} />}
    {icons.state?.scanWarnings.map(warning => <Alert key={warning} type="warning" showIcon title={t(warning)} />)}
    <div className="icon-manager-toolbar"><Tabs activeKey={tab} onChange={key => { setTab(key); setPage(1); setSearch('') }} items={[{ key: 'local', label: t("本机应用") }, { key: 'builtin', label: t("公共图标库") }]} />
      <div className="icon-manager-search"><Input prefix={<SearchOutlined />} aria-label={t("搜索图标")} placeholder={t("搜索应用名称或进程")} value={search} allowClear onChange={e => { setSearch(e.target.value); setPage(1) }} />
        {tab === 'local' && <Select aria-label={t("图标来源筛选")} value={filter} onChange={value => { setFilter(value); setPage(1) }} options={[{ value: 'all', label: t("全部来源") }, { value: 'attention', label: t("待完善") }, { value: 'failed', label: t("加载失败") }, ...Object.entries(iconSourceLabels).map(([value, label]) => ({ value, label: t(label) }))]} />}</div>
    </div>
    {tab === 'local' ? <>
      <div className="icon-grid">{visible.map(app => <article className="icon-card" key={app.key}>
        <div className="icon-card-heading"><ApplicationIcon name={app.name} icon={app.icon} resolved /><div><Tooltip title={app.name}><strong>{app.name}</strong></Tooltip><span>{app.processes[0]}</span></div></div>
        <div className="icon-card-meta"><Tag color={color(app)}>{icons.failedImages.includes(app.icon) ? t("加载失败") : t(iconSourceLabels[app.source])}</Tag><span>{app.width ? `${app.width} × ${app.height}` : t("矢量图标")}</span></div>
        <div className="icon-source-details"><HelpTip title={t("{0} 图标", [app.name])}>{t(app.detail)}</HelpTip></div>
        <div className="icon-card-actions"><Button size="small" icon={<UploadOutlined />} disabled={icons.busy} aria-label={t("替换 {0} 图标", [app.name])} onClick={() => { uploadTarget.current = app; upload.current?.click() }}>{t("替换")}</Button>
          <Button size="small" type="text" disabled={icons.busy} onClick={() => { setChoosing(app); setChoiceSearch(''); setChoiceId(undefined) }}>{t("从图标库选择")}</Button>
          {app.hasCustom && <Button size="small" type="link" disabled={icons.busy} aria-label={t("恢复 {0} 自动图标", [app.name])} onClick={() => void perform(() => icons.reset(app.key), t("已恢复自动选择"))}>{t("恢复自动")}</Button>}</div>
      </article>)}</div>
      {!rows.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filter === 'attention' ? t("当前列表没有待完善图标") : t("没有匹配的应用")} />}
    </> : <div className="icon-grid icon-library-grid">{builtin.slice((page - 1) * 24, page * 24).map(app => {
      const collection = applicationIconCatalog.collections[app.collection as keyof typeof applicationIconCatalog.collections]
      return <article className="icon-card" key={app.id}><div className="icon-card-heading"><ApplicationIcon name={app.name} icon={catalogIconUrl(app.id)} resolved /><div><strong>{app.name}</strong><span>{t(app.category)}</span></div></div>
        <p>{app.processes.join(' · ')}</p><div className="icon-card-meta"><a href={collection.sourceUrl} target="_blank" rel="noreferrer">{collection.name}</a><Tag>{collection.license}</Tag></div></article>
    })}</div>}
    <div className="icon-manager-footer"><span>{t("共 {0} 个结果", [total])} · {tab === 'local' ? t("自动提取成功不等于已人工核对外观") : t("素材许可与商标权分别保留")}</span><div><Button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{t("上一页")}</Button><span>{page} / {Math.max(1, Math.ceil(total / 24))}</span><Button disabled={page * 24 >= total} onClick={() => setPage(value => value + 1)}>{t("下一页")}</Button></div></div>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label={t("选择本机图标文件")} onChange={event => {
      const file = event.target.files?.[0], target = uploadTarget.current; event.target.value = ''
      if (!file || !target) return
      void perform(async () => { if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error(t("请选择不超过 2 MB 的 PNG、JPG 或 WebP 图片。")); await icons.replace(target.key, await thumbnail(file)) }, t("图标已替换"))
    }} />
    <Modal title={t("为 {0} 选择图标", [choosing?.name ?? ''])} open={!!choosing} onCancel={() => !icons.busy && setChoosing(undefined)} okText={t("使用此图标")} cancelText={t("取消")} confirmLoading={icons.busy} okButtonProps={{ disabled: !choiceId || icons.busy }} onOk={() => choiceId && void choosePublic(choiceId)} width={660}>
      <Input prefix={<SearchOutlined />} aria-label={t("搜索公共图标")} placeholder={t("搜索公共图标")} value={choiceSearch} onChange={e => setChoiceSearch(e.target.value)} />
      <div className="icon-picker">{choices.map(app => <Button key={app.id} className={choiceId === app.id ? 'icon-choice-selected' : ''} aria-pressed={choiceId === app.id} disabled={icons.busy} onClick={() => setChoiceId(app.id)}><img src={catalogIconUrl(app.id)} alt="" /><span>{app.name}</span></Button>)}</div>
      {!choices.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("没有匹配的图标，请尝试其他名称")} />}
      <p className="icon-picker-hint">{choiceId ? t("已选择：{0}", [applicationIconCatalog.applications.find(app => app.id === choiceId)?.name]) : t("先选择图标，再点击“使用此图标”。")}</p>
    </Modal>
  </section>
}
