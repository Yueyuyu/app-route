import { useEffect, useState } from 'react'
import { Alert, App, Button, Input, Modal, Select, Space, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { t, formatDateTime } from '../i18n'
import { settingsError } from '../settingsError'
import { routeLabels } from '../types'
import type { RouteMode } from '../../shared/application'
import type { SettingsPreview } from '../../shared/settings'
import type { ScenarioDraft, ScenarioList, ScenarioSummary } from '../../shared/scenarios'

export function SettingsScenariosPanel({ busy, setBusy, onPreview }: { busy: boolean; setBusy: (value: boolean) => void; onPreview: (preview: SettingsPreview) => void }) {
  const { modal } = App.useApp()
  const [list, setList] = useState<ScenarioList>({ items: [], unreadable: 0 }), [error, setError] = useState('')
  const [draft, setDraft] = useState<ScenarioDraft>(), [name, setName] = useState(''), [keys, setKeys] = useState<string[]>([]), [modes, setModes] = useState<Record<string, RouteMode>>({})
  async function refresh() { setList(await window.appRoute!.request<ScenarioList>('settings.scenarios')) }
  useEffect(() => { void refresh().catch(error => setError(settingsError(error, '操作失败'))) }, [])
  async function run(work: () => Promise<void>) {
    setBusy(true); setError('')
    try { await work() } catch (error) { setError(settingsError(error, '操作失败')) }
    finally { setBusy(false) }
  }
  async function prepare() {
    await run(async () => {
      const value = await window.appRoute!.request<ScenarioDraft>('settings.scenario-prepare')
      setDraft(value); setName(''); setKeys(value.rows.filter(row => row.mode !== 'rule' && !row.temporary && !row.blocked).slice(0, 100).map(row => row.key)); setModes({})
    })
  }
  async function save() {
    if (!draft) return
    await run(async () => {
      await window.appRoute!.request('settings.scenario-save', { token: draft.token, name, choices: keys.map(key => ({ key, mode: modes[key] ?? draft.rows.find(row => row.key === key)!.mode })) })
      setDraft(undefined); await refresh()
    })
  }
  function remove(item: ScenarioSummary) {
    modal.confirm({ title: t('删除方案？'), content: <p>{item.name} · {t('只删除所选方案，当前分流保持不变。')}</p>, okText: t('删除'), cancelText: t('取消'), okButtonProps: { danger: true, 'aria-label': t('删除') }, onOk: () => run(async () => { await window.appRoute!.request('settings.scenario-delete', { id: item.id, fingerprint: item.fingerprint }); await refresh() }) })
  }
  return <section className="settings-scenarios">
    <div className="settings-transfer-card"><div><h2>{t('场景方案')}</h2><p>{t('保存一组应用选择，使用前先看差异。代理应用跟随当前绑定组。')}</p></div><Button aria-label={t('新建方案')} disabled={busy} icon={<PlusOutlined />} onClick={() => void prepare()}>{t('新建方案')}</Button></div>
    {error && !draft && <Alert type="warning" showIcon title={t(error)} />}
    {list.unreadable > 0 && <Alert type="warning" showIcon title={t('{0} 个方案无法读取，原文件已保留。', [list.unreadable])} />}
    <Table<ScenarioSummary> className="settings-scenarios-table" rowKey="id" size="small" pagination={false} dataSource={list.items} columns={[
      { title: t('方案名称'), dataIndex: 'name' },
      { title: t('应用'), dataIndex: 'count', width: 80 },
      { title: t('保存时间'), dataIndex: 'createdAt', render: formatDateTime },
      { title: t('操作'), width: 190, render: (_, item) => <Space><Button size="small" disabled={busy} onClick={() => void run(async () => { onPreview(await window.appRoute!.request<SettingsPreview>('settings.scenario-preview', { id: item.id, fingerprint: item.fingerprint })) })}>{t('预览应用')}</Button><Button aria-label={t('删除')} size="small" danger disabled={busy} onClick={() => remove(item)}>{t('删除')}</Button></Space> },
    ]} />
    <Modal className="scenario-editor" width={800} style={{ top: 40 }} styles={{ body: { maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto' } }} open={Boolean(draft)} title={t('新建方案')} keyboard={!busy} maskClosable={!busy} closable={!busy} onCancel={() => { if (!busy) setDraft(undefined) }}
      okText={t('保存方案')} cancelText={t('取消')} confirmLoading={busy} okButtonProps={{ disabled: busy || !name.trim() || !keys.length || keys.length > 100 }} onOk={() => void save()}>
      <Input aria-label={t('方案名称')} maxLength={60} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder={t('方案名称')} />
      <p className="secondary-copy">{t('保存不会修改网络。只保存勾选应用的联网方式；临时设置需先结束。')}</p>
      {error && <Alert type="warning" title={t(error)} />}
      <Table className="scenario-applications" rowKey="key" size="small" dataSource={draft?.rows} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 560 }}
        rowSelection={{ selectedRowKeys: keys, onChange: values => setKeys(values.map(String)), getCheckboxProps: row => ({ disabled: busy || row.temporary || Boolean(row.blocked) }) }} columns={[
          { title: t('应用'), render: (_, row) => <div><strong>{row.name}</strong><div className="settings-path">{row.path}</div>{row.temporary && <small>{t('临时设置中')}</small>}{row.blocked && <small>{t(row.blocked)}</small>}</div> },
          { title: t('联网方式'), width: 190, render: (_, row) => <Select aria-label={t('{0} 的联网方式', [row.name])} value={modes[row.key] ?? row.mode} disabled={busy || row.temporary || Boolean(row.blocked)} onChange={value => setModes(old => ({ ...old, [row.key]: value }))} options={(Object.keys(routeLabels) as RouteMode[]).map(value => ({ value, label: t(routeLabels[value]) }))} /> },
        ]} />
      <p>{t('已选择 {0} 个应用', [keys.length])}</p>
    </Modal>
  </section>
}
