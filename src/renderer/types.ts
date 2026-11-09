import type { RouteMode } from '../shared/application'
export type { Application, ApplicationSource, RouteMode } from '../shared/application'
export { validProcessName } from '../core/applicationRules'

export type Page = 'apps' | 'drafts' | 'help'

export const routeLabels: Record<RouteMode, string> = {
  rule: '按 Clash 规则', direct: '直接联网', proxy: '强制走代理',
}

export const routeDescriptions: Record<RouteMode, string> = {
  rule: '遵循 Clash Party 当前的分流规则，按访问的网站决定直连或使用代理节点。',
  direct: '使用本地网络，不经过远端代理节点。实现时仍可能由 Clash 接管后直连。',
  proxy: '被识别并接管的连接统一交给 Clash Party 的指定代理组。请在应用管理页选择代理出口。',
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
