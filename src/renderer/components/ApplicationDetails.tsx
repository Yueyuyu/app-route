import { t } from '../i18n'
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Tag } from 'antd'
import { EditOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { managedFor } from '../../core/applicationInventory'
import { outletLabel } from '../i18n'
import type { PendingRoute } from '../../core/routingQueue'
import type { IntegrationStatus } from '../../shared/integration'
import { routeLabels, type Application } from '../types'
import { ApplicationIcon } from './ApplicationIcon'
import { ApplicationStatus } from './ApplicationStatus'

export function ApplicationDetails({ application, status, favorite, pending, failure, close, edit, toggleFavorite }: {
  application?: Application; status?: IntegrationStatus; favorite: boolean; pending?: PendingRoute; failure?: string
  close: () => void; edit: (app: Application) => void; toggleFavorite: (app: Application) => void
}) {
  const managed = application && managedFor(application, status?.managed)
  const evidence = status?.evidence.filter(item => item.applicationId === managed?.id) ?? []
  return <Drawer title={t("应用详情")} open={Boolean(application)} onClose={close} size={560} footer={<div className="drawer-footer"><Button onClick={close}>{t("关闭")}</Button>{application && <Button icon={<EditOutlined />} onClick={() => edit(application)}>{t("编辑资料")}</Button>}</div>}>
    {application && <>
      {status && !status.connected && <Alert className="detail-offline" type="warning" showIcon title={t("连接已中断，以下保留最近一次读取的记录。")} />}
      <div className="detail-app-heading"><ApplicationIcon name={application.name} icon={application.icon} application={application} /><div><h2>{application.name}</h2><span>{t(application.category)}</span></div><Button aria-label={`${favorite ? t("取消收藏") : t("收藏")} ${application.name}`} aria-pressed={favorite} icon={favorite ? <StarFilled /> : <StarOutlined />} onClick={() => toggleFavorite(application)}>{favorite ? t("已收藏") : t("收藏")}</Button></div>
      <div className="detail-section"><h3>{t("联网状态")}</h3><ApplicationStatus application={application} status={status} pending={pending} failure={failure} />
        <Descriptions column={1} size="small" items={[
          { key: 'mode', label: t("已保存方式"), children: status?.untrackedRuleCount ? t("缺少记录，待核对") : t(routeLabels[application.mode]) },
          ...(managed?.mode === 'proxy' ? [
            { key: 'target', label: t("已绑定代理组"), children: managed.target ?? t("未指定") },
            { key: 'node', label: t("组当前选择"), children: outletLabel(status?.outlets?.[managed.target ?? '']) },
          ] : []),
          { key: 'membership', label: t("我的应用收录"), children: [favorite && t("已收藏"), application.mode !== 'rule' && t("已设置专属分流")].filter(Boolean).join(' · ') || t("尚未收录；收藏后即可加入") },
        ]} />
      </div>
      <div className="detail-section"><h3>{t("实际连接")}<small>{evidence.length}</small></h3>
        <p className="secondary-copy">{t("只显示已观察到的连接；已有连接可能仍使用旧节点。")}</p>
        {evidence.length ? <div className="evidence-list">{evidence.map((item, index) => <div key={index}><strong>{item.process}</strong><Tag color={item.matched ? 'success' : 'error'}>{item.matched ? t("符合设置") : t("不符合设置")}</Tag><span>{item.destination} → {item.node ?? item.outbound}{item.usesCurrentNode === false ? t("（旧节点）") : ''}</span></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("尚未观察到新连接")} />}
      </div>
      <Collapse items={[
        { key: 'processes', label: t("主程序与辅助进程 · {0} 个", [application.processes.length]), children: <><p className="secondary-copy">{t("应用规则按程序路径匹配；辅助进程由后端识别。")}</p><ul className="process-list">{application.processes.map(name => <li key={name}>{name}</li>)}</ul>{application.processWarnings?.map(warning => <Alert key={warning} type="warning" title={t(warning)} />)}</> },
        { key: 'source', label: t("程序位置与来源"), children: <Descriptions column={1} size="small" items={[
          { key: 'source', label: t("来源"), children: application.source === 'scan' ? t("本机扫描") : t("手动添加或管理记录") },
          { key: 'path', label: t("主程序"), children: <code className="break-text">{application.path || t("未记录")}</code> },
        ]} /> },
      ]} />
    </>}
  </Drawer>
}
