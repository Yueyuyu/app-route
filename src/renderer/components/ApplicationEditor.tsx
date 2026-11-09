import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { useEffect } from 'react'
import { categories, routeDescriptions, validProcessName, type Application, type RouteMode } from '../types'
import { RouteSelector } from './RouteSelector'
import { ApplicationIcon } from './ApplicationIcon'

interface Values { name: string; processes: string[]; category: string; mode: RouteMode }
interface Props { open: boolean; application?: Application; applications: Application[]; onClose: () => void; onSave: (app: Application) => void }

export function ApplicationEditor({ open, application, applications, onClose, onSave }: Props) {
  const [form] = Form.useForm<Values>()
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue(application ?? { category: '其他应用', mode: 'rule', processes: [] }) }
  }, [open, application, form])
  const mode = Form.useWatch('mode', { form, preserve: true }) ?? application?.mode ?? 'rule'
  const sourceLabel = application?.source === 'example' ? '示例应用' : application?.source === 'scan' ? '本机扫描' : '手动添加'
  return <Drawer title={application ? '应用详情' : '添加应用'} open={open} onClose={onClose} size={460}
    footer={<div className="drawer-footer"><Button onClick={onClose}>取消</Button><Button type="primary" onClick={() => form.submit()}>保存到草稿</Button></div>}>
    {application && <div className="drawer-app-heading"><ApplicationIcon name={application.name} icon={application.icon} /><div><h2>{application.name}</h2><span>{sourceLabel}</span></div></div>}
    <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => {
      onSave({ ...application, ...values, name: values.name.trim(), processes: [...new Set(values.processes.map((item) => item.trim()))], id: application?.id ?? crypto.randomUUID(), source: application?.source ?? 'manual' })
      onClose()
    }}>
      <Form.Item label="应用名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入应用名称' }, { max: 80, message: '应用名称最多 80 个字符' }]}><Input placeholder="例如：QQ 音乐" maxLength={80} /></Form.Item>
      <Form.Item label="应用分类" name="category"><Select options={categories.map((category) => ({ value: category, label: category }))} /></Form.Item>
      <Form.Item label="进程与子进程" name="processes" extra="输入 exe 文件名并按回车。多个进程将使用同一连接方式。" rules={[{ required: true, message: '请至少添加一个进程' }, { validator: (_, values: string[]) => {
        if (!values?.length) return Promise.resolve()
        if (values.some((name) => !validProcessName(name))) return Promise.reject(new Error('请输入有效的文件名，例如 QQMusic.exe，不要填写完整路径'))
        const duplicate = applications.find((app) => app.id !== application?.id && app.processes.some((name) => values.some((value) => value.trim().toLowerCase() === name.toLowerCase())))
        return duplicate ? Promise.reject(new Error(`该进程已属于「${duplicate.name}」，请编辑已有应用`)) : Promise.resolve()
      } }]}><Select mode="tags" open={false} placeholder="例如：QQMusic.exe" /></Form.Item>
      <Form.Item label="连接方式" name="mode"><RouteSelector label="应用连接方式" value={mode} onChange={(value) => form.setFieldValue('mode', value)} /></Form.Item>
      <div className="mode-explanation">{routeDescriptions[mode]}</div>
      {mode === 'proxy' && <div className="proxy-group-note">代理来源：Clash Party<br />代理组：尚未选择，接入后设置</div>}
      {application?.path && <div className="path-detail"><span>程序位置</span><code>{application.path}</code></div>}
      <Space orientation="vertical" style={{ width: '100%', marginTop: 28 }}><Alert type="info" showIcon title="仅保存设置草稿" description="当前版本不会修改 Clash 配置或系统网络。" /></Space>
    </Form>
  </Drawer>
}
