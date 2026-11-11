# 第三方组件与素材

AppRoute 自有代码采用 MIT。依赖及素材仍遵循各自许可证，品牌名称和商标权归各权利人。

## 界面与工具链

- React / React DOM、Ant Design、Ant Design Icons、Vite：MIT。
- TypeScript：Apache-2.0。
- PNGJS：MIT，用于本机 PNG 解码、校验和重新编码。
- YAML：ISC；离线恢复程序会打包此依赖。Rolldown：MIT（构建工具）。
- 离线工具仅在本机复制当前已安装的 Node 运行时；公开仓库不分发该二进制。未来制作独立安装包时需附带 Node 及其第三方许可。
- 完整安装版本由 `package-lock.json` 固定；包内 LICENSE 和上游声明是对应组件许可的依据。

## AppRoute 应用图标

`public/brand` 及 `public/favicon.ico` 为本项目使用 GPT 图像生成功能制作、经用户确认采用的应用标识及其尺寸导出。它们不是从本机第三方程序提取的素材；来源、定稿约束和导出方法见 [图标说明](docs/design/app-icon.md)。

## 公共应用图标

- 单一素材清单为 `resources/application-icons/catalog.json`，每项通过 collection/icon 指向作者、源仓库及许可；生成结果位于 `public/icons/apps`，每份 SVG 附有来源注释。图标集版本由锁文件固定。
- [SVG Logos](https://github.com/gilbarbara/logos)：Gil Barbara 及贡献者，CC0-1.0；[许可全文](public/icons/licenses/SVG-Logos-CC0.txt)。
- [Simple Icons](https://github.com/simple-icons/simple-icons)：Simple Icons 贡献者，CC0-1.0；[许可全文](public/icons/licenses/Simple-Icons-CC0.txt)。
- [IconPark](https://github.com/bytedance/IconPark)：ByteDance，Apache-2.0；用于飞书图标，[许可全文](public/icons/licenses/IconPark-Apache-2.0.txt)。上游已归档，本项目使用锁定的静态素材，不依赖在线服务。
- 转换仅封装 SVG 视口、固定 currentColor 为目录中的显示色，并添加来源注释；未重绘品牌形状。生成入口：`npm run icons`。
- `public/icons/fallbacks` 为本项目制作的通用分类图标，适用本项目 MIT 许可。
- 旧版借用 OpenAI 标识的 Codex 示例图标已移除；已安装软件优先使用本机资源。公共库缺少某应用时明确显示默认图标，不能借用其他产品标识宣称已补齐。

图标集的素材许可不授予商标权，也不表示品牌对 AppRoute 的认可。品牌图标仅用于标识用户管理的软件，不作为 AppRoute 品牌。

## 后续代理组件

当前仓库不包含 Mihomo、sing-box、ProxyBridge 或其他流量接管组件的二进制或源代码。将来若复制、链接或分发相关组件，须按具体使用方式检查其许可证并补充对应声明；MIT 仅适用于本项目自有代码。
