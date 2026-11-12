# 任务、模块与同类入口

本页提供定位索引；职责、状态和契约仍保存在原文档，不复制成第二份定义。开始修改先读该行文档，并沿调用者追到落盘、执行和界面反馈。

| 任务 | 契约与实现入口 | 必查同类入口 / 不变边界 | 现有检查 |
| --- | --- | --- | --- |
| 应用选择与队列 | [架构](../ARCHITECTURE.md)、[routingQueue](../../src/core/routingQueue.ts)、[routingService](../../src/main/services/routingService.ts) | 单个、批量、辅助进程、导入；排队不能显示已生效 | `npm test`；`tests/routingTransaction.test.ts` |
| 分流与恢复 | [系统边界](../SYSTEM-BOUNDARIES.md)、[managedRouting](../../src/core/managedRouting.ts)、[recovery](../../src/main/recovery) | 正常确认、失败回退、离线恢复、配置重新生成；只改 AppRoute 所有的规则 | `npm run check:recovery-faults`；`node scripts/verify-runtime-selections.mjs` |
| 设置与备份 | [设置迁移](../SETTINGS-TRANSFER.md)、[settingsTransfer](../../src/main/services/settingsTransfer.ts)、[settingsBackups](../../src/main/services/settingsBackups.ts) | 新旧格式、资料导入、恢复、删除、界面缓存；预览不写设置，未选条目保持 | `npm test`；`npm run check:settings-ui` |
| 应用发现与身份 | [架构](../ARCHITECTURE.md)、[platform](../../src/main/platform/applications.ts)、[processFamily](../../src/core/processFamily.ts) | Windows / Mac、运行中/安装后、共享宿主、便携应用；名称不代替精确身份 | `npm test`；对应平台只读实测单独记录 |
| 桌面与多语言 | [桌面](../DESKTOP.md)、[语言](../LOCALIZATION.md)、[main](../../src/main/desktop/main.ts)、[preload](../../src/preload/index.ts) | 页面、托盘、菜单、弹窗、Esc/焦点、四语、窄屏；不暴露任意文件与 shell | `npm run check:i18n` |
| 首屏与图标 | [首屏](../STARTUP.md)、[图标服务](../../src/main/services/applicationIconService.ts) | 缓存/冷启动、慢扫描、可选页面失败、图标缺失；入口资源预算保持 | `npm run check:startup`；`npm run build` |
| 文档、构建、发布 | [文档规范](../DOCUMENTATION.md)、[CI](../CI.md)、[门禁](../../.github/PREFLIGHT.md) | 文档/程序/发布范围、脚本重命名、产物清单、源 SHA；下载只指向真实发布 | `npm run docs:check`；发布前工作流 |

审查时记录：触发条件 → 入口 → 状态与副作用 → 结果，以及搜索过哪些同类入口。接口、失败处理或兼容性改变时，同一提交更新所属契约文档；现有文档描述安全缺口时把它作为待修复问题，不当作已解决。
