import { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Empty, Space, Table, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { t, formatDateTime } from '../i18n'
import { settingsError } from '../settingsError'
import { HelpTip } from './HelpTip'
import type { SettingsBackup, SettingsPreview } from '../../shared/settings'

interface Props { busy: boolean; setBusy: (value: boolean) => void; revision: number; onPreview: (preview: SettingsPreview) => void }
const sourceLabels = { manual: '手动备份', 'before-import': '导入前备份', routing: '分流历史' }

export function SettingsBackupsPanel({ busy, setBusy, revision, onPreview }: Props) {
  const { message, modal } = App.useApp()
  const [backups, setBackups] = useState<SettingsBackup[]>([])
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setBackups(await window.appRoute!.request('settings.backups')) }
    catch (error) { setError(settingsError(error, '备份列表无法读取，请重试。')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh, revision])
  async function perform(action: 'create' | 'preview' | 'export' | 'delete', backup?: SettingsBackup) {
    setBusy(true); setError('')
    try {
      const body = backup ? { id: backup.id, fingerprint: backup.fingerprint } : undefined
      if (action === 'create') { await window.appRoute!.request('settings.backup-create'); void message.success(t('备份已创建')) }
      if (action === 'preview') onPreview(await window.appRoute!.request('settings.backup-preview', body))
      if (action === 'export') {
        const result = await window.appRoute!.request<{ saved: boolean }>('settings.backup-export', body)
        if (result.saved) void message.success(t('设置已导出'))
      }
      if (action === 'delete') { await window.appRoute!.request('settings.backup-delete', body); void message.success(t('备份已删除')) }
      if (action === 'create' || action === 'delete') await refresh()
    } catch (error) { setError(settingsError(error, '备份操作失败，请刷新后重试。')) }
    finally { setBusy(false) }
  }
  function remove(backup: SettingsBackup) {
    modal.confirm({ title: t('删除这份备份？'), content: <><p>{formatDateTime(backup.createdAt)} · {t(sourceLabels[backup.kind])}</p><p>{t('只删除所选备份文件，当前分流和离线恢复工具保持不变。')}</p></>, okText: t('删除备份'), okButtonProps: { danger: true }, cancelText: t('取消'), onOk: () => perform('delete', backup) })
  }
  return <section className="settings-backups" aria-label={t('本机备份')}>
    <div className="settings-backups-heading"><div><h2>{t('本机备份')} <HelpTip title={t('备份范围')}>{t('手动与导入前备份包含资料、收藏、语言和策略；分流历史仅含应用规则与策略。恢复先预览，不直接覆盖 Clash 配置。')}</HelpTip></h2><p>{t('选择一个时间点，预览后再恢复。')}</p></div>
      <Space wrap><Button icon={<ReloadOutlined />} disabled={busy || loading} onClick={() => void refresh()}>{t('刷新')}</Button><Button icon={<PlusOutlined />} disabled={busy || loading} onClick={() => void perform('create')}>{t('立即备份')}</Button></Space></div>
    {error && <Alert type="warning" showIcon title={t(error)} />}
    <Table<SettingsBackup> className="settings-backups-table" rowKey="id" loading={loading} dataSource={backups} size="middle" scroll={{ x: 680 }} pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无备份，可以先保存当前设置。')} /> }} columns={[
        { title: t('备份时间'), dataIndex: 'createdAt', width: 190, render: value => formatDateTime(value) },
        { title: t('来源'), width: 120, render: (_, backup) => t(sourceLabels[backup.kind]) },
        { title: t('应用'), width: 70, render: (_, backup) => backup.valid ? backup.count : '—' },
        { title: t('状态'), width: 125, render: (_, backup) => <Tag color={backup.restorable ? 'blue' : 'default'}>{t(!backup.valid ? '无法读取' : backup.restorable ? '可恢复' : '未完成事务')}</Tag> },
        { title: t('操作'), width: 265, render: (_, backup) => <Space size={0} wrap><Button type="link" disabled={busy || !backup.restorable} onClick={() => void perform('preview', backup)}>{t('预览恢复')}</Button><Button type="text" disabled={busy || !backup.restorable} onClick={() => void perform('export', backup)}>{t('导出')}</Button><Button type="text" danger disabled={busy || !backup.restorable} onClick={() => remove(backup)}>{t('删除')}</Button></Space> },
      ]} />
    <p className="settings-backups-note">{t('分流历史保留最近 20 份；手动与导入前备份由你清理。损坏或未完成的记录不能直接恢复。')}</p>
  </section>
}
