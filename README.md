<p align="center"><img src="public/brand/app-route-lockup.png" width="400" alt="AppRoute" /></p>
<p align="center"><strong>为每个应用选择联网方式，无需手写代理规则。</strong></p>
<p align="center">简体中文 · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.fr.md">Français</a></p>
<p align="center"><a href="https://github.com/Yueyuyu/app-route/actions/workflows/ci.yml"><img src="https://github.com/Yueyuyu/app-route/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a> <img src="https://img.shields.io/badge/status-preview-orange" alt="Preview" /> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" /></a></p>

[下载](#下载) · [快速上手](docs/guide/zh-CN/quickstart.md) · [文档站](https://yueyuyu.github.io/app-route/) · [常见问题](docs/guide/zh-CN/faq.md) · [报告问题](https://github.com/Yueyuyu/app-route/issues/new/choose)

AppRoute 扫描本机应用，让你选择**按 Clash 规则、直接联网或跟随代理组**，并查看规则与新连接的验证状态。它配合已有的 **Clash Party / Mihomo** 使用，不提供代理节点或订阅。

> **Windows 预览版 · macOS 实验性版本。** 尚无发布者签名、Apple 公证或自动更新；Mac 真实分流与恢复仍待实机验证。[支持范围与已知限制](docs/guide/zh-CN/install.md#支持范围)

## 下载

<!-- downloads:zh-CN:start -->
**当前预览版: [0.2.0-preview.2](https://github.com/Yueyuyu/app-route/releases/tag/v0.2.0-preview.2)**

| 你的电脑 | 下载 | 大小 | 校验 |
| --- | --- | --- | --- |
| Windows · Intel / AMD 64 位 | [安装版 EXE](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe) | 140.8 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe.sha256) |
| Mac · Apple 芯片（实验性） | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg) | 155.0 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg.sha256) |
| Mac · Intel 芯片（实验性） | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg) | 161.6 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg.sha256) |

其他附件: [arm64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.zip) · [x64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.zip). Mac ZIP 为压缩分发包；Source code 为源码，不是安装器。

SHA-256 检查文件完整性，不代替发布者签名。
<!-- downloads:zh-CN:end -->

安装版自带运行环境，**不需要安装 Node.js、打开浏览器或执行构建命令**。[安装、架构选择与校验方法](docs/guide/zh-CN/install.md)

## 看看实际界面

![应用管理：选择应用的联网方式](docs/images/zh-CN-applications.png)

截图来自真实 Electron 界面和隔离演示数据；只展示交互，不作为真实网络生效证据。

<details><summary>代理策略、连接详情与其他页面</summary>

![代理策略](docs/images/zh-CN-strategy.png)
![连接详情](docs/images/zh-CN-connection.png)
![分流规则](docs/images/zh-CN-rules.png)
![图标管理](docs/images/zh-CN-icons.png)
![关于](docs/images/zh-CN-about.png)

</details>

## 可以做什么

- **按应用选择**：扫描真实软件，搜索全部应用，按已设置、正在运行和收藏筛选。
- **点击自动应用**：连续修改可排队合并；检查失败回退，并明确区分规则就绪与连接验证。
- **跟随常用代理组**：在 Clash Party 换节点后，新连接自动跟随，不必逐个重新设置应用。
- **选择自动策略**：沿用已有组，或创建故障备用、延迟优先策略，由 Mihomo 执行。
- **断网时可恢复**：提供应用内恢复及独立离线入口，保留原有订阅与规则。
- **作为桌面工具使用**：托盘、图标管理，以及中、英、日、法四种语言；首次跟随系统语言。

## 三种联网方式

| 选项 | 对已识别、已接管的新连接意味着什么 |
| --- | --- |
| 按 Clash 规则 | 由 Clash Party 原有规则决定直连还是代理。 |
| 直接联网 | 使用 DIRECT，不经过远端代理节点。 |
| 跟随代理组 | 使用绑定组的当前选择或自动策略；选到 DIRECT / REJECT 也会直连或拒绝。 |

已有连接不会被强制切换。未进入 Clash 的流量不保证受这些规则控制；AppRoute 不自行开启 TUN、改变系统代理或关闭其他 VPN。

## 第一次使用

1. 安装 AppRoute，保持已配置好的 Clash Party 运行在规则模式。
2. 打开 AppRoute，确认左下角显示“内核已连接”。
3. 搜索应用，点击“直接联网”；需要代理时先在“代理策略”绑定常用组，再选“跟随代理组”。
4. 让该应用建立新连接，查看行状态和应用详情。蓝色“规则已就绪”不等于已验证全部流量。

首次登记覆写后，正常退出并重新打开一次 Clash Party，核对规则保留。详细步骤见 [快速上手](docs/guide/zh-CN/quickstart.md)。

## 按场景学习

[QQ 音乐直接联网](docs/guide/zh-CN/direct.md) · [应用跟随代理组](docs/guide/zh-CN/follow-group.md) · [故障备用与延迟优先](docs/guide/zh-CN/strategies.md) · [更新、卸载与恢复](docs/guide/zh-CN/maintenance.md)

网络异常时，可在应用内点击“恢复网络”；应用打不开时，使用桌面的 **AppRoute - Restore Network**。它停用 AppRoute 自有分流，不重置系统网络，也不保证修复其他软件造成的故障。独立入口在首次应用规则前安装。[恢复步骤](docs/guide/zh-CN/maintenance.md#恢复网络)

## 开发与参与

普通用户使用上面的安装包。开发者从 `main` 构建，步骤见 [贡献与构建指南](CONTRIBUTING.md)。

[架构](docs/ARCHITECTURE.md) · [路线图](docs/ROADMAP.md) · [验收记录](docs/VERIFICATION.md) · [翻译维护](docs/LOCALIZATION.md) · [品牌规范](docs/design/brand-lockup.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

应用清单、图标与管理记录保存在本机。反馈问题时不要上传订阅、密钥、个人路径或未经检查的原始日志。自有代码采用 [MIT](LICENSE)。
