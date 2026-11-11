# macOS 实验性预览版

AppRoute 使用已有的 Clash Party，不提供代理节点，也不自动开启系统代理或 TUN。Mac 版与 Windows 版共享规则事务、失败恢复、四语界面及应用列表。

## 安装包与验证范围

- Apple Silicon 对应 `mac-arm64.dmg` / `mac-arm64.zip`，Intel 对应 `mac-x64.dmg` / `mac-x64.zip`。
- CI 分别使用原生 Apple Silicon、Intel runner 构建并启动桌面应用，不使用 Windows 交叉打包冒充 Mac 验证。
- 包内包含同架构 Node 运行环境。构建做 ad-hoc 签名完整性核对，但没有 Apple Developer ID 签名和公证；macOS 下载安全检查可能阻止直接打开。
- 自动检查覆盖应用包解析、真实进程识别、Unix socket 控制接口、独立 Mihomo 故障恢复、四语交互及最终打包应用启动。
- **没有 Mac 用户实机验收证据**：真实 Clash Party 的应用连接识别、订阅刷新、休眠、恢复及权限差异仍需实测。CI 通过不能替代这些检查。

## 当前适配方式

扫描 `/Applications`、`~/Applications`、`/System/Applications` 和正在运行的应用包。读取 `Info.plist` 定位主程序，使用系统图标工具提取本机图片；这些图片不上传或提交到公共图标库。

分流使用应用包内的精确程序路径。运行中的包内辅助进程会核对真实路径；不把其他目录、共享系统宿主或修复通道纳入应用。路径保留大小写，不把 Windows 的大小写规则套到 Mac。

Clash Party 使用标准模式、稳定 Mihomo 内核，安装在 `/Applications/Clash Party.app` 或 `~/Applications/Clash Party.app`，配置保存在 `~/Library/Application Support/mihomo-party`。只连接当前用户拥有且活动的唯一控制 socket。多实例、其他安装位置、管理员实例或其他客户端不自动猜测接入。

AppRoute 数据在 `~/Library/Application Support/AppRoute`。独立恢复工具在其中的 `recovery` 目录，首次应用规则前创建桌面 `AppRoute - Restore Network.command`。桌面同名入口属于其他文件或无法写入时，停止应用，不覆盖已有文件。

恢复只撤销 AppRoute 管理的规则与策略，不删除订阅、不重置系统网络，也不保证修复其他 VPN 或已退出代理客户端留下的系统代理设置。

## 本机开发与后续实测

使用 Node.js 24 LTS，执行 `npm ci`、`npm run check`、`npm run check:i18n`、`npm run installer:build`。Mac 构建须在对应架构的 Mac 上执行；CI 配置见 [preview.yml](../.github/workflows/preview.yml)。

真实验收应依次核对：扫描与辅助进程 → 直连/跟随组的新连接 → 切组与订阅刷新 → 重启与睡眠 → 内核关闭/恢复 → 保留原有规则及选择。未通过前保持实验性预览标识。
