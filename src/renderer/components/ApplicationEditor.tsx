import { Alert, App as AntApp, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { useEffect } from 'react'
import { categories, routeDescriptions, validProcessName, type Application, type RouteMode } from '../types'
import { ApplicationIcon } from './ApplicationIcon'

interface Values { name: string; processes: string[]; category: string; mode: RouteMode; path: string }
interface Props { open: boolean; application?: Application; applications: Application[]; onClose: () => void; onSave: (app: Application) => void }

export function ApplicationEditor({ open, application, applications, onClose, onSave }: Props) {
  const [form] = Form.useForm<Values>()
  const { message } = AntApp.useApp()
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue(application ?? { category: '其他应用', mode: 'rule', processes: [] }) }
  }, [open, application, form])
  const mode = Form.useWatch('mode', { form, preserve: true }) ?? application?.mode ?? 'rule'
  const sourceLabel = application?.source === 'example' ? '示例应用' : application?.source === 'scan' ? '本机扫描' : '手动添加'
  return <Drawer title={application ? '应用详情' : '添加应用'} open={open} onClose={onClose} size={460}
    footer={<div className="drawer-footer"><Button onClick={onClose}>取消</Button><Button type="primary" onClick={() => form.submit()}>保存应用资料</Button></div>}>
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
      <Form.Item label="主进程与已识别进程" name="processes" extra="应用设置时会根据主程序自动识别辅助进程。" rules={[{ required: true, message: '请至少添加一个进程' }, { validator: (_, values: string[]) => {
        if (!values?.length) return Promise.resolve()
        if (values.some((name) => !validProcessName(name))) return Promise.reject(new Error('请输入有效的文件名，例如 QQMusic.exe，不要填写完整路径'))
        const executable = form.getFieldValue('path')?.trim().toLowerCase()
        const duplicate = applications.find((app) => app.id !== application?.id && executable && app.path?.toLowerCase() === executable)
        return duplicate ? Promise.reject(new Error(`该主程序路径已属于「${duplicate.name}」，请编辑已有应用`)) : Promise.resolve()
      } }]}><Select disabled={Boolean(application)} mode="tags" open={false} placeholder="例如：QQMusic.exe" /></Form.Item>
      <Form.Item label="主程序完整路径" name="path" rules={[{ required: true, message: '请输入本机 exe 完整路径' }]}><Input disabled={Boolean(application)} placeholder="本机 exe 文件的完整路径" /></Form.Item>
      <div className="mode-explanation">{routeDescriptions[mode]}</div>
      {mode === 'proxy' && <div className="proxy-group-note">代理来源：Clash Party<br />代理出口：在应用管理页顶部选择</div>}
      {application?.path && <div className="path-detail"><span>程序位置</span><code>{application.path}</code></div>}
      <Space orientation="vertical" style={{ width: '100%', marginTop: 28 }}><Alert type="info" showIcon title="应用资料与联网方式分别管理" description="在应用列表点击直连或走代理会自动应用。这里仅编辑资料，不改变当前网络。" /></Space>
    </Form>
  </Drawer>
}
