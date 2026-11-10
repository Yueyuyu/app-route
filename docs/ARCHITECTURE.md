# 架构与目录职责

## 运行形态

单仓库 TypeScript + React + Ant Design。当前为仅监听本机的 Vite 页面与 Node 服务；目标桌面版使用 Electron 与受限 preload IPC。没有云后端，不把现有开发服务器作为正式桌面后端发布。

| 目录 | 职责 |
| --- | --- |
| src/renderer | 应用列表、编辑和扫描、草稿、连接状态、试运行确认、自检与恢复 |
| src/shared | 跨界面/本机边界的数据结构 |
| resources/application-icons/catalog.json | 公共图标的单一目录：进程、别名、来源、许可及图标集键名 |
| public/icons/apps、public/icons/fallbacks、public/icons/licenses | 生成的公共应用图标、项目默认图标、素材许可全文 |
| src/core/applicationIcons.ts | 精确公共匹配、本机显示关联和默认图标选择，不修改分流身份 |
| src/main/services/applicationIconService.ts | PNG 校验、图标索引、缓存、用户替换与恢复自动选择 |
| src/renderer/components/IconManagement.tsx | 设置下的图标管理页面、搜索筛选、替换和公共库浏览 |
| src/core/managedRouting.ts | 进程校验、受保护通道、规则所有权、纯代理出口检查、覆写生成 |
| src/main/platform/windows | 开始菜单、注册表和可见进程的固定只读扫描 |
| src/main/adapters/mihomoRuntime.ts | 发现唯一 Clash Party 命名管道，调用内核 API |
| src/main/adapters/clashPartyConfiguration.ts | 配置拥有者识别、快照、独立覆写登记、原生内核校验 |
| src/main/adapters/runtimeRules.ts | 排除命中统计后的规则配置指纹；检测磁盘/运行时漂移 |
| src/main/services/routingService.ts | 应用、确认、回退、全部恢复、自检与实际连接证据 |
| src/main/storage | 原子写入、并发指纹、跨进程写锁 |
| src/main/recovery | 自带运行时的离线工具、独立倒计时守护进程 |
| tooling/vite | 本机 HTTP 桥接，Host/Origin/会话验证，请求大小限制 |
| scripts/build-recovery.mjs | 将恢复入口及 YAML 依赖打包为独立 CJS |
| src/preload | 后续桌面 IPC 边界说明，目前未实现 |
| tests | 输入、接口边界、所有权、事务失败恢复与配置漂移测试 |

## 应用事务

草稿 → 预览 → 读取磁盘及内核 → 对比规则/模式/端口 → 编译候选 → 已安装内核 -t 校验 → 安装并验证离线工具 → 私有备份 → 再查并发变更 → 持久化 prepared 事务 → 启动独立守护并等待 ready → 原子写入专属覆写 → 登记 → API 热重载 → 核对规则 → pending → 用户确认或到期回退。

事务默认 120 秒。页面、服务、独立恢复共享写锁；陈旧守护只能处理自己仍处于 pending/prepared 的事务。失败先恢复专属脚本，再用**当前订阅**与上一轮应用策略生成配置，不直接覆盖旧完整快照。

API 热重载不会将整个 YAML 写回用户文件。AppRoute 不修改订阅、mihomo.yaml、config.yaml 或其他覆写脚本，只增加 override/approute-managed-v1.js 和 override.yaml 中的独立登记项。运行配置携带 x-approute-managed-v1 标记，只有匹配自己的完整规则前缀才移除；冲突时停止覆盖。

## 持久化与边界

Clash Party 的全局本地 JS 覆写重新生成应用规则。目标出口在订阅更新后消失时跳过该应用，让客户端原规则接管，避免无效出口导致整份配置无法启动。订阅若改变代理组成员，运行状态会警告，并需重新验证新连接。

Clash Party 2.0.4 缓存覆写登记；首次登记后需要重新打开客户端。代码不会为刷新缓存而强制结束用户程序。界面只有观察到客户端生成的所有权标记后才显示持久化已被观察到。真实客户端重启、真实订阅切换验收仍未完成；隔离配置的重新生成、目标消失和新订阅恢复已有自动测试。

当前通过 PROCESS-NAME 匹配，不支持按路径区分同名进程。运行时 API 相似并不代表其他客户端的配置生命周期兼容。EngineRuntimeAdapter / ConfigurationOwnerAdapter / TrafficInterceptorAdapter 保留为未来跨引擎契约，当前具体实现不宣称已完成所有通用接口。

## 状态与本机存储

- 浏览器草稿：localStorage，与实际应用状态分开。
- %LOCALAPPDATA%\AppRoute\state.json：已管理应用、修订号、待确认事务。
- transactions：事务、原始运行配置和登记快照、守护就绪记录，含敏感数据，仅本机使用。
- recovery：复制当前 Node.exe、自包含 recovery.cjs、Restore-Network.cmd。
- icons/index.json、icons/cache、icons/custom：独立图标索引、自动提取和用户替换。采用内容哈希文件名、原子写入及目录内独立锁；不与网络事务共用锁。

`applicationIcons` Vite 插件让扫描入口和图标接口共享一个服务实例；现有扫描接口返回缓存 URL，旧草稿的 PNG data URL 在登记后迁移为 URL。图标图片响应仅允许本机同源访问；写入需要同源 Origin 和图标会话令牌。未来 Electron 迁移时复用服务，通过受限 IPC 与图片协议替换 HTTP 边界。

生效证据只统计应用后建立的、能识别对应进程的新连接，核对 chains；未观察到连接不代表已验证。自检 HTTPS 探测只代表目标站点的瞬时结果。

正式版还需 Electron 权限边界、事务持久化崩溃点覆盖、安装包/休眠/重启测试、备份限额与脱敏诊断导出。参见 [功能规划](ROADMAP.md) 和 [Mihomo API](https://wiki.metacubex.one/api/)。
