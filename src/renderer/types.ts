import type { RouteMode } from '../shared/application'
export type { Application, ApplicationSource, RouteMode } from '../shared/application'
export { validProcessName } from '../core/applicationRules'

export type Page = 'apps' | 'drafts' | 'help' | 'icons'

export const routeLabels: Record<RouteMode, string> = {
  rule: '按 Clash 规则', direct: '直接联网', proxy: '指定代理',
}

export const routeDescriptions: Record<RouteMode, string> = {
  rule: '沿用 Clash Party 当前配置与订阅规则，每条连接按域名、IP 等条件决定直连或使用哪个代理。AppRoute 不为该应用增加专属规则。',
  direct: '该应用被识别并进入 Clash 的新连接优先使用 DIRECT，不经过远端代理节点；仍可能经过本机 Clash 内核，不会关闭其他 VPN 或修改系统网络。',
  proxy: '该应用被识别并进入 Clash 的新连接优先使用你在 AppRoute 选定的节点或代理组，不再按原规则逐个网站分流。出口来自 Clash Party，应用保存的出口见行内记录。',
}

export const categories = ['音乐娱乐', '社交通讯', '浏览器', '开发工具', '游戏平台', '办公效率', '其他应用']

export function inferCategory(name: string): string {
  if (/music|音乐|spotify|video|视频/i.test(name)) return '音乐娱乐'
  if (/wechat|weixin|微信|telegram|QQ|discord|钉钉|飞书/i.test(name)) return '社交通讯'
  if (/chrome|edge|firefox|浏览器|opera/i.test(name)) return '浏览器'
  if (/code|codex|idea|studio|git|python|node|docker|apifox|antigravity|cursor/i.test(name)) return '开发工具'
  if (/steam|wegame|epic|游戏/i.test(name)) return '游戏平台'
  if (/office|word|excel|notion|wps|文档/i.test(name)) return '办公效率'
  return '其他应用'
}
