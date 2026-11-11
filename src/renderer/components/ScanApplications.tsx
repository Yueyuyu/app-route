import { t } from '../i18n'
import { Alert, Button, Checkbox, Drawer, Empty, Input, Spin } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { inferCategory, type Application } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { useApplicationIcons } from '../hooks/useApplicationIcons'

interface Props { open: boolean; onClose: () => void; onAdd: (apps: Application[]) => void }

export function ScanApplications({ open, onClose, onAdd }: Props) {
  const icons = useApplicationIcons()
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [scanned, setScanned] = useState(false)
  const visible = applications.filter((app) => `${app.name} ${app.processes.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  async function scan() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/applications', { headers: { 'X-AppRoute-UI': '1' } })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setApplications(body.applications.map((app: Application) => ({ ...app, category: inferCategory(app.name) })))
      setSelected([]); setScanned(true)
      await icons?.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "扫描失败，请重试") }
    finally { setLoading(false) }
  }
  return <Drawer open={open} onClose={onClose} size={520} title={t("扫描本机应用")}
    afterOpenChange={(isOpen) => { if (isOpen && !scanned && !loading) void scan() }}
    footer={<div className="drawer-footer"><span className="scan-selection-count">{t("已选择 {0} 个应用", [selected.length])}</span><Button onClick={onClose}>{t("取消")}</Button><Button type="primary" disabled={!selected.length || loading} onClick={() => { onAdd(applications.filter((app) => selected.includes(app.id))); onClose() }}>{t("添加到草稿")}</Button></div>}>
    <p className="scan-intro">{t("读取开始菜单、安装登记、可见进程与可读取的商店应用，同时缓存图标。未识别的软件可以手动添加。")}</p>
    <div className="scan-search"><Input aria-label={t("搜索扫描结果")} prefix={<SearchOutlined />} placeholder={t("搜索扫描结果")} value={query} onChange={(event) => setQuery(event.target.value)} allowClear /><Button aria-label={t("重新扫描")} icon={<ReloadOutlined />} loading={loading} onClick={scan} /></div>
    {error && <Alert type="error" showIcon title={t(error)} />}
    {loading ? <div className="scan-loading"><Spin size="large" /><p>{t("正在读取本机应用…")}</p></div> : <>
      <div className="scan-select-all"><Checkbox checked={visible.length > 0 && visible.every((app) => selected.includes(app.id))} indeterminate={visible.some((app) => selected.includes(app.id)) && !visible.every((app) => selected.includes(app.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...visible.map((app) => app.id)])] : selected.filter((id) => !visible.some((app) => app.id === id)))}>{t("选择当前结果")}</Checkbox><span>{t("共 {0} 个结果", [visible.length])}</span></div>
      {visible.map((app) => <label className="scan-app-row" key={app.id}><Checkbox checked={selected.includes(app.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, app.id] : selected.filter((id) => id !== app.id))} aria-label={t("添加 {0}", [app.name])} /><ApplicationIcon name={app.name} icon={app.icon} application={app} /><span><strong>{app.name}</strong><small>{app.processes[0]}</small></span></label>)}
      {scanned && !visible.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("没有找到应用，可使用手动添加")} />}
    </>}
  </Drawer>
}
