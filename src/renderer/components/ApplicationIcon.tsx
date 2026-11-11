import { AppstoreOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { Application } from '../../shared/application'
import { catalogIconUrl, fallbackIconUrl, matchApplicationIcon, matchLocalApplicationIcon } from '../../core/applicationIcons'
import { useApplicationIcons } from '../hooks/useApplicationIcons'

export function ApplicationIcon({ name, icon, application, resolved = false }: { name: string; icon?: string; application?: Application; resolved?: boolean }) {
  const [failed, setFailed] = useState<string[]>([])
  const context = useApplicationIcons()
  useEffect(() => { setFailed([]) }, [icon, context?.state])
  const entries = context?.state?.applications ?? []
  const exact = application && entries.find(entry => entry.applicationId === application.id)
  const local = application && matchLocalApplicationIcon(application, entries.filter(entry => entry.origin === 'scan' && entry.available))
  const builtin = application && matchApplicationIcon(application)
  const candidates = resolved ? [icon] : [exact?.hasCustom ? exact.icon : undefined, exact?.source === 'local' ? exact.icon : undefined,
    local?.icon, builtin ? catalogIconUrl(builtin.id) : undefined, icon, fallbackIconUrl(application?.category ?? '')]
  const source = candidates.find(value => value && !failed.includes(value))
  return <span className="application-icon" aria-hidden="true">
    {source ? <img key={source} src={source} alt="" onError={() => { setFailed(current => [...current, source]); context?.reportFailure(source) }} />
      : <span className="application-icon-fallback" title={name}><AppstoreOutlined /></span>}
  </span>
}
