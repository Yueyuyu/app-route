# AppRoute 应用图标

2026-11-10，用户确认按使用场景搭配两种外观：**应用内使用第三版随形轮廓，桌面使用 02「适中提亮」深灰蓝底，艺术字保持不变。**

两者共用同一张青蓝渐变的手写分流箭头：左支较短，向左上展开；右支较长，向右上展开。固定原有笔势、箭头方向和非对称比例，仅外围处理不同。

## 文件与用途

| 文件 | 用途 |
| --- | --- |
| `resources/brand/app-icon/brush-routing-source.png` | GPT 生成的原始箭头，原文件完整保留 |
| `resources/brand/app-icon/route-glyph.png` | 组合评审使用的同一张 256px 透明箭头 |
| `resources/brand/app-icon/approved.json` | 两种外观的精确参数、用户决定、原图与字标哈希 |
| `resources/brand/app-icon/source.json` | 原始箭头的实际生成提示词和来源 |
| `public/brand/app-route-inline.svg` | 应用内第三版随形轮廓，用于侧栏、手机导航、顶部栏 |
| `public/brand/app-route.png` | 02 深灰蓝桌面主图，1024px，圆角外透明 |
| `public/brand/app-route-32.png` | 浏览器标签页图标 |
| `public/brand/app-route-128.png` | README 等独立品牌展示 |
| `public/brand/app-route-180.png` | Apple touch icon |
| `public/brand/app-route-512.png` | 独立图标展示及后续桌面打包 |
| `public/favicon.ico` | 浏览器及 Windows 图标，含 16、24、32、48、64、128、256px 七帧 |
| `public/brand/app-route-wordmark.png` | 已确认的艺术字原文件，此次不修改 |

应用内示意：

<img src="../../public/brand/app-route-inline.svg" width="88" height="88" alt="第三版随形轮廓" />

桌面图标：

<img src="../../public/brand/app-route-512.png" width="176" height="176" alt="02 深灰蓝底" />

## 固定参数与再导出

参数以 `approved.json` 为准。应用内对原箭头的透明轮廓增加浅色包边；SVG 内嵌原始 PNG，避免独立图片无法加载外部引用。桌面保留 28% 圆角、8% 内留白，145° 渐变依次为 `#3f526b`、`#334157`、`#2e3b4f`，停点为 0%、60%、100%。这些参数来自已确认的 02 适中提亮预览。

Windows 上执行：

```sh
npm run icons:app
```

`scripts/render-app-icon.ps1` 先核对箭头和字标哈希，导出应用内 SVG、合成桌面 PNG；`scripts/export-app-icon.ps1` 再缩放并封装多尺寸 PNG / ICO。使用系统 System.Drawing，不依赖额外图像生成或 npm 图片库。不会重新生成、重绘或改色箭头，也不会修改艺术字；桌面外投影由使用场景提供，不烘焙进图标的透明外角。

## 品牌组合与桌面边界

`Brand.tsx` 继续使用原来的字标图片、显示视窗、宽度、间距及中文副标题，只将左侧图标替换为随形版本。顶部栏同样使用随形版本。浏览器标签页与桌面独立入口使用深灰蓝底。

本次本机验证使用了桌面 `AppRoute` 快捷方式，引用导出的 ICO，并打开 `http://127.0.0.1:4318/`；它依赖本机预览服务运行，不是 Electron 安装包。这是历史预览验证。2026-11-10 桌面版安装已把 AppRoute 入口改为独立 AppRoute.exe；窗口、托盘和快捷方式继续使用本稿的深灰蓝 ICO。独立网络恢复入口保持原样。

## 设计过程

先确认与连笔艺术字相近的手写分流箭头，再比较透明、浅冰蓝、深灰蓝和其他浅色底。深灰蓝 02 单独展示获得认可，与字标组合后仍显厚重；随后比较玻璃薄框、局部柔光、随形轮廓。最终用户选择按场景使用：应用内随形、桌面深灰蓝。

旧的浅蓝底白色 / 薄荷绿图标保留在 Git 历史中，不再作为当前定稿。上述资源属于 AppRoute 自身品牌，与 `public/icons` 中的第三方应用标识分开管理。

## 本次验证（2026-11-10）

- 艺术字 SHA-256 保持不变，与定稿记录一致。
- `npm run check` 通过：34 项测试、类型检查、恢复工具打包和页面构建；保留既有 bundle 体积提示。
- 实际应用页面已确认侧栏与顶部栏使用随形 SVG，图片成功加载；桌面目录已实际观察到深灰蓝 ICO。
- 网络恢复快捷方式写入前后哈希一致，未执行网络配置变更。
