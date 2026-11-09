import type { Application } from '../types'

export const exampleApplications: Application[] = [
  { id: 'qqmusic', name: 'QQ 音乐', processes: ['QQMusic.exe'], category: '音乐娱乐', mode: 'direct', source: 'example' },
  { id: 'wechat', name: '微信', processes: ['WeChat.exe'], category: '社交通讯', mode: 'direct', icon: '/icons/wechat.svg', source: 'example' },
  { id: 'chrome', name: 'Google Chrome', processes: ['chrome.exe'], category: '浏览器', mode: 'rule', icon: '/icons/chrome.svg', source: 'example' },
  { id: 'edge', name: 'Microsoft Edge', processes: ['msedge.exe'], category: '浏览器', mode: 'rule', icon: '/icons/edge.svg', source: 'example' },
  { id: 'vscode', name: 'Visual Studio Code', processes: ['Code.exe'], category: '开发工具', mode: 'rule', icon: '/icons/vscode.svg', source: 'example' },
  { id: 'telegram', name: 'Telegram', processes: ['Telegram.exe'], category: '社交通讯', mode: 'proxy', icon: '/icons/telegram.svg', source: 'example' },
  { id: 'steam', name: 'Steam', processes: ['steam.exe'], category: '游戏平台', mode: 'rule', icon: '/icons/steam.svg', source: 'example' },
  { id: 'codex', name: 'Codex', processes: ['Codex.exe'], category: '开发工具', mode: 'proxy', icon: '/icons/codex.svg', source: 'example' },
]
