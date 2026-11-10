# AppRoute 应用图标

2026-11-10 确认采用此版。浅蓝圆角底、白色与薄荷绿分流路径，左侧短箭头较低，右侧长箭头较高；两侧保留原有朝向及明显高度差。后续不得自行改为对称、等高或朝外的箭头。

![AppRoute 图标](../../public/brand/app-route-512.png)

## 文件与用途

| 文件 | 用途 |
| --- | --- |
| `public/brand/app-route.png` | 用户确认的生成原图，按原文件完整保留 |
| `public/brand/app-route-32.png` | 浏览器标签页图标 |
| `public/brand/app-route-128.png` | 应用界面、README 标识 |
| `public/brand/app-route-180.png` | Apple touch icon |
| `public/brand/app-route-512.png` | 通用展示、后续桌面打包 |
| `public/brand/app-route-wordmark.png` | 2026-11-10 用户确认的稍细连笔艺术字原图，1983 × 793 像素；页面通过视窗去除留白 |
| `public/favicon.ico` | 浏览器及 Windows 图标，含 16、24、32、48、64、128、256 像素七帧 |

Windows 上执行 `npm run icons:app`，由 `scripts/export-app-icon.ps1` 使用系统 System.Drawing 重新导出尺寸及 ICO，不需要额外依赖。该命令只缩放和封装，不重绘、裁切、改色或修改原图。透明区域随原图保留。

当前网页和代码仓库已接入此图标。ICO 可用于 Windows 快捷方式及后续安装包；当前还没有 Electron 安装包，不表示已交付桌面安装版本。

## 来源与生成约束

该图标由 GPT 图像生成功能根据本项目设计要求及用户提供的原版参考图调整，并经用户确认用于 AppRoute。它与 `public/icons` 内用于识别第三方应用的示例标识分开管理。

定稿生成提示词如下；导出无需重新生成。

> Use case: precise-object-edit, minimal color adjustment. The attached image is the user's EXACT chosen AppRoute icon and the sole edit target. The user has corrected previous attempts: they specifically want this original ASYMMETRICAL arrangement. Preserve the fork glyph's exact silhouette, proportions, positions, curves, directions, height difference, and white-left / mint-right color relationship. The LEFT WHITE arrow is clearly LOWER and SHORTER; the RIGHT MINT arrow is clearly HIGHER and LONGER. Keep that pronounced height difference exactly as in the reference. Both arrowheads retain their original orientation. Do NOT align their tops. Do NOT make them symmetric. Do NOT rotate the arrowheads outward. Do NOT normalize the route lengths or move either arrow. Do NOT redesign the stem or junction. Make ONLY a restrained background-color refinement: replace the very dark saturated royal-blue tile with a lighter but still vivid, clean medium cornflower blue, approximately #467FDC, and make its existing gradient much subtler. A very gentle top #528AE5 to bottom #3E74D0 is acceptable, but no dark navy or electric ultramarine area. Preserve the original arrow colors with no significant change and preserve their high contrast. Keep the same rounded-square tile, padding, center placement, image composition, and genuinely transparent outside corners. The result must look like the same original icon with a more comfortable blue background, NOT a new layout. Smooth clean edges, clean fully opaque tile interior, no extra objects, no text, no labels, no mockup, no watermark, no holes or decorative shadows. Deliver one revised icon.
