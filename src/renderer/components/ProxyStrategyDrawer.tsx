import { t } from '../i18n'
import { Alert, App, Button, Checkbox, Collapse, Drawer, Empty, Input, Radio, Select, Space, Tag } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, HolderOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import type { IntegrationStatus } from '../../shared/integration'
import { strategyDefaults, strategyLabels, type ProxyStrategy } from '../../shared/proxyStrategy'
import { HelpTip } from './HelpTip'

interface Props { status?: IntegrationStatus; busy: boolean; apply: (strategy: ProxyStrategy, revision: string) => Promise<void> }
export function ProxyStrategyDrawer({ status, busy, apply }: Props) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ProxyStrategy['mode']>('existing')
  const [group, setGroup] = useState<string>()
  const [nodes, setNodes] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState(strategyDefaults)
  const [saving, setSaving] = useState(false)
  const [dragged, setDragged] = useState<string>()
  const dragSource = useRef<string | undefined>(undefined)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState<string>()
  const groups = status?.groupChoices?.filter(choice => !status.proxyStrategy || status.proxyStrategy.mode === 'existing' || choice.name !== status.proxyGroup) ?? []
  const available = status?.strategyNodes ?? []
  const candidates = available.filter(node => node.name.toLowerCase().includes(search.toLowerCase()))
  const missing = nodes.filter(name => !available.some(node => node.name === name))
  const disabled = saving || busy || !status?.connected || Boolean(status.pending) || Boolean(status.untrackedRuleCount)
  function edit() {
    const strategy = status?.proxyStrategy
    setMode(strategy?.mode ?? 'existing'); setGroup(strategy?.mode === 'existing' ? strategy.group : !strategy ? status?.proxyGroup : undefined)
    setNodes(strategy && strategy.mode !== 'existing' ? [...strategy.nodes] : [])
    setOptions(strategy && strategy.mode !== 'existing' ? { interval: strategy.interval, timeout: strategy.timeout, tolerance: strategy.tolerance } : strategyDefaults)
    setSearch(''); setError(''); setRevision(status?.revision); setOpen(true)
  }
  function move(name: string, index: number) {
    setNodes(current => { const rest = current.filter(item => item !== name); rest.splice(Math.max(0, Math.min(index, rest.length)), 0, name); return rest })
  }
  async function save() {
    if (revision !== status?.revision) { setError("设置已在其他操作中变化，请关闭后重新打开，核对最新策略。"); return }
    setSaving(true); setError('')
    try {
      await apply(mode === 'existing' ? { mode, group: group! } : { mode, nodes, ...options }, revision!)
      setOpen(false); void message.success(t("代理策略已应用，后续新连接按此策略选择节点。"))
    } catch (error) { setError(error instanceof Error ? error.message : "策略应用失败，请检查恢复状态。") }
    finally { setSaving(false) }
  }
  return <>
    <Button onClick={edit} disabled={saving || busy || !status?.connected || Boolean(status.pending)}>{t("代理策略")}</Button>
    <Drawer title={t("代理策略")} open={open} onClose={() => !saving && setOpen(false)} closable={!saving} maskClosable={!saving} keyboard={!saving} size={640}
      footer={<div className="strategy-footer"><span>{t("应用到所有已设为走代理的应用")}</span><Space><Button disabled={saving} onClick={() => setOpen(false)}>{t("取消")}</Button><Button type="primary" loading={saving} disabled={disabled || (mode === 'existing' ? !groups.some(item => item.name === group) : nodes.length < 2 || nodes.length > 32 || missing.length > 0)} onClick={() => void save()}>{t("应用策略")}</Button></Space></div>}>
      <p className="strategy-intro">{t("为所有“跟随代理组”的应用选择出口。")}</p>
      {Boolean(status?.untrackedRuleCount) && <Alert type="warning" showIcon title={t("请先核对历史规则，当前可查看选项但不能应用策略。")} />}
      <Radio.Group value={mode} onChange={event => setMode(event.target.value)} disabled={saving} className="strategy-options">
        {(['existing', 'fallback', 'url-test'] as const).map(value => <Radio value={value} key={value}><strong>{t(strategyLabels[value])}</strong><small>{value === 'existing' ? t("使用 Clash Party 已有组，继续跟随它的选择。") : value === 'fallback' ? t("按优先顺序使用可用节点，当前节点故障时使用备用。") : t("根据探测延迟选择节点，差距较小时保持当前节点。")}</small></Radio>)}
      </Radio.Group>
      {mode === 'existing' ? <div className="strategy-group-field"><label htmlFor="strategy-existing-group">{t("跟随哪个代理组")}</label><Select id="strategy-existing-group" aria-label={t("沿用的代理组")} value={group} onChange={setGroup} disabled={saving} placeholder={t("选择 Clash Party 已有组")} showSearch optionFilterProp="label" options={groups.map(item => ({ value: item.name, label: `${item.name} → ${item.current}` }))} /><p>{t("不改变这个组的成员或自动策略。可以在 Clash Party 中继续手动切换。")}</p></div> : <>
        <div className="strategy-scope">{t("使用 AppRoute 独立代理组")}<HelpTip title={t("自动策略范围")}>{t("保留 Clash Party 原有组。所有候选不可用时不会自动直连；旧连接可能继续使用原节点。这里只列出配置明确声明的远端节点；动态代理集合请沿用已有组。")}</HelpTip></div>
        <div className="strategy-node-heading"><strong>{t("已选节点 ·")}{nodes.length}/32</strong><span>{mode === 'fallback' ? t("拖动调整优先级，也可使用上下按钮") : t("至少选择两个节点")}</span></div>
        <div className="strategy-selected" aria-label={t("候选节点优先顺序")}>{!nodes.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("从下方勾选候选节点")} /> : nodes.map((name, index) => <div key={name} data-strategy-node-index={index} className={`strategy-node ${dragged === name ? 'is-dragging' : ''}`}>
          {mode === 'fallback' && <button type="button" className="strategy-drag-handle" aria-label={t("拖动 {0} 排序", [name])} disabled={saving}
            onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragSource.current = name; setDragged(name) }}
            onPointerUp={event => {
              // 指针捕获保留松开事件，命中实际目标行；不依赖 Electron 的原生 HTML 拖放。
              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-strategy-node-index]')
              const targetIndex = target?.getAttribute('data-strategy-node-index')
              if (dragSource.current === name && !saving && targetIndex != null) move(name, Number(targetIndex))
              dragSource.current = undefined
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
              setDragged(undefined)
            }} onPointerCancel={() => { dragSource.current = undefined; setDragged(undefined) }} onLostPointerCapture={() => { dragSource.current = undefined; setDragged(undefined) }}><HolderOutlined /></button>}<span className="strategy-priority">{index + 1}</span><span className="strategy-node-name">{name}{missing.includes(name) && <Tag color="warning">{t("已消失")}</Tag>}</span>
          <Space size={2}>{mode === 'fallback' && <><Button type="text" size="small" aria-label={t("上移 {0}", [name])} disabled={saving || index === 0} icon={<ArrowUpOutlined />} onClick={() => move(name, index - 1)} /><Button type="text" size="small" aria-label={t("下移 {0}", [name])} disabled={saving || index === nodes.length - 1} icon={<ArrowDownOutlined />} onClick={() => move(name, index + 1)} /></>}<Button type="text" size="small" disabled={saving} onClick={() => setNodes(current => current.filter(item => item !== name))}>{t("移除")}</Button></Space>
        </div>)}</div>
        <Input.Search aria-label={t("搜索候选节点")} placeholder={t("搜索候选节点")} value={search} onChange={event => setSearch(event.target.value)} allowClear />
        <div className="strategy-candidates">{candidates.map(node => <div key={node.name} className="strategy-candidate"><Checkbox checked={nodes.includes(node.name)} disabled={saving || (!nodes.includes(node.name) && nodes.length >= 32)} onChange={event => setNodes(current => event.target.checked ? [...current, node.name] : current.filter(name => name !== node.name))}>{node.name}</Checkbox><small>{node.health === 'healthy' ? `${node.delay} ms` : node.health === 'unhealthy' ? t("最近探测失败") : t("暂无近期探测")}</small></div>)}{!candidates.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={available.length ? t("没有匹配的节点") : t("没有可选节点，可沿用现有策略")} />}</div>
        <p className="strategy-note">{t("延迟仅代表该次探测，不等于下载速度。")}<HelpTip title={t("节点探测")}>{t("自动策略由 Mihomo 执行，AppRoute 关闭后仍会运行。探测间隔不代表故障一定在该时间内恢复。")}</HelpTip></p>
        <Collapse items={[{ key: 'advanced', label: t("高级设置"), children: <div className="strategy-advanced">
          <label>{t("检查间隔")}<Select aria-label={t("检查间隔")} value={options.interval} disabled={saving} onChange={interval => setOptions(current => ({ ...current, interval }))} options={[30, 60, 120, 300].map(value => ({ value, label: t("{0} 秒", [value]) }))} /></label>
          <label>{t("探测超时")}<Select aria-label={t("探测超时")} value={options.timeout} disabled={saving} onChange={timeout => setOptions(current => ({ ...current, timeout }))} options={[3000, 5000, 10000].map(value => ({ value, label: t("{0} 秒", [value / 1000]) }))} /></label>
          {mode === 'url-test' && <label>{t("切换容差")}<Select aria-label={t("切换容差")} value={options.tolerance} disabled={saving} onChange={tolerance => setOptions(current => ({ ...current, tolerance }))} options={[50, 100, 150].map(value => ({ value, label: `${value} ms` }))} /></label>}
          <p>{t("使用 HTTPS 204 测试地址。检查间隔不代表故障一定在此时间内恢复。")}</p>
        </div> }]} />
      </>}
      {(error || missing.length > 0) && <Alert className="strategy-error" type="error" showIcon title={t(error) || t("部分候选节点已消失，请移除后重新选择。")} />}
    </Drawer>
  </>
}
