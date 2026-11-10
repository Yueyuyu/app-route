# 架构与目录职责

## 运行形态

单仓库 TypeScript + React + Ant Design。当前为仅监听本机的 Vite 页面与 Node 服务；目标桌面版使用 Electron 与受限 preload IPC。没有云后端，不把现有开发服务器作为正式桌面后端发布。

| 目录 | 职责 |
| --- | --- |
| src/renderer | 真实应用列表、资料编辑和扫描、点击即应用、连接状态、自检与恢复 |
| src/shared | 跨界面/本机边界的数据结构 |
| resources/application-icons/catalog.json | 公共图标的单一目录：进程、别名、来源、许可及图标集键名 |
| public/icons/apps、public/icons/fallbacks、public/icons/licenses | 生成的公共应用图标、项目默认图标、素材许可全文 |
| src/core/applicationIcons.ts | 精确公共匹配、本机显示关联和默认图标选择，不修改分流身份 |
| src/main/services/applicationIconService.ts | PNG 校验、图标索引、缓存、用户替换与恢复自动选择 |
| src/renderer/components/IconManagement.tsx | 设置下的图标管理页面、搜索筛选、替换和公共库浏览 |
| src/core/managedRouting.ts | 进程校验、受保护通道、规则所有权、纯代理出口检查、覆写生成 |
| src/core/processFamily.ts | 主程序路径与父子进程归属校验，排除目录外共享程序 |
| src/core/applicationInventory.ts | 旧资料迁移、实际联网状态映射、规则与连接证据呈现 |
| src/main/platform/windows/processFamily.ts | 固定只读进程查询、独立安装目录组件预识别，重建可信进程路径 |
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

点击模式 → 后端识别真实进程 → 网络基线检查 → 读取磁盘及内核 → 对比规则/模式/端口 → 编译候选 → 已安装内核 -t 校验 → 安装并验证离线工具 → 私有备份 → 再查并发变更 → 持久化 prepared 事务 → 启动独立守护并等待 ready → 原子写入专属覆写 → 登记 → API 热重载 → 核对全部规则 → pending → 再次检查网络及原有手动出口选择 → 自动确认；失败回退或由守护到期恢复。

`apply-automatic` 组合已有 apply/confirm/rollback 事务。前端传入的辅助路径不受信任，必须由系统查询重建；旧手动试运行接口保留给兼容和恢复测试。自动测速/故障转移组的即时节点允许正常变化，手动 Selector 和 fixed 选择必须保持。页面每 5 秒查询状态；发现新辅助进程时同样通过自动事务补充，失败保留提示并支持手动重试。

事务默认 120 秒。页面、服务、独立恢复共享写锁；陈旧守护只能处理自己仍处于 pending/prepared 的事务。失败先恢复专属脚本，再用**当前订阅**与上一轮应用策略生成配置，不直接覆盖旧完整快照。

API 热重载不会将整个 YAML 写回用户文件。AppRoute 不修改订阅、mihomo.yaml、config.yaml 或其他覆写脚本，只增加 override/approute-managed-v1.js 和 override.yaml 中的独立登记项。运行配置携带 x-approute-managed-v1 标记，只有匹配自己的完整规则前缀才移除；冲突时停止覆盖。

## 持久化与边界

Clash Party 的全局本地 JS 覆写重新生成应用规则。目标出口在订阅更新后消失时跳过该应用，让客户端原规则接管，避免无效出口导致整份配置无法启动。订阅若改变代理组成员，运行状态会警告，并需重新验证新连接。

Clash Party 2.0.4 缓存覆写登记；首次登记后需要重新打开客户端。代码不会为刷新缓存而强制结束用户程序。界面只有观察到客户端生成的所有权标记后才显示持久化已被观察到。真实客户端重启、真实订阅切换验收仍未完成；隔离配置的重新生成、目标消失和新订阅恢复已有自动测试。

新应用通过 PROCESS-PATH 精确匹配；保留对旧 PROCESS-NAME 状态的恢复兼容。组件预识别仅限名称与主程序相符的独立安装目录，限制递归深度、数量并跳过链接、安装/修复程序和修复通道。目录外子进程提示未覆盖；不把共享浏览器纳入当前应用。运行时 API 相似并不代表其他客户端的配置生命周期兼容。EngineRuntimeAdapter / ConfigurationOwnerAdapter / TrafficInterceptorAdapter 保留为未来跨引擎契约，当前具体实现不宣称已完成所有通用接口。

## 状态与本机存储

- 浏览器应用资料：approute.inventory.v1，与实际应用状态分开；旧草稿只迁移真实资料。
- %LOCALAPPDATA%\AppRoute\state.json：已管理应用、修订号、待确认事务。
- transactions：事务、原始运行配置和登记快照、守护就绪记录，含敏感数据，仅本机使用。
- recovery：复制当前 Node.exe、自包含 recovery.cjs、Restore-Network.cmd。
- icons/index.json、icons/cache、icons/custom：独立图标索引、自动提取和用户替换。采用内容哈希文件名、原子写入及目录内独立锁；不与网络事务共用锁。

`applicationIcons` Vite 插件让扫描入口和图标接口共享一个服务实例；现有扫描接口返回缓存 URL，旧草稿的 PNG data URL 在登记后迁移为 URL。图标图片响应仅允许本机同源访问；写入需要同源 Origin 和图标会话令牌。未来 Electron 迁移时复用服务，通过受限 IPC 与图片协议替换 HTTP 边界。

生效证据按每个应用最近应用时间过滤新连接，并同时核对进程路径、命中规则及出口 chains；修改一个应用不会抹掉另一个应用的时间基准。界面列出已观测的进程，未观察到的组件不宣称已验证。自检 HTTPS 探测只代表目标站点的瞬时结果，成功后不构成无限期网络保障。

正式版还需 Electron 权限边界、事务持久化崩溃点覆盖、安装包/休眠/重启测试、备份限额与脱敏诊断导出。参见 [功能规划](ROADMAP.md) 和 [Mihomo API](https://wiki.metacubex.one/api/)。
