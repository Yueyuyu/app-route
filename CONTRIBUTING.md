# 参与 AppRoute

普通用户从[下载与安装](docs/guide/zh-CN/install.md)开始。开发前阅读[项目说明](docs/PROJECT.md)、[路线图](docs/ROADMAP.md)和[开发规则](AGENTS.md)。

## 本地开发

使用官方 Node.js 24 LTS；桌面构建需 Node 安装目录包含 LICENSE。默认分支是 main。

```sh
git clone https://github.com/Yueyuyu/app-route.git
cd app-route
npm ci
npm run dev
```

dev 是开发预览，不是发布桌面版。原生系统下构建：

```sh
npm run check
npm run desktop:build
npm run installer:build
```

Windows 输出 EXE，macOS 原生构建对应架构的 DMG / ZIP；构建成功不等于真实分流通过。见 [Windows 桌面行为](docs/DESKTOP.md)和 [Mac 边界](docs/MACOS.md)。

## 修改与提交

一个提交只包含一个逻辑变更，格式为 `<type>: <中文描述>`。说明问题、最终行为和验证结果，不提交本机清单、真实配置、密钥或无关格式修改。提交前运行 `npm run check`，相关桌面与故障检查按 AGENTS.md 执行。

## 翻译与文档

界面文案同步补充英语、日语和法语，使用完整句子与插值，不翻译应用身份、进程或节点名。四语 README 和用户指南同步维护；技术文档暂以中文为主。

```sh
npm run docs:generate
npm run docs:check
npm run docs:build
npm run docs:preview
```

预览地址为 http://127.0.0.1:4175/app-route/ 。来源、发布清单、截图和部署约定见[文档维护](docs/DOCUMENTATION.md)；界面翻译见[多语言维护](docs/LOCALIZATION.md)。公开截图仅用隔离演示数据。

## 适配新客户端

先说明客户端/内核版本、控制接口、配置所有者和生命周期，再提供可重复验证。分别证明规则应用、恢复、订阅刷新/重启和实际连接；“已连接”截图不能证明分流正确。

## 报告问题

提供系统、架构、AppRoute 与客户端版本、准确错误和复现步骤。使用虚构路径，不提交订阅、密钥、代理账号、完整扫描结果或未经检查的诊断日志。可以用简体中文或英语报告。
