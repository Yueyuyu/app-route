import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import 'antd/dist/reset.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ConfigProvider locale={zhCN} theme={{ token: {
    colorPrimary: '#3265ed', colorInfo: '#3265ed', colorText: '#202938', colorTextSecondary: '#7b8393',
    colorBorder: '#dce0e8', colorBorderSecondary: '#edf0f5', borderRadius: 7, controlHeight: 36,
    fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif',
    fontSize: 14,
  }, components: {
    Button: { primaryShadow: 'none', defaultShadow: '0 1px 2px rgba(20,35,70,.03)', fontWeight: 500 },
    Table: { headerBg: '#f5f7fb', headerColor: '#384252', headerSplitColor: 'transparent', rowHoverBg: '#fafbfe', cellPaddingBlock: 10, cellPaddingInline: 16 },
    Menu: { itemBg: 'transparent', itemSelectedBg: '#e4edff', itemSelectedColor: '#3265ed', itemColor: '#4b5565', itemHeight: 44, itemBorderRadius: 7 },
    Tabs: { horizontalItemGutter: 28, inkBarColor: '#3265ed', titleFontSize: 14 },
    Segmented: { trackBg: '#f5f6f8', itemSelectedBg: '#fff', itemSelectedColor: '#3265ed' },
  } }}><AntApp><App /></AntApp></ConfigProvider></React.StrictMode>,
)
