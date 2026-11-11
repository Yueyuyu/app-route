# 首页截图来源

本目录用于四语 README，图片由 AppRoute 自己的 Electron 界面渲染，未通过生成式图片替换界面。应用品牌沿用已确认的组合标志与桌面图标，未重新设计。

| 文件名 | 内容 |
| --- | --- |
| `<locale>-applications.png` | 应用管理、联网方式、当前代理策略和语言入口 |
| `<locale>-connection.png` | 连接概况与分层详情入口 |
| `<locale>-strategy.png` | 故障备用草稿、节点勾选与优先顺序；未点击应用 |
| `<locale>-rules.png` | AppRoute 专属分流记录 |
| `<locale>-icons.png` | 图标管理和公共图标来源 |
| `<locale>-help.png` | 三种联网方式与常见问题 |

`locale` 为 `zh-CN`、`en`、`ja`、`fr`。共 24 张，拍摄日期 2026-11-11。画面中的应用使用已有公共图标，授权记录见 [第三方素材](../../THIRD_PARTY_NOTICES.md)。

所有应用路径、代理组、节点和连接证据来自 `tests/fixtures/documentationBackend.mjs` 中的虚构数据；没有公开个人清单、订阅或密钥。截图展示界面，不证明真实流量已分流。公开图只包含客户端内容区域。

重新生成：Windows / Node.js 24，运行 `npm ci`、`npm run check:i18n`，人工检查 `output/playwright/localization/` 后复制上述六类图片。其余弹窗、窄窗口、失败快照和验证日志保留在本机忽略目录。维护约定见 [多语言维护](../LOCALIZATION.md)。
