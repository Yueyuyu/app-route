import { Segmented, Tooltip } from 'antd'
import { routeDescriptions, routeLabels, type RouteMode } from '../types'

export function RouteSelector({ value, onChange, label }: { value: RouteMode; onChange: (mode: RouteMode) => void; label: string }) {
  return <Segmented<RouteMode>
    aria-label={label}
    className={`route-selector route-${value}`}
    value={value}
    onChange={onChange}
    options={(Object.keys(routeLabels) as RouteMode[]).map((mode) => ({ value: mode, label: <Tooltip title={routeDescriptions[mode]}>{routeLabels[mode]}</Tooltip> }))}
  />
}
