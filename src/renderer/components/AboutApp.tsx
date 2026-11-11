import { useState } from 'react'
import { Button, Modal, Tag } from 'antd'
import { version } from '../../../package.json'
import { Brand } from './Brand'
import { t } from '../i18n'

export function AboutApp() {
  const [open, setOpen] = useState(false)
  return <>
    <button className="about-app-trigger" onClick={() => setOpen(true)} aria-label={t('关于 AppRoute')}>{t('预览版')}<span aria-hidden="true">·</span><span>{t('关于')}</span></button>
    <Modal title={t('关于 AppRoute')} open={open} onCancel={() => setOpen(false)} width={420} centered footer={<Button onClick={() => setOpen(false)}>{t('关闭')}</Button>}>
      <div className="about-app-content"><Brand /><p className="about-app-version">{version}<Tag>{window.appRoute ? t('桌面应用') : t('开发预览')}</Tag></p>
        <p>{t('为常用应用选择联网方式。')}</p>
        <p className="secondary-copy">{window.appRoute ? t('关闭窗口会收至托盘。右键托盘图标可退出；离线恢复入口独立运行。') : t('当前为开发预览。正式桌面入口从本地程序启动。')}</p>
        <p className="secondary-copy">{t('当前为集成测试版，尚未发布稳定版本。')}</p>
      </div>
    </Modal>
  </>
}
