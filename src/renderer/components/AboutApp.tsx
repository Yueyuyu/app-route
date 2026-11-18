import { useState } from 'react'
import { App, Button, Dropdown, Modal, Tag, Tooltip } from 'antd'
import { CopyOutlined, GithubOutlined, CommentOutlined, MoreOutlined, ArrowUpOutlined, HistoryOutlined, QuestionCircleOutlined, InfoCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { projectLinks, versionSummary } from '../../shared/appInfo'
import { buildInfo } from '../buildInfo'
import { Brand } from './Brand'
import { formatDateTime, t } from '../i18n'
import { deferredFeature } from './deferredFeature'
import { useReleaseUpdates } from '../hooks/useReleaseUpdates'
const UpdatePanel = deferredFeature(() => import('./UpdatePanel').then(module => ({ default: module.UpdatePanel })))

export function AboutApp() {
  const [open, setOpen] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const close = () => { if (!updates.installing) { setOpen(false); setShowUpdates(false) } }
  const { message } = App.useApp()
  const updates = useReleaseUpdates()
  const available = updates.result?.state === 'available'
  const transfer = updates.downloadState
  const hasTransfer = ['preparing', 'downloading', 'verifying', 'ready', 'installing', 'error'].includes(transfer.phase)
  const updateLabel = updates.installing ? '正在安装' : transfer.phase === 'ready' ? '可安装更新' : ['preparing', 'downloading', 'verifying'].includes(transfer.phase) ? '更新下载中' : transfer.phase === 'error' ? '下载未完成' : '有新版本'
  const show = (update = false) => { setShowUpdates(update); setOpen(true) }
  async function openLink(target: keyof typeof projectLinks) {
    try {
      if (window.appRoute) await window.appRoute.request('app.open-link', { target })
      else window.open(projectLinks[target], '_blank', 'noopener,noreferrer')
    } catch { void message.error(t('无法打开链接，请稍后重试。')) }
  }
  async function copyVersion() {
    try {
      if (window.appRoute) await window.appRoute.request('app.copy-version')
      else await navigator.clipboard.writeText(versionSummary(buildInfo))
      void message.success(t('版本信息已复制'))
    } catch { void message.error(t('复制失败，请稍后重试。')) }
  }
  return <>
    <div className="sidebar-tools">
      <Tooltip title={t('关于 AppRoute')}><button className="about-app-trigger" onClick={() => show()} aria-label={t('关于 AppRoute')}><span>v{buildInfo.version}</span></button></Tooltip>
      <div className="sidebar-tool-actions">
        <Tooltip title={t('GitHub 仓库')}><button className="sidebar-icon-button" aria-label={t('GitHub 仓库')} onClick={() => void openLink('homepage')}><GithubOutlined /></button></Tooltip>
        <Dropdown trigger={['click']} placement="topRight" menu={{ items: [
          { key: 'updates', label: t('检查更新'), icon: <SyncOutlined aria-hidden /> },
          { key: 'releases', label: t('更新日志'), icon: <HistoryOutlined aria-hidden /> },
          { key: 'feedback', label: t('反馈问题'), icon: <CommentOutlined aria-hidden /> },
          { key: 'documentation', label: t('在线文档'), icon: <QuestionCircleOutlined aria-hidden /> },
          { type: 'divider' }, { key: 'about', label: t('关于 AppRoute'), icon: <InfoCircleOutlined aria-hidden /> },
        ], onClick: ({ key }) => {
          if (key === 'updates') { show(true); void updates.check() }
          else if (key === 'about') show()
          else void openLink(key as keyof typeof projectLinks)
        } }}><button className="sidebar-icon-button" aria-label={t('更多应用选项')}><MoreOutlined /></button></Dropdown>
      </div>
    </div>
    {(available || hasTransfer) && <button className="sidebar-update" onClick={() => show(true)} aria-label={t('查看可用更新')}><span className="sidebar-update-icon"><ArrowUpOutlined /></span><span><strong>{t(updateLabel)}</strong><small>v{hasTransfer ? transfer.version : updates.result!.release!.version}</small></span><span className="sidebar-update-action">{transfer.phase === 'downloading' ? `${Math.floor(transfer.received / Math.max(1, transfer.total) * 100)}%` : t('查看')}</span></button>}
    <Modal className="about-app-modal" title={t(showUpdates ? '版本更新' : '关于 AppRoute')} open={open} onCancel={close} closable={!updates.installing} keyboard={!updates.installing} maskClosable={!updates.installing} width={showUpdates ? 580 : 420} centered footer={<><Button disabled={updates.installing} onClick={() => setShowUpdates(value => !value)}>{t(showUpdates ? '关于 AppRoute' : '版本更新')}</Button><Button disabled={updates.installing} onClick={close}>{t('关闭')}</Button></>}>
      {!showUpdates && <div className="about-app-content"><Brand /><p className="about-app-version">{buildInfo.version}<Tag>{window.appRoute ? t('桌面应用') : t('开发预览')}</Tag></p>
        <p className="about-build-date">{t('构建于 {0}', [formatDateTime(buildInfo.builtAt)])}</p>
        <p>{t('为常用应用选择联网方式。')}</p>
        <div className="about-app-links"><Button size="small" icon={<GithubOutlined />} onClick={() => void openLink('homepage')}>{t('项目主页')}</Button><Button size="small" icon={<CommentOutlined />} onClick={() => void openLink('feedback')}>{t('反馈问题')}</Button><Button size="small" icon={<CopyOutlined />} onClick={() => void copyVersion()}>{t('复制版本信息')}</Button></div>
        <p className="secondary-copy">{window.appRoute ? t('关闭窗口会收至托盘。右键托盘图标可退出；离线恢复入口独立运行。') : t('当前为开发预览。正式桌面入口从本地程序启动。')}</p>
        <p className="secondary-copy">{t('当前为集成测试版，尚未发布稳定版本。')}</p>
      </div>}
      {showUpdates && <UpdatePanel />}
    </Modal>
  </>
}
