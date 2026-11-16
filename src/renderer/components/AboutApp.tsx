import { useState } from 'react'
import { App, Button, Modal, Tag } from 'antd'
import { CopyOutlined, GithubOutlined, CommentOutlined } from '@ant-design/icons'
import { projectLinks, versionSummary } from '../../shared/appInfo'
import { buildInfo } from '../buildInfo'
import { Brand } from './Brand'
import { formatDateTime, t } from '../i18n'
import { deferredFeature } from './deferredFeature'
const UpdatePanel = deferredFeature(() => import('./UpdatePanel').then(module => ({ default: module.UpdatePanel })))

export function AboutApp() {
  const [open, setOpen] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const close = () => { setOpen(false); setShowUpdates(false) }
  const { message } = App.useApp()
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
    <button className="about-app-trigger" onClick={() => setOpen(true)} aria-label={t('关于 AppRoute')}>{t('预览版')}<span aria-hidden="true">·</span><span>{t('关于')}</span></button>
    <Modal className="about-app-modal" title={t('关于 AppRoute')} open={open} onCancel={close} width={showUpdates ? 600 : 420} centered footer={<><Button onClick={() => setShowUpdates(value => !value)}>{t(showUpdates ? '收起更新信息' : '版本更新')}</Button><Button onClick={close}>{t('关闭')}</Button></>}>
      <div className="about-app-content"><Brand /><p className="about-app-version">{buildInfo.version}<Tag>{window.appRoute ? t('桌面应用') : t('开发预览')}</Tag></p>
        <p className="about-build-date">{t('构建于 {0}', [formatDateTime(buildInfo.builtAt)])}</p>
        <p>{t('为常用应用选择联网方式。')}</p>
        <div className="about-app-links"><Button size="small" icon={<GithubOutlined />} onClick={() => void openLink('homepage')}>{t('项目主页')}</Button><Button size="small" icon={<CommentOutlined />} onClick={() => void openLink('feedback')}>{t('反馈问题')}</Button><Button size="small" icon={<CopyOutlined />} onClick={() => void copyVersion()}>{t('复制版本信息')}</Button></div>
        <p className="secondary-copy">{window.appRoute ? t('关闭窗口会收至托盘。右键托盘图标可退出；离线恢复入口独立运行。') : t('当前为开发预览。正式桌面入口从本地程序启动。')}</p>
        <p className="secondary-copy">{t('当前为集成测试版，尚未发布稳定版本。')}</p>
      </div>
      {showUpdates && <UpdatePanel />}
    </Modal>
  </>
}
