# 下载与安装

选择与你电脑匹配的安装包。普通用户不需要 Node.js、Git 或自行编译。

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

## 支持范围

| 环境 | 当前验证范围 |
| --- | --- |
| Windows x64 | Windows 11、Clash Party 2.0.4 / Mihomo 1.19.32，规则模式、TUN 关闭的实机验收 |
| Mac Apple 芯片 / Intel | 两种架构的 macOS CI 构建与打包启动检查；真实 Clash Party 分流和恢复仍待 Mac 实机验证 |
| 其他客户端、Windows ARM、Linux | 尚未正式支持 |

正常睡眠唤醒、Clash Party 重启和两份订阅往返切换已有 Windows 实机记录；断电、未确认事务跨睡眠和完整权限矩阵仍未完成。远程订阅刷新成功后的再生成也尚未验证。

## Windows

1. 下载上表的 **安装版 EXE**，退出正在运行的 AppRoute。
2. 启动安装器，按提示完成当前用户安装。
3. 从桌面或开始菜单打开 AppRoute，再按[首次使用](quickstart.md)连接 Clash Party。

预期：出现独立桌面窗口和托盘图标。点击窗口关闭会收起到托盘；完全退出请用托盘菜单。

## Mac（实验性）

1. 在苹果菜单的“关于本机”确认芯片：Apple M 系列选 arm64，Intel 选 x64。
2. 打开对应 DMG，将 AppRoute 拖入“应用程序”，再从那里启动。
3. ZIP 是同架构的应用压缩包，解压后保留完整 AppRoute.app；不是另一种兼容模式。

Windows 包未提供发布者签名；Mac 仅有 ad-hoc 签名，没有 Developer ID 公证。系统可能阻止启动。先确认来源和提示内容；不要关闭杀毒软件或全局安全防护。发现明确的威胁检测时暂停安装并[反馈](https://github.com/Yueyuyu/app-route/issues/new/choose)。

## 核对下载

只从本仓库 Releases 下载。对照同名 .sha256 文件，Windows 可在 PowerShell 使用：

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\AppRoute-版本号-setup-x64.exe'
```

Mac 可使用：

```sh
shasum -a 256 AppRoute-版本号-mac-arm64.dmg
```

将示例文件名换成实际下载文件。校验值必须完全一致；SHA-256 只能验证文件完整性，不证明发布者身份或软件无风险。GitHub 自动提供的 **Source code** 是源码，不是安装包。

安装异常、窗口不出现或安全软件提示，见[常见问题](faq.md)。已有版本请先读[升级与恢复](maintenance.md)。
