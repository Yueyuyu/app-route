# 图标库与本机缓存

## 使用与数据边界

入口为设置 → 图标管理。点击“检查并补齐本机图标”扫描本机；图标列表也包含已登记的草稿。可以搜索名称/进程，筛选来源、待完善或加载失败，上传 PNG/JPG/WebP，选择公共图标或恢复自动。

图标操作立即生效，不写入任何代理配置、应用进程匹配或分流规则。显示关联允许用唯一、精确的产品名称匹配本机图标，但不会因此更改示例进程名；示例仍不能直接应用分流。

来源顺序：用户指定 → 本机图标 → 公共图标 → 分类默认图标。相同进程对应多个应用时，只在名称能唯一确定时关联；公共库对 Code.exe 等通用进程名额外核对产品名或发布者。

本机索引保存于 `%LOCALAPPDATA%\AppRoute\icons\index.json`，自动提取在 `cache`，用户替换在 `custom`。PNG 用内容哈希命名；原子替换索引并在该目录单独加锁。重扫不会覆盖用户替换；恢复自动只移除自定义关联，保留图片文件。当前没有自动清理历史图片的策略。

旧草稿的 PNG data URL 经校验写入独立缓存后替换成缓存 URL，减少 localStorage 占用。缓存丢失或损坏时回退并标记待完善；上次提取成功、本次失败时保留旧图并明确提示。扫描不再出现的本机条目从当前列表隐藏，索引和用户替换保留。

## 目录职责

| 位置 | 内容 |
| --- | --- |
| `public/brand` | AppRoute 自身的定稿标识 |
| `resources/application-icons/catalog.json` | 公共应用名称、分类、进程、别名、图标集与许可来源；唯一维护入口 |
| `public/icons/apps` | 由目录生成的 50 个常用应用 SVG |
| `public/icons/fallbacks` | 7 个项目默认分类图标 |
| `public/icons/licenses` | 图标集许可全文 |
| `src/shared/applicationIcon.ts` | 图标来源、检查结果与页面数据契约 |
| `src/core/applicationIcons.ts` | 公共与本机显示匹配规则 |
| `src/main/platform/windows/extract-application-icon.ps1` | 固定的资源图标读取，释放原生图标句柄 |
| `src/main/platform/windows/scan-applications.ps1` | 快捷方式、安装登记、可见进程、商店清单扫描 |
| `src/main/services/applicationIconService.ts` | 图片校验、规范化、缓存、索引及用户覆盖 |
| `tooling/vite/applicationIcons.ts` | 同源、会话、大小约束及图标图片接口 |
| `src/renderer/hooks/useApplicationIcons.tsx` | 页面共享状态、草稿登记及图标同步 |
| `src/renderer/components/IconManagement.tsx` | 图标管理界面 |
| `src/renderer/components/ApplicationIcon.tsx` | 列表、扫描、详情等位置的统一显示与加载失败回退 |

添加公共图标：在 catalog.json 添加条目并记录 collection 的作者及许可 → `npm run icons` → `npm run check` → 检查实际显示。只打包选中的图标，不在运行时访问 CDN。

## 提取与校验

优先读取快捷方式 IconLocation 或安装登记中的资源索引，再读取 EXE 和配套 UI.dll；商店应用关联开始菜单 AUMID、应用清单与 PNG 资源。跳过 UNC 资源及共享系统宿主，不启动应用、不请求管理员权限。Application Verifier 的 WOW 入口可复用 Windows System32 中同产品的 UI 资源。

PNG 验证签名、结构、CRC、尺寸、完整解码和可见像素；限制为 512 KB、512 × 512，重新编码后保存。拒绝交错 PNG 以保持解码输出上限；页面导入会先转成非交错的 128 像素 PNG，移除文件名与附加元数据。页面接受不超过 2 MB、4096 像素边长的 PNG/JPG/WebP；不接收用户 SVG。

商店应用若超过 95% 的可见像素为浅色，且存在明显透明区域，会在保留图形的同时增加中性对比底色，并在详情注明。低于 24 像素、默认图标或缓存异常不会算作已完善。

## 本机验收记录（2026-11-10）

- 旧扫描器识别 145 项；本次扫描识别 196 项，全部取得并解码本机图标，待完善为 0。该数字是此台电脑本次扫描的覆盖结果，不代表 Windows 全部安装项都能识别。
- 对 196 项分四页检查外观，发现并修正 4 个透明底白色图形；Application Verifier 的两个入口已补上真实 UI 资源图标。
- 页面重新检查、本机图片替换、公共库选择、跨页面同步、刷新保留、恢复自动及待完善筛选均已操作验证；试用替换已恢复。
- 公共库三页共 50 个图标均成功加载。桌面布局和约 390 像素小屏布局检查通过；小屏使用单列卡片，未出现横向溢出。
- 自动测试包含 PNG 拒绝用例、缓存损坏、路径约束、重扫保留覆盖、独立服务重启、并发索引写入、来源歧义、同源会话与超限请求。
- 本机图片、应用路径、原始清单及验收截图不提交公开仓库；不通过本次图标检查宣称网络分流或代理恢复完成新一轮验收。

提取 API 依据：[Microsoft SHDefExtractIcon](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shdefextracticonw)。素材许可详见仓库 THIRD_PARTY_NOTICES.md。
