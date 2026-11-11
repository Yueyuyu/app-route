import { t } from '../i18n'
import { Segmented, Tooltip } from 'antd'
import { routeHints, routeLabels, type RouteMode } from '../types'

export function RouteSelector({ value, onChange, label, disabled = false, pending = false, legacyProxy = false }: { value: RouteMode; onChange: (mode: RouteMode) => void; label: string; disabled?: boolean; pending?: boolean; legacyProxy?: boolean }) {
  return <Segmented<RouteMode>
    aria-label={label}
    className={`route-selector route-${value}${pending ? ' route-pending' : ''}`}
    value={value}
    disabled={disabled}
    onChange={onChange}
    options={(Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ value: mode, label: <Tooltip title={mode === 'proxy' && legacyProxy ? t("仍保留旧出口，请在代理策略中统一绑定。") : t(routeHints[mode])}>{mode === 'proxy' && legacyProxy ? t("保留旧出口") : t(routeLabels[mode])}</Tooltip> }))}
  />
}
