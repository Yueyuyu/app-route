import { Segmented, Tooltip } from 'antd'
import { routeDescriptions, routeLabels, type RouteMode } from '../types'

export function RouteSelector({ value, onChange, label, disabled = false, legacyProxy = false }: { value: RouteMode; onChange: (mode: RouteMode) => void; label: string; disabled?: boolean; legacyProxy?: boolean }) {
  return <Segmented<RouteMode>
    aria-label={label}
    className={`route-selector route-${value}`}
    value={value}
    disabled={disabled}
    onChange={onChange}
    options={(Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ value: mode, label: <Tooltip title={mode === 'proxy' && legacyProxy ? '仍保留旧出口，请在顶部绑定代理组统一迁移。' : routeDescriptions[mode]}>{mode === 'proxy' && legacyProxy ? '保留旧出口' : routeLabels[mode]}</Tooltip> }))}
  />
}
