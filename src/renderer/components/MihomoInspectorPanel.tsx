import { useState } from 'react'
import { Alert, Button, Descriptions, Modal, Tag } from 'antd'
import type { MihomoEndpointInspection } from '../../shared/mihomoInspection'
import { formatDateTime, t } from '../i18n'

export function MihomoInspectorPanel({ busy }: { busy: boolean }) {
  const [open, setOpen] = useState(false), [checking, setChecking] = useState(false)
  const [result, setResult] = useState<MihomoEndpointInspection>(), [error, setError] = useState('')
  function close() { if (!checking) { setOpen(false); setResult(undefined); setError('') } }
  async function inspect() {
    if (busy || checking) return
    setChecking(true); setResult(undefined); setError('')
    try {
      const value = await window.appRoute!.request<MihomoEndpointInspection | null>('backend.pick-mihomo')
      if (value) setResult(value)
    } catch { setError('操作失败') }
    finally { setChecking(false) }
  }
  const labels = { processRules: '进程识别设置', persistentRules: '重启后规则保留', connectionInspection: '连接记录读取', udp: 'UDP 接管' }
  const states = { supported: '已确认', unsupported: '未启用', unknown: '未验证' }
  return <>
    <div className="settings-transfer-card"><div><h2>{t('其他 Mihomo 客户端')}</h2><p>{t('只读检查控制接口能力，当前分流仍由 Clash Party 管理。')}</p></div><Button disabled={busy} onClick={() => setOpen(true)}>{t('检查兼容性')}</Button></div>
    <Modal className="mihomo-inspector-modal" title={t('其他 Mihomo 客户端')} open={open} onCancel={close} maskClosable={!checking} keyboard={!checking} closable={!checking} styles={{ body: { maxHeight: 'calc(100dvh - 240px)', overflowY: 'auto' } }} footer={<><Button disabled={checking} onClick={close}>{t('关闭')}</Button><Button type="primary" aria-label={t('选择运行配置并检查')} loading={checking} disabled={busy} onClick={() => void inspect()}>{t('选择运行配置并检查')}</Button></>}>
      <p className="secondary-copy">{t('选择客户端正在使用的运行配置。只读取本机控制接口，文件内容和密钥不会发送到界面或保存。')}</p>
      <Alert type="info" showIcon title={t('接口可访问不等于支持分流；配置保存与恢复仍需按客户端验证。')} />
      {error && <Alert showIcon type="warning" title={t(error)} />}
      {result && <section className="mihomo-inspection-result">
        <p>{t('检查时间')}：{formatDateTime(result.checkedAt)}{result.version && ` · Mihomo ${result.version}`}</p>
        <Descriptions column={1} size="small" items={(Object.keys(labels) as (keyof typeof labels)[]).map(key => {
          const value = result.capabilities[key]
          return { key, label: t(labels[key]), children: <Tag color={value === 'supported' ? 'blue' : 'default'}>{t(states[value])}</Tag> }
        })} />
        {result.reasons.map(reason => <p className="secondary-copy" key={reason}>{t(reason)}</p>)}
      </section>}
    </Modal>
  </>
}
