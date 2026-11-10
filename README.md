# AppRoute 应用分流

<img src="public/brand/app-route-128.png" width="80" height="80" alt="AppRoute 图标" />

为每个应用选择联网方式：按 Clash Party 原有规则、直接联网或使用指定代理出口。

**当前版本：0.2.0-preview.1，Windows 集成测试版。** Ant Design 页面已接入 Clash Party / Mihomo，支持真实规则应用、连接生效检查、120 秒试运行回退和独立离线恢复。当前仍以 Vite 本机服务运行，没有 Electron 安装包，不属于稳定发行版。

## 使用

需要 Node.js 24 LTS、Windows，以及正在运行的 Clash Party 标准模式与 Mihomo 稳定内核。已实测 Clash Party 2.0.4 / Mihomo v1.19.32；其他版本尚未验证。

~~~sh
git clone https://github.com/Yueyuyu/app-route.git
cd app-route
npm ci
npm run dev
~~~

打开 http://127.0.0.1:4318/。

1. 扫描或手动添加真实应用。初始八行是示例，不能直接应用。
2. 修改联网方式，勾选应用；选择“走代理”时在顶部选择代理出口。
3. 点击“应用所选”，审阅变更并开始 120 秒试运行。
4. 让目标应用建立新连接，在“生效检查与离线恢复”中查看结果；确认网络正常后点击“保留设置”。未确认会自动撤销。
5. 选择“按 Clash 规则”后再次应用，只移除该应用的专属规则。页面“恢复网络”会停用全部 AppRoute 专属规则。

在 **设置 → 图标管理** 中检查并补齐本机图标，按来源或待完善状态筛选，上传替换图片、选择公共图标或恢复自动选择。内置 50 个公共应用图标；本机提取、用户替换和索引保存在 `%LOCALAPPDATA%\AppRoute\icons`，不会上传。图标替换立即同步到列表，不改变联网方式。详见 [图标库与缓存](docs/design/application-icons.md)。

首次登记的覆写列表可能被 Clash Party 缓存：需要正常退出并重新打开一次 Clash Party，再检查规则是否仍已加载。界面分别显示运行加载、连接观测、客户端持久化观测，不能互相代替。客户端完整重启和真实订阅切换仍是稳定版发布前的人工验收项。

当前不主动启用 TUN、切换系统代理或关闭已有连接。未进入 Clash 的流量无法按进程分流；已有连接可能需要重新连接。直连是 DIRECT 出口，仍可经过本机内核。代理选项排除包含 DIRECT / REJECT 成员的出口组。

## 断网也能恢复

首次应用前自动准备独立恢复工具，并创建桌面快捷方式 **AppRoute - Restore Network**；准备失败就不应用规则。

- 试运行未确认：独立守护进程到期恢复，关闭页面和 AppRoute 服务不会取消倒计时。
- 页面仍可用：点击“恢复网络”。
- 页面打不开：双击桌面快捷方式，或运行 %LOCALAPPDATA%\AppRoute\recovery\Restore-Network.cmd。

工具自带本机 Node 运行时与打包代码，不需要网络、ChatGPT、npm 或项目目录。恢复先停用本工具覆写，再重新加载当前 Clash Party 配置，随后自检；保留用户订阅、原有规则、代理组、系统代理和 TUN 设置。无法连接内核时会明确报告尚未确认恢复，并提示重新启动 Clash Party。它不能修复运营商、网卡或代理服务商故障。

详见 [离线恢复说明](docs/RECOVERY.md) 和 [验证记录](docs/VERIFICATION.md)。

## 开发与架构

~~~sh
npm run check    # 自动测试、类型检查、恢复程序打包、页面构建
npm run preview  # 构建后的本机预览，端口仍为 4318
~~~

开发和预览服务只能启动一个；仅监听本机。纯静态部署没有扫描和分流能力。写入接口校验 Host、Origin 和会话令牌。

| 接入路线 | 状态 |
| --- | --- |
| Mihomo + Clash Party | Windows 实际接入与恢复，集成测试阶段 |
| 其他 Mihomo 客户端 / 独立内核 | 规划；运行控制可复用，配置适配需单独实现 |
| sing-box | 候选路线，未实现 |
| HTTP / SOCKS5 端口 + 流量接管 | 预研；端口本身不能自动接管应用 |

[项目定位](docs/PROJECT.md) · [架构和目录](docs/ARCHITECTURE.md) · [兼容边界](docs/COMPATIBILITY.md) · [功能规划](docs/ROADMAP.md) · [开发规则](AGENTS.md) · [贡献指南](CONTRIBUTING.md)

## 数据与许可

草稿保存在浏览器 localStorage（approute.draft.v1）；导出的草稿始终标记 applied: false，不代表运行状态。扫描和草稿可能包含个人程序路径，不要直接公开。

应用状态、事务备份和离线工具保存在 %LOCALAPPDATA%\AppRoute，Clash Party 只增加独立的 AppRoute 覆写及登记项。事务快照可能含订阅凭据，禁止提交或上传；当前尚未实现备份保留限额。代码没有遥测或云上传功能。

自有代码采用 [MIT License](LICENSE)，第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。仓库不分发代理内核、Node 二进制或驱动；离线运行时在本机从当前 Node 复制。
