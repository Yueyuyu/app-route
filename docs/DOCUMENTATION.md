# 文档与下载维护

用户入口为四语 README → 下载 → 任务教程 → 问题反馈。底层设计和验收记录保留中文，不承诺全量技术文档翻译。

## 单一来源

| 位置 | 职责 |
| --- | --- |
| `docs/guide/{zh-CN,en,ja,fr}/` | 四语用户教程；各语言同名文件表示同一任务 |
| `docs/releases/current.json` | 当前公开预览版、源码提交、五个安装资产的名称/大小/SHA-256 |
| `scripts/lib/release-docs.mjs` | 发布清单约束与四语下载表 |
| `scripts/generate-docs.mjs` | 更新 README、安装教程、当前 Release 标记区域及汇总校验文件 |
| `scripts/check-docs.mjs` | 本地链接/锚点、语言覆盖及过时入门内容检查 |
| `docs/site/.vitepress/` | 导航、四语搜索与品牌样式 |
| `scripts/prepare-docs-site.mjs` | 从教程及白名单素材生成忽略的站点输入；不维护另一套正文 |
| `.github/workflows/docs.yml` | PR 构建检查；main 验证后部署 GitHub Pages |

## 维护步骤

1. 同步修改任务涉及的四语正文，说明操作、预期状态和失败去向。
2. 新版实际公开后运行 `npm run docs:sync-release -- v版本号`。只读取已发布预览版，核对资产摘要及同名 SHA-256，不修改 Release。
3. 运行 `npm run docs:generate`、`npm run docs:check`、`npm run docs:build`。
4. 预览检查搜索、四语切换、下载、图片及窄窗口；提交前仍运行 `npm run check`。
5. 推送 main 后检查工作流和公开地址。构建成功不等于已经部署。

下载表位于 downloads 标记内，不手改生成结果。current.json 指实际公开版本，不直接沿用尚未发布的 package.json 版本。预览版使用精确 tag 链接，不依赖 releases/latest。

## Release 与附件

发布脚本核对三平台报告、哈希和源码提交，拒绝覆盖同名版本。五个安装资产各有 SHA-256 文件，另附 `SHA256SUMS.txt` 和 `release-manifest.json`。GitHub 自动提供的 Source code 不是安装器。

说明按用户可感知变化、推荐下载、升级、已知限制、技术证据排序。升级保留什么、如何撤销规则，以及签名/公证/自动更新的真实状态必须明确。当前更新只调整现有说明和补充汇总文本，不替换已发布二进制。

## 截图与站点

使用已确认组合标志，截图来源见 [images/README.md](images/README.md)。只复制白名单中的四语七类图片，不发布 .runtime、诊断、扫描结果或用户数据。

站点只启用已验证的浅色主题。搜索在浏览器本地执行，不接入第三方搜索服务；按语言分索引，支持中日文分词和前缀检索。

## 构建依赖

VitePress 1.6.4 默认的 Vite 5 含已公告的开发服务器问题，仅对文档工具 override 为 Vite 6.4.6，AppRoute 的 Vite 8 不变。升级后验证静态构建、搜索和导航；不要盲目强制降级应用构建依赖。发布产物是静态文件，预览只绑定回环地址。

## 能力边界

签名、公证、自动更新、Windows 便携版与 Mac 实机分流不是本次文档交付成果。正常睡眠及订阅切换证据不代替未确认事务跨睡眠、断电、完整权限矩阵或成功远程刷新验收。
