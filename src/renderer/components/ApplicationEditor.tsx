import { App as AntApp, Button, Collapse, Drawer, Form, Input, Select } from 'antd'
import { useEffect } from 'react'
import { categories, validProcessName, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'

interface Values { name: string; processes: string[]; category: string; mode: RouteMode; path: string }
interface Props { open: boolean; application?: Application; applications: Application[]; onClose: () => void; onSave: (app: Application) => void }

export function ApplicationEditor({ open, application, applications, onClose, onSave }: Props) {
  const [form] = Form.useForm<Values>()
  const { message } = AntApp.useApp()
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue(application ?? { category: '其他应用', mode: 'rule', processes: [] }) }
  }, [open, application, form])
  const sourceLabel = application?.source === 'example' ? '示例应用' : application?.source === 'scan' ? '本机扫描' : '手动添加'
  return <Drawer title={application ? '编辑应用资料' : '添加应用'} open={open} onClose={onClose} size={480}
    footer={<div className="drawer-footer"><Button onClick={onClose}>取消</Button><Button type="primary" onClick={() => form.submit()}>{application ? '保存资料' : '添加到我的应用'}</Button></div>}>
    {application && <div className="drawer-app-heading"><ApplicationIcon name={application.name} icon={application.icon} application={application} /><div><h2>{application.name}</h2><span>{sourceLabel}</span></div></div>}
    {!application && window.appRoute && <Button className="choose-executable" onClick={() => {
      void window.appRoute!.request<{ path: string; name: string; processes: string[] } | null>('application.choose').then(result => { if (result) form.setFieldsValue(result) }).catch(() => { void message.error('未能读取程序文件，请重试或填写路径') })
    }}>从电脑选择程序文件…</Button>}
    <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => {
      onSave({ ...application, ...values, name: values.name.trim(), processes: [...new Set(values.processes.map((item) => item.trim()))], id: application?.id ?? crypto.randomUUID(), source: application?.source ?? 'manual', mode: application?.mode ?? 'rule' })
      onClose()
    }}>
      <Form.Item label="应用名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入应用名称' }, { max: 80, message: '应用名称最多 80 个字符' }]}><Input placeholder="例如：QQ 音乐" maxLength={80} /></Form.Item>
      <Form.Item label="应用分类" name="category"><Select options={categories.map((category) => ({ value: category, label: category }))} /></Form.Item>
      {application ? <Collapse items={[{ key: 'processes', label: `已识别进程 · ${application.processes.length} 个`, children: <ul className="process-list">{application.processes.map(name => <li key={name}>{name}</li>)}</ul> }]} /> : null}
      <Form.Item hidden={Boolean(application)} label="主进程文件名" name="processes" rules={[{ required: true, message: '请至少添加一个进程' }, { validator: (_, values: string[]) => {
        if (!values?.length) return Promise.resolve()
        if (values.some((name) => !validProcessName(name))) return Promise.reject(new Error('请输入有效的文件名，例如 QQMusic.exe，不要填写完整路径'))
        const executable = form.getFieldValue('path')?.trim().toLowerCase()
        const duplicate = applications.find((app) => app.id !== application?.id && executable && app.path?.toLowerCase() === executable)
        return duplicate ? Promise.reject(new Error(`该主程序路径已属于「${duplicate.name}」，请编辑已有应用`)) : Promise.resolve()
      } }]}><Select disabled={Boolean(application)} mode="tags" open={false} placeholder="例如：QQMusic.exe" /></Form.Item>
      <Form.Item hidden={Boolean(application)} label="主程序完整路径" name="path" rules={[{ required: true, message: '请输入本机 exe 完整路径' }]}><Input disabled={Boolean(application)} placeholder="本机 exe 文件的完整路径" /></Form.Item>
      {application?.path && <div className="path-detail"><span>程序位置</span><code>{application.path}</code></div>}
      <p className="secondary-copy form-note">这里只保存资料。联网方式在应用列表中选择。</p>
    </Form>
  </Drawer>
}
