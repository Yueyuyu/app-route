import { Button, Popover } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

/** 说明可通过点击、键盘打开，不把必须阅读的内容只放在悬浮提示里。 */
export function HelpTip({ title, children }: { title: string; children: ReactNode }) {
  return <Popover trigger="click" title={title} content={<div className="help-popover">{children}</div>}>
    <Button type="text" size="small" className="help-tip" icon={<QuestionCircleOutlined />} aria-label={`${title}说明`} />
  </Popover>
}
