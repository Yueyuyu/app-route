import { useRef, useState } from 'react'
import { Alert, App, Button, Checkbox, Drawer, Empty, Space, Table, Tag } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { t, formatDateTime } from '../i18n'
import { routeLabels } from '../types'
import { settingsError } from '../settingsError'
import { SettingsBackupsPanel } from './SettingsBackupsPanel'
import type { ImportRow, SettingsImportResult, SettingsPreview } from '../../shared/settings'

interface Props { busy: boolean; setBusy: (value: boolean) => void; onImported: () => Promise<void> }
export function SettingsPage({ busy, setBusy, onImported }: Props) {
  const { message, modal } = App.useApp()
  const [preview, setPreview] = useState<SettingsPreview>()
  const [keys, setKeys] = useState<string[]>([])
  const [restoreStrategy, setRestoreStrategy] = useState(false), [restoreLanguage, setRestoreLanguage] = useState(false)
  const [notice, setNotice] = useState<{ error: boolean; text: string; warnings?: string[] }>()
  const [backupRevision, setBackupRevision] = useState(0)
  const previewClose = useRef<HTMLButtonElement>(null)
  function showPreview(value: SettingsPreview) {
    setPreview(value); setRestoreStrategy(false); setRestoreLanguage(false)
    setKeys(value.rows.filter(row => row.available && !row.configured && (row.mode !== 'rule' || row.favorite)).slice(0, 100).map(row => row.key))
  }
  async function pick() {
    setBusy(true); setNotice(undefined)
    try { const value = await window.appRoute!.request<SettingsPreview | null>('settings.pick-import'); if (value) showPreview(value) }
    catch (error) { setNotice({ error: true, text: settingsError(error, '导入失败，请重新预览。') }) }
    finally { setBusy(false) }
  }
  async function exportSettings() {
    setBusy(true)
    try { const result = await window.appRoute!.request<{ saved: boolean }>('settings.export'); if (result.saved) void message.success(t('设置已导出')) }
    catch (error) { void message.error(t(settingsError(error, '导出失败，请重试。'))) }
    finally { setBusy(false) }
  }
  async function importSettings(applyRouting: boolean) {
    if (!preview) return
    setBusy(true); setNotice(undefined)
    try {
      const result = await window.appRoute!.request<SettingsImportResult>('settings.import', { token: preview.token, keys, applyRouting, restoreStrategy: applyRouting && restoreStrategy, restoreLanguage })
      setPreview(undefined)
      setNotice({ error: result.warnings.length > 0, text: result.routingApplied ? '所选设置已导入，分流规则已就绪；新连接仍需验证。' : '应用资料与收藏已导入，现有分流保持不变。', warnings: result.warnings })
    } catch (error) { setNotice({ error: true, text: settingsError(error, '导入失败，请重新预览。') }); setPreview(undefined) }
    finally {
      try { await onImported() }
      catch { setNotice({ error: true, text: '设置已变化，请重新预览。' }) }
      finally { setBusy(false); setBackupRevision(value => value + 1) }
    }
  }
  function confirmRouting() {
    modal.confirm({ title: t('应用所选分流设置？'), content: <><p>{t('仅修改勾选应用的联网方式，未勾选应用保持原样。失败时沿用现有恢复保护。')}</p>{restoreStrategy && <p>{t('恢复代理策略还会更新当前 {0} 个代理应用的跟随组。', [preview?.affectedProxyCount ?? 0])}</p>}</>, okText: t('导入并应用'), cancelText: t('取消'), onOk: () => importSettings(true) })
  }
  const columns = [
    { title: t('应用'), dataIndex: 'name', render: (_: unknown, row: ImportRow) => <div><strong>{row.name}</strong><div className="settings-path" title={row.path}>{row.path ?? t('缺少程序路径')}</div></div> },
    { title: t('当前'), width: 115, render: (_: unknown, row: ImportRow) => t(routeLabels[row.currentMode]) },
    { title: t('导入后'), width: 125, render: (_: unknown, row: ImportRow) => <>{t(routeLabels[row.mode])}{row.favorite && <div className="secondary-copy">{t('已收藏')}</div>}</> },
    { title: t('匹配结果'), width: 155, render: (_: unknown, row: ImportRow) => row.available ? <Tag color={row.configured ? 'blue' : 'green'}>{t(row.configured ? '已有设置，默认保留' : '可导入')}</Tag> : <span className="secondary-copy">{t(row.reason!)}</span> },
  ]
  return <section className="page-section settings-page">
    <header className="page-heading"><div><h1>{t('设置与备份')}</h1><p>{t('导入前先预览，已有设置由你决定是否替换。')}</p></div></header>
    {!window.appRoute ? <Empty description={t('请在桌面应用中管理设置与备份。')} /> : <>
      {notice && <Alert showIcon type={notice.error ? 'warning' : 'success'} title={notice.warnings?.length ? notice.warnings.map(item => t(item)).join(' ') : t(notice.text)} closable onClose={() => setNotice(undefined)} />}
      <div className="settings-transfer-card"><div><h2>{t('迁移设置')}</h2><p>{t('保存应用选择、收藏、语言和代理策略。文件包含本机程序路径，请妥善保管。')}</p></div>
        <Space><Button icon={<DownloadOutlined />} disabled={busy} onClick={() => void exportSettings()}>{t('导出设置')}</Button><Button type="primary" icon={<UploadOutlined />} disabled={busy} onClick={() => void pick()}>{t('导入设置')}</Button></Space>
      </div>
      <SettingsBackupsPanel busy={busy} setBusy={setBusy} revision={backupRevision} onPreview={showPreview} />
    </>}
    <Drawer title={t('导入预览')} open={Boolean(preview)} onClose={() => { if (!busy) setPreview(undefined) }} closable={!busy} maskClosable={!busy} keyboard={!busy} size={880} afterOpenChange={visible => { if (visible) previewClose.current?.focus() }}
      footer={<div className="drawer-footer settings-import-footer"><span>{t('已选择 {0} 个应用', [keys.length])}</span><Button ref={previewClose} disabled={busy} onClick={() => setPreview(undefined)}>{t('取消')}</Button><Button disabled={busy || (!keys.length && !restoreLanguage) || keys.length > 100} onClick={() => void importSettings(false)}>{t('仅导入资料')}</Button><Button type="primary" disabled={busy || (!keys.length && !restoreStrategy) || keys.length > 100} loading={busy} onClick={confirmRouting}>{t('导入并应用')}</Button></div>}>
      {preview && <>
        <div className="settings-import-summary"><span>{t('来源时间：{0}', [formatDateTime(preview.createdAt)])}</span><p>{t('已有分流默认不勾选；路径不匹配的应用不会按名称猜测。每次最多选择 100 个。')}</p></div>
        <Table className="settings-preview-table" rowKey="key" size="small" dataSource={preview.rows} columns={columns} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 740 }}
          rowSelection={{ selectedRowKeys: keys, onChange: selected => setKeys(selected.map(String)), getCheckboxProps: row => ({ disabled: busy || !row.available }) }} />
        <div className="settings-import-options">
          <p>{t('代理应用默认跟随当前组：{0}', [preview.currentGroup ?? t('尚未选择代理组')])}</p>
          {preview.proxyStrategy && <Checkbox checked={restoreStrategy} disabled={busy} onChange={event => setRestoreStrategy(event.target.checked)}>{t('同时恢复文件中的代理策略')}</Checkbox>}
          {restoreStrategy && <p className="secondary-copy">{t('恢复代理策略还会更新当前 {0} 个代理应用的跟随组。', [preview.affectedProxyCount])}</p>}
          {preview.language && <Checkbox checked={restoreLanguage} disabled={busy} onChange={event => setRestoreLanguage(event.target.checked)}>{t('同时恢复显示语言：{0}', [preview.language])}</Checkbox>}
          <p className="secondary-copy">{t('导入前自动备份。不导入订阅、系统代理或旧的连接验证结果。')}</p>
        </div>
      </>}
    </Drawer>
  </section>
}
