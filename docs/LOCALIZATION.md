# 多语言维护

AppRoute 的界面、桌面菜单和项目首页提供简体中文、英语、日语、法语。语言切换入口位于右上角，名称使用各语言自身的写法，避免切换后找不到入口。

## 默认与保存

- 首次使用 `system`：按系统首选语言列表匹配 `zh`、`en`、`ja`、`fr`，地区变体如 `fr-CA`、`en-GB` 使用对应翻译。没有支持的语言时回退简体中文。
- 手动选择立即更新当前界面、Ant Design 内置文案、窗口标题和托盘/桌面菜单，无需重启。
- 桌面偏好保存在 `%LOCALAPPDATA%\AppRoute\preferences.json`，与分流 `state.json`、收藏 `inventory.json` 分开。写入失败时保留当前语言；损坏的偏好文件不被静默覆盖。
- 开发预览使用独立的 `approute.language.v1` 浏览器存储；不代替桌面设置。
- 切换只影响展示，不改变代理策略、分流规则、应用身份、收藏或当前表单草稿。

## 实现入口

| 入口 | 职责 |
| --- | --- |
| `src/shared/i18n/index.ts` | 语言解析、插值、已知诊断句型匹配和出口显示 |
| `src/shared/i18n/messages.ts` | 中文源句 → 英语、日语、法语的单一文案目录 |
| `src/renderer/i18n.tsx` | 当前语言订阅、偏好读写、日期时间显示 |
| `src/renderer/components/LanguageSwitcher.tsx` | 右上角语言入口与保存错误反馈 |
| `src/renderer/main.tsx` | Ant Design `ConfigProvider` 语言联动 |
| `src/main/desktop/languagePreferences.ts` | 固定路径的独立偏好存储 |
| `src/main/desktop/main.ts` | 受限 `language.read` / `language.write` IPC、原生菜单与系统语言 |

## 修改文案

中文源句作为可搜索的键，避免 UI 文案与另一套键名之间反复跳转。中文直接使用源句，其他语言从目录读取。源句变化时同时更新三种译文；删去不再使用的句型前先检查后端诊断是否仍返回它。

```tsx
t('已选择 {0} 个应用', [selected.length])
```

数量、路径和名称使用 `{0}` 等插值；使用完整句子，不把计数、助词和单位拆成碎片。翻译可调整插值位置，但必须保留全部槽位。没有统一的复数语法引擎，数量文案优先采用 “Selected apps: 1” 这样的中性结构。

应用名称、进程名、路径、代理组名和节点名属于用户数据，保持原文。不要对这些值直接调用 `t`；在已翻译的标签旁显示，或作为插值传入。出口显示使用 `outletLabel`，避免节点恰好叫“已连接”时被错误翻译。分类内部值和联网方式枚举保持不变。

业务层保留原始状态及诊断。展示层只完整匹配已登记的诊断句型，不改接口数据、不把未知错误猜译成成功。未知技术诊断保留原文；**独立离线恢复命令行目前仍为中文**。第三方应用名称和技术文档不承诺全部翻译。

## 验证与截图

```powershell
npm run check
npm run check:i18n
```

第一项包含语言解析、翻译槽位、名称保留、偏好跨实例保存和损坏文件保护测试。第二项可在 Windows 与 macOS 原生环境执行，发布 CI 覆盖 Windows x64、Mac arm64 / x64；使用真实 Electron 主进程、preload 和打包界面，后台替换为 `tests/fixtures/documentationBackend.mjs`：

- `LOCALAPPDATA`、`APPDATA` 隔离到忽略目录；演示后台没有系统扫描、代理控制或外部网络请求。
- 检查四语主页面、帮助展开、策略候选/高级设置、连接详情、恢复确认、添加应用和窄窗口。
- 切换时保留搜索内容；验证原生菜单、重启保留和重新跟随系统语言。
- 记录后台调用并断言没有请求分流写入；恢复弹窗只检查并取消，策略只编辑草稿。
- 输出位于 `output/playwright/localization/`，其中 `verification.json` 是检查结果。

公开截图只从这套演示数据生成。人工查看后复制选定的图片到 `docs/images/`，不复制失败截图、测试用户目录或真实应用截图。文档展示清单见 [截图来源](images/README.md)。模拟连接记录不能作为真实网络验证证据。

## 四语 README 同步

`README.md` 为中文入口，其他三个文件为 `README.en.md`、`README.ja.md`、`README.fr.md`。四语用户指南位于 `docs/guide/<locale>/`，同一任务使用相同文件名。功能范围、预览版限制、截图及恢复边界保持一致；中文技术文档明确标注。安装包链接从发布清单生成，维护与检查方法见 [文档维护](DOCUMENTATION.md)。修改能力或发布状态时同时核对四语首页与对应教程。

首页结构参考 [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev/blob/main/README.md) 的品牌/截图/安装入口，以及 [LocalSend](https://github.com/localsend/localsend/blob/main/README.md) 的一句话介绍、语言导航、功能与贡献分层。AppRoute 使用自己的文案和素材，按实际验证状态说明能力，不复制其他项目的功能承诺。参考日期：2026-11-11。

实现依据：[Ant Design 国际化](https://ant.design/docs/react/i18n/)、[Electron 系统首选语言](https://www.electronjs.org/docs/latest/api/app#appgetpreferredsystemlanguages)、[Playwright Electron API](https://playwright.dev/docs/api/class-electron)。
