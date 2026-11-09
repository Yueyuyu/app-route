import { AppstoreOutlined } from '@ant-design/icons'
import { useState } from 'react'

export function ApplicationIcon({ name, icon }: { name: string; icon?: string }) {
  const [failed, setFailed] = useState(false)
  return <span className="application-icon" aria-hidden="true">
    {icon && !failed ? <img src={icon} alt="" onError={() => setFailed(true)} />
      : <span className="application-icon-fallback" title={name}><AppstoreOutlined /></span>}
  </span>
}
