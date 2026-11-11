import { Button, Popover, Tag } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { routingPresentation } from '../../core/applicationInventory'
import type { PendingRoute } from '../../core/routingQueue'
import type { IntegrationStatus } from '../../shared/integration'
import type { Application } from '../types'

export function ApplicationStatus({ application, status, pending, failure, onDetails }: {
  application: Application; status?: IntegrationStatus; pending?: PendingRoute; failure?: string; onDetails?: () => void
}) {
  const state = routingPresentation(application, status)
  const label = pending ? pending.phase === 'queued' ? '等待应用' : '正在应用' : failure ? '应用失败' : state.label
  const detail = pending ? pending.phase === 'queued' ? '已加入队列，可继续选择。同一应用以最后一次选择为准。' : '正在应用并检查，失败会恢复上一版。可以继续选择其他应用。' : failure ?? state.detail
  return <Popover trigger="click" title={label} content={<div className="help-popover"><p>{detail}</p>{onDetails && <Button type="link" size="small" onClick={onDetails}>查看应用详情</Button>}</div>}>
    <button className="routing-status-button" aria-label={`${application.name}：${label}，查看说明`}>
      <Tag color={pending ? 'processing' : failure ? 'error' : state.color}>{label}</Tag><QuestionCircleOutlined />
    </button>
  </Popover>
}
