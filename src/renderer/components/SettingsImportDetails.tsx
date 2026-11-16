import { Collapse, Descriptions, Table } from 'antd'
import { t } from '../i18n'
import { routeLabels } from '../types'
import type { ImportRow, SettingsDifference, SettingsPreview } from '../../shared/settings'
import type { ProxyStrategy } from '../../shared/proxyStrategy'
import { languageNames, type LanguagePreference } from '../../shared/i18n/language'

const fieldNames = { name: '应用名称', category: '分类', mode: '联网方式', favorite: '收藏' }
function displayValue(field: SettingsDifference['field'], value: string | boolean) {
  if (field === 'mode') return t(routeLabels[value as keyof typeof routeLabels])
  if (field === 'favorite') return t(value ? '已收藏' : '未收藏')
  return field === 'category' ? t(String(value)) : String(value)
}
export function ImportDifferences({ row }: { row: ImportRow }) {
  return <div className="import-differences">
    {row.localPath && <p className="settings-path">{t('本机程序')} · {row.localPath}</p>}
    <Table<SettingsDifference> size="small" pagination={false} rowKey="field" dataSource={row.differences} columns={[
      { title: t('字段'), dataIndex: 'field', render: (field: SettingsDifference['field']) => t(fieldNames[field]) },
      { title: t('当前'), render: (_, item) => displayValue(item.field, item.before) },
      { title: t('导入后'), render: (_, item) => displayValue(item.field, item.after) },
    ]} />
  </div>
}
function strategyLabel(strategy?: ProxyStrategy) {
  if (!strategy) return t('尚未选择代理组')
  return strategy.mode === 'existing' ? strategy.group : t(strategy.mode === 'fallback' ? '故障备用' : '延迟优先') + ' · ' + strategy.nodes.join('、')
}
export function ImportGlobalDifferences({ preview }: { preview: SettingsPreview }) {
  const language = (value: LanguagePreference) => value === 'system' ? t('跟随系统') : languageNames[value]
  return <Collapse className="import-global-differences" items={[{ key: 'global', label: t('语言与策略差异'), children: <Descriptions column={1} size="small" items={[
    { key: 'language', label: t('显示语言'), children: `${language(preview.currentLanguage)} → ${language(preview.language ?? preview.currentLanguage)}` },
    { key: 'strategy', label: t('代理策略'), children: <div className="break-text">{strategyLabel(preview.currentStrategy)} → {strategyLabel(preview.proxyStrategy ?? preview.currentStrategy)}</div> },
  ]} /> }]} />
}
