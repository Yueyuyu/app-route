# 架构与目录职责

## 运行形态

单仓库 TypeScript + React + Ant Design。桌面版由 Electron 窗口、受限 preload IPC 与独立 Node 后台组成；加载打包的本地资源，不开启 HTTP 端口。Vite 本机服务仅供开发预览。没有云后端。

| 目录 | 职责 |
| --- | --- |
| src/renderer | 真实应用列表、资料编辑和扫描、点击即应用、连接状态、自检与恢复 |
| src/shared | 跨界面/本机边界的数据结构 |
| resources/application-icons/catalog.json | 公共图标的单一目录：进程、别名、来源、许可及图标集键名 |
| public/icons/apps、public/icons/fallbacks、public/icons/licenses | 生成的公共应用图标、项目默认图标、素材许可全文 |
| src/core/applicationIcons.ts | 精确公共匹配、本机显示关联和默认图标选择，不修改分流身份 |
| src/main/services/applicationIconService.ts | PNG 校验、图标索引、缓存、用户替换与恢复自动选择 |
| src/renderer/components/IconManagement.tsx | 平级图标管理页面、搜索筛选、替换和公共库浏览 |
| src/core/proxyGroups.ts | 解析嵌套组当前选择、失效引用与最近探测；显示口径不依赖 UI |
| src/core/proxyStrategy.ts | 策略输入校验、专用组所有权和编译；同一纯函数生成本机配置与持久化覆写 |
| src/renderer/components/ProxyStrategyDrawer.tsx | 策略草稿、节点勾选、拖动/按钮排序、高级设置与应用结果 |
| src/core/managedRouting.ts | 进程校验、受保护通道、规则所有权、纯代理出口检查、覆写生成 |
| src/core/processFamily.ts | 主程序路径与父子进程归属校验，排除目录外共享程序 |
| src/core/applicationInventory.ts | 旧资料迁移、实际联网状态映射、规则与连接证据呈现 |
| src/core/routingQueue.ts | 立即显示待应用选择、合并短时间内的修改、按应用保留最终意图、串行事务与异常停队 |
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
| src/main/desktop | 独立窗口、单实例、托盘、固定资源协议、来源校验与 Node 后台生命周期 |
| src/preload | 仅暴露白名单业务请求及刷新事件，不暴露原始 Electron/文件/shell 能力 |
| src/core/applicationViews.ts | 我的应用、精确路径运行匹配、收藏身份、系统工具折叠与扫描合并 |
| src/main/services/inventoryPreferences.ts | 独立本机资料存储，禁止缓存模式重放 |
| tests | 输入、接口边界、所有权、事务失败恢复与配置漂移测试 |

## 应用事务

点击模式 → 后端识别真实进程 → 网络基线检查 → 读取磁盘及内核 → 对比规则/模式/端口 → 编译候选 → 已安装内核 -t 校验 → 安装并验证离线工具 → 私有备份 → 再查并发变更 → 持久化 prepared 事务 → 启动独立守护并等待 ready → 原子写入专属覆写 → 登记 → API 热重载 → 核对全部规则 → pending → 再次检查网络及原有手动出口选择 → 自动确认；失败回退或由守护到期恢复。

`apply-automatic` 组合已有 apply/confirm/rollback 事务。前端传入的辅助路径不受信任，必须由系统查询重建；旧手动试运行接口保留给兼容和恢复测试。自动测速/故障转移组的即时节点允许正常变化，手动 Selector 和 fixed 选择必须保持。页面每 5 秒查询状态；发现新辅助进程时同样通过自动事务补充，失败保留提示并支持手动重试。

界面队列约 180 毫秒合并一次兼容修改，同一应用尚未发送的选择以后一次为准；不同代理出口分别提交。已经开始的事务必须完成确认或恢复后才处理下一批，失败且恢复未确认时清空等待队列并明确报错。等待状态独立于实际模式、导出记录和连接证据；不将排队直接标为成功，也不把等待队列持久化后自动重放。

进程识别与网络基线检查并行；内核配置校验与离线恢复准备并行，二者都结束后才能写配置。每次仍执行内核校验、当前文件读取、并发指纹检查和前后联网探测。相同配置文本只复用解析结果并返回副本；内核位置缓存最多 60 秒且检查文件身份；恢复工具只在代码、运行时、入口与快捷方式都未改变时复用，任一丢失或变化则重新安装验证。新辅助进程的目录检测只用于明确的应用独立目录，系统共享目录不会触发隐式的反复应用。

事务默认 120 秒。页面、服务、独立恢复共享写锁；陈旧守护只能处理自己仍处于 pending/prepared 的事务。失败先恢复专属脚本，再用**当前订阅**与上一轮应用策略生成配置，不直接覆盖旧完整快照。

API 热重载不会将整个 YAML 写回用户文件。AppRoute 不修改订阅、mihomo.yaml、config.yaml 或其他覆写脚本，只增加 override/approute-managed-v1.js 和 override.yaml 中的独立登记项。运行配置携带 x-approute-managed-v1 标记，只有匹配自己的完整规则前缀才移除；冲突时停止覆盖。

## 持久化与边界

Clash Party 的全局本地 JS 覆写重新生成应用规则。目标出口在订阅更新后消失时跳过该应用，让客户端原规则接管，避免无效出口导致整份配置无法启动。组内成员的正常切换由内核执行，无需重写应用规则；失效引用、直连/拒绝选择或最近探测失败会明确显示。

Clash Party 2.0.4 缓存覆写登记；首次登记后需要重新打开客户端。代码不会为刷新缓存而强制结束用户程序。界面只有观察到客户端生成的所有权标记后才显示持久化已被观察到。真实客户端重启、真实订阅切换验收仍未完成；隔离配置的重新生成、目标消失和新订阅恢复已有自动测试。

新应用通过 PROCESS-PATH 精确匹配；保留对旧 PROCESS-NAME 状态的恢复兼容。组件预识别仅限名称与主程序相符的独立安装目录，限制递归深度、数量并跳过链接、安装/修复程序和修复通道。目录外子进程提示未覆盖；不把共享浏览器纳入当前应用。运行时 API 相似并不代表其他客户端的配置生命周期兼容。EngineRuntimeAdapter / ConfigurationOwnerAdapter / TrafficInterceptorAdapter 保留为未来跨引擎契约，当前具体实现不宣称已完成所有通用接口。

## 状态与本机存储

- 浏览器应用资料：approute.inventory.v1，与实际应用状态分开；旧草稿只迁移真实资料。
- %LOCALAPPDATA%\AppRoute\state.json：已管理应用、修订号、待确认事务。
- transactions：事务、原始运行配置和登记快照、守护就绪记录，含敏感数据，仅本机使用。
- recovery：复制当前 Node.exe、自包含 recovery.cjs、Restore-Network.cmd。
- icons/index.json、icons/cache、icons/custom：独立图标索引、自动提取和用户替换。采用内容哈希文件名、原子写入及目录内独立锁；不与网络事务共用锁。

`applicationIcons` Vite 插件让扫描入口和图标接口共享一个服务实例；现有扫描接口返回缓存 URL，旧草稿的 PNG data URL 在登记后迁移为 URL。图标图片响应仅允许本机同源访问；写入需要同源 Origin 和图标会话令牌。桌面版复用同一服务，通过受限 IPC 与 approute://app 图片协议替换 HTTP 边界。

生效证据按每个应用最近应用时间过滤新连接，并同时核对进程路径、命中规则及出口 chains；修改一个应用不会抹掉另一个应用的时间基准。界面列出已观测的进程，未观察到的组件不宣称已验证。自检 HTTPS 探测只代表目标站点的瞬时结果，成功后不构成无限期网络保障。

桌面版已落实 renderer 沙箱、contextIsolation、禁止远程导航、权限拒绝与 IPC 主框架来源校验。正式版仍需事务崩溃点覆盖、更多安装/休眠/重启测试、备份限额与脱敏诊断导出。参见 [功能规划](ROADMAP.md) 和 [Mihomo API](https://wiki.metacubex.one/api/)。

## 桌面列表与生命周期

桌面主进程通过随包 Node 的 fork IPC 调用后台，扫描、图标和分流服务都不在 UI 线程中运行。恢复工具复制后台的真正 Node.exe；不会把 Electron.exe 当作恢复运行时。关闭窗口隐藏到托盘；后台每 10 秒检查已经管理的应用是否出现新辅助进程。正常退出停止观察，已经开始的事务继续完成或由独立守护回退；退出不清除已确认规则。

资料与收藏使用 inventory.json；运行进程仅在内存中按可执行文件完整路径关联，辅助路径使用已识别的精确集合。不记录窗口标题或使用时长。启动/焦点返回触发扫描，60 秒节流，窗口可见时每 5 分钟补查；手动扫描绕过缓存，并发扫描共用同一任务。普通已安装条目以最新扫描为准，手动及运行中发现的便携条目保留；扫描不写入分流状态，收藏以路径为键，重新识别 ID 不丢失收藏。

统一跟随组通过 `integration.proxy-group` 执行 `setProxyGroup`：读取后台已有代理应用，统一迁移目标并保存 `RoutingState.proxyGroup`，复用完整自动事务，失败回退包含默认组。单纯切换组内节点不改变 AppRoute 状态或规则。状态中的 `outlets` 是配置当前选择，`evidence` 是带应用身份和命中规则的连接观测；旧连接与当前选择不一致时不能误报新节点已经验证。详见 [代理组跟随](PROXY-GROUPS.md)。
