# 构建、验收与费用

日常提交只执行相关检查；完整安装打包在发布前手动执行。检查通过、生成安装包和公开 Release 是三件独立的事。

## 什么改动触发什么检查

| 改动 | 自动执行 | 不自动执行 |
| --- | --- | --- |
| README、教程、文档图片、文档生成器 | 文档一致性、链接与四语检查、站点构建；main 部署文档站 | Windows / Mac 程序检查、安装器打包 |
| 应用界面、样式或运行时品牌素材 | Windows / Mac 单元测试、类型检查、应用构建、四语桌面交互 | 安装、升级、卸载与 DMG / EXE / ZIP 打包 |
| 内核适配、分流、扫描、恢复 | Windows / Mac 单元测试与构建、独立内核选择和五项恢复故障检查 | 安装打包 |
| 共同类型、桌面入口、依赖、构建脚本或未知程序路径 | 两端程序、桌面交互及隔离内核检查；相关时检查文档 | 安装打包 |
| 发布前手动完整验收 | 文档检查，以及 Windows x64、Mac Apple Silicon、Mac Intel 的全部检查、打包与产物启动检查；Windows 额外安装 / 升级 / 卸载 | 自动公开 Release |

范围判断唯一入口为 [ci-scope.ts](../scripts/lib/ci-scope.ts)，由 [ci.yml](../.github/workflows/ci.yml) 调用。使用整批提交的 Git 差异；PR 使用共同祖先。删除文件、重命名前后路径和超过 300 个文件的提交都参与判断。未知路径默认执行程序检查，不靠忽略错误来减少失败通知。顶层 Markdown 与文档目录可以跳过程序检查，`public/brand/` 属于应用运行时资源，不能当作纯文档。

日常检查的 Mac 使用 Apple Silicon；Intel 安装与运行兼容检查保留在完整验收。仅修改测试文件时仍执行两端全部单元测试与应用构建。手动运行“按改动检查”会强制执行所有日常检查，但不打包。

## 发布前操作

1. 核对版本、更新说明和未提交改动。推送待验收源码到 main。
2. 在 Actions 手动运行 [发布前完整验收](../.github/workflows/preview.yml)，或执行 `gh workflow run preview.yml --ref main`。
3. 等待文档与三个平台全部成功，核对运行对应的源码 SHA、测试报告、安装文件及 SHA-256。
4. 只有确实准备发布新版本，才单独运行 [发布预览版](../.github/workflows/publish-preview.yml)，填写完整验收的 run_id。默认只创建草稿；公开仍是显式选项。

发布脚本不接受日常检查或旧的 push 自动打包作为完整验收，必须核对三端产物启动、代理组选择、五项恢复故障及 Windows 安装卸载证据。禁止覆盖同名版本；更新文档不替换既有二进制。

构建完成不等于所有实机网络场景通过；当前缺口仍见 [验收记录](VERIFICATION.md) 和 [Mac 边界](MACOS.md)。

## 产物保留

- 完整验收的安装器、哈希与报告保留 14 天；过期后重新验收，不能用缺少报告的产物发布。
- 失败诊断保留 7 天；包括隔离恢复场景结果与 DMG 重试次数。
- 文档站临时部署产物保留 1 天；与已经发布的 Pages 页面不同。
- 日常成功检查不上传安装包。正式 Release 附件不由上述 Actions 临时保留期限管理。

## 2026-11-12 偶发失败排查

| 原始记录 | 观察到的问题 | 本次处理与边界 |
| --- | --- | --- |
| [43143147834 首次运行](https://github.com/Yueyuyu/app-route/actions/runs/43143147834/attempts/1) / Windows | 卸载检查仍发现 AppRoute.exe；原脚本等待的是会派生临时子进程的 NSIS 入口 | 使用临时副本和 NSIS `_?=` 参数等待真正卸载进程，检查退出码、剩余安装文件与用户数据哈希；不会手工删除安装文件以通过检查 |
| 同次运行 / Mac Intel | `hdiutil` 无法卸载 DMG，返回 `Resource busy` | ZIP 与 DMG 顺序生成；仅 CI 的已知 detach 占用错误等待 5 秒后重建一次 DMG，再失败则终止；不强制卸载任意磁盘，不重试签名、空间或程序测试错误 |
| [43145190749](https://github.com/Yueyuyu/app-route/actions/runs/43145190749) / Mac Intel | 重启后状态检查尚未匹配规则，随后读取的规则已正确；原脚本只等待版本接口 | 改为限时等待完整规则签名匹配，仍拒绝缺失、禁用、错出口或错序规则；保留原来的持久化与状态文件不变断言，不重放规则来掩盖失败 |

历史失败后的重跑曾通过，说明需要补强时序与诊断，不能据此宣布偶发问题已永久消失。新的远端运行证据与本地模拟结果分别记录，不把隔离内核验收当作 Mac 实机分流验收。

## 是否收费

截至 2026-11-12，公开仓库使用 GitHub 托管的标准 runner，计算用量免费；AppRoute 使用的 `ubuntu-latest`、`windows-latest`、`macos-15` 和 `macos-15-intel` 都是标准 runner。

私有仓库超出套餐包含的计算用量、大规格 runner，以及适用的超额存储可能收费；失败和重跑也会消耗付费用量。缓存只有明确调高超过免费额度的容量限制时才涉及额外缓存费用。本项目没有启用大规格 runner，也没有调整账号付费设置。实际账号费用以 Billing and licensing 中的 Usage 为准，不能从“构建失败”邮件判断是否扣费。

规则与价格以 [GitHub Actions 官方计费文档](https://docs.github.com/en/billing/concepts/product-billing/github-actions) 为准；卸载等待机制参考 [NSIS 命令行说明](https://nsis.sourceforge.io/Docs/Chapter3.html#3.2.2)。
