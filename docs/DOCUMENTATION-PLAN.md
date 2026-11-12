# 文档与下载改进方案

2026-11-12：按普通用户的“认识产品 → 选择安装包 → 完成任务 → 验证结果 → 更新与恢复”路径整理。品牌沿用确认稿，产品联网行为不因文档改版改变。

| 已识别问题 | 处理位置与验收 |
| --- | --- |
| 已发安装包，首页仍要求编译和切换旧分支 | 四语 README 先放直接下载，源码构建移入 CONTRIBUTING；徽章读取 main |
| 版本与测试状态混杂、反馈模板过时 | PROJECT、ROADMAP、RECOVERY、代理说明统一指向 VERIFICATION；模板区分平台、版本和实际现象 |
| 教程以实现说明为主 | 四语用户指南：安装、首次使用、QQ 音乐直连、跟随组、自动策略、更新恢复、常见问题；操作配截图、预期结果和异常入口 |
| Release 文件名难辨认 | 按 Windows / Apple Silicon / Intel 的推荐下载表，备用 ZIP、校验与源码用途分开说明 |
| 文件名、链接和版本靠手工同步 | current.json 保存已发布资产，脚本生成四语下载表与 SHA256SUMS；发布流程从校验后的真实产物生成同格式清单 |
| 多语言首页深入后只有中文 | 四语用户文档具备同名页面；技术设计文档可保持中文并明确标注 |
| 文档散落、缺少搜索 | VitePress 静态站：语言导航、页内目录、本地全文搜索；GitHub Pages 仅发布公开指南和演示素材 |
| 升级与异常不易自助 | 明确正常退出、覆盖安装、保留数据、卸载前恢复；杀毒提示不能无证据判定为误报 |
| 发布维护缺少检查 | 本地/CI 检查链接、标题锚点、下载生成一致性、翻译页面覆盖及文档站构建；浏览器检查搜索、切语言和窄屏 |

现有 Release 只改说明、增加文本清单，不覆盖已发布安装包与各自校验文件。正式签名、公证、自动更新、Windows 真便携版和包管理器渠道是后续产品工作，不通过虚构附件或文案宣称已经支持。

参考：[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)、[PowerToys](https://github.com/microsoft/PowerToys)、[LocalSend](https://github.com/localsend/localsend)、[Clash Party](https://github.com/mihomo-party-org/clash-party)、[Flow Launcher](https://github.com/Flow-Launcher/Flow.Launcher)。重点采用安装指引、任务教程、平台下载分类；不复制其广告、素材或能力承诺。
