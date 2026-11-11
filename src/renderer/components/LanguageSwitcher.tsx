import { App, Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { languageNames, type LanguagePreference } from '../../shared/i18n/index'
import { t, useLanguage } from '../i18n'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const { message } = App.useApp()
  return <Select className="language-switcher" aria-label={t('显示语言')} value={language} prefix={<GlobalOutlined />} popupMatchSelectWidth={200}
    options={(Object.keys(languageNames) as LanguagePreference[]).map(value => ({ value, label: value === 'system' ? t('跟随系统') : languageNames[value] }))}
    onChange={value => { void setLanguage(value).catch(() => message.error(t('语言偏好保存失败，当前语言保持不变。'))) }} />
}
