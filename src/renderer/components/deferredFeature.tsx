import { Component, lazy, Suspense, useMemo, useState, type ComponentProps, type ComponentType, type ReactNode } from 'react'
import { Alert, Button, Spin } from 'antd'
import { t } from '../i18n'

class FeatureBoundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <Alert className="deferred-feature" type="warning" showIcon title={t('页面加载失败，请重试；其他页面和恢复入口仍可使用。')} action={<Button onClick={this.props.retry}>{t('重试')}</Button>} /> : this.props.children
  }
}

/** 仅在首次显示时加载；局部失败不隐藏主导航和网络恢复入口。重试重新创建 lazy 实例。 */
export function deferredFeature<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return function DeferredFeature(props: ComponentProps<T>) {
    const [attempt, setAttempt] = useState(0)
    const Feature = useMemo(() => lazy(load), [attempt])
    return <FeatureBoundary key={attempt} retry={() => setAttempt(value => value + 1)}><Suspense fallback={<div className="deferred-feature" role="status"><Spin size="small" /><span>{t('正在加载页面…')}</span></div>}><Feature {...props} /></Suspense></FeatureBoundary>
  }
}
