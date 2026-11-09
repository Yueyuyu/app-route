# 第三方组件与素材

AppRoute 自有代码采用 MIT。依赖及素材仍遵循各自许可证，品牌名称和商标权归各权利人。

## 界面与工具链

- React / React DOM、Ant Design、Ant Design Icons、Vite：MIT。
- TypeScript：Apache-2.0。
- 完整安装版本由 `package-lock.json` 固定；包内 LICENSE 和上游声明是对应组件许可的依据。

## 示例 SVG 图标

- `chrome.svg`、`edge.svg`、`vscode.svg`、`telegram.svg`：来自 [SVG Logos](https://github.com/gilbarbara/logos)，通过 `@iconify-json/logos` 生成；图标集元数据标注 CC0-1.0。
- `steam.svg`、`codex.svg`、`wechat.svg`：来自 [Simple Icons](https://github.com/simple-icons/simple-icons)，通过 `@iconify-json/simple-icons` 生成；图标集元数据标注 CC0-1.0。`codex.svg` 使用 OpenAI 标识作示例识别。
- 生成入口：`npm run icons`。QQ 音乐示例使用界面通用应用标识；本机扫描可读取实际程序图标。

图标集的素材许可不授予商标权，也不表示品牌对 AppRoute 的认可。品牌图标仅用于标识用户管理的软件，不作为 AppRoute 品牌。

## 后续代理组件

当前仓库不包含 Mihomo、sing-box、ProxyBridge 或其他流量接管组件的二进制或源代码。将来若复制、链接或分发相关组件，须按具体使用方式检查其许可证并补充对应声明；MIT 仅适用于本项目自有代码。
