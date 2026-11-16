# 其他 Mihomo 客户端的只读检查

在“设置与备份 → 其他 Mihomo 客户端 → 检查兼容性”中，选择客户端正在使用的 YAML / JSON 运行配置。原生选择器取消时不读取文件或访问网络。检查不会切换当前后端；现有分流仍由 Clash Party 管理。

主进程只提取 `external-controller` 和本次鉴权所需的 `secret`，固定连接 `127.0.0.1`。配置允许声明回环地址、localhost 或通配监听地址，但不访问远端主机、代理入口或重定向。密钥、配置原文、连接列表和所选路径不返回界面，不写入偏好、日志或导出；每次重新选择文件。

仅调用 `GET /version`、`GET /configs`、`GET /connections`。文件与单次响应上限均为 2 MB，每个请求最多 3 秒；首先确认 Mihomo 身份，再并行读取两项能力。失败显示未知或不可访问，不补写配置、不自动启用控制端口。

| 展示结果 | 能证明什么 |
| --- | --- |
| 进程识别设置已确认 | API 报告 `strict` / `always`；不证明任意应用流量已进入内核 |
| 连接记录读取已确认 | 本次可以读取连接接口；空记录不算故障 |
| 重启后规则保留未验证 | 未确认客户端配置所有权、订阅再生成和重启行为 |
| UDP 接管未验证 | 未进行端到端 UDP 接管测试 |

接口成功也只返回 `needs-setup`，不开放分流写入，不显示完整兼容。私有端口未开启、只开放命名管道/Unix socket 或运行配置不含 HTTP 管理口时，保持不可访问；不得指导用户关闭鉴权来绕过检查。

## Clash Verge Rev 优先适配

2026-11-16 用户选择其作为第二个客户端。已核对上游 main 分支的 [配置路径](https://github.com/clash-verge-rev/clash-verge-rev/blob/main/src-tauri/src/utils/dirs.rs)、[订阅配置与保存](https://github.com/clash-verge-rev/clash-verge-rev/blob/main/src-tauri/src/config/profiles.rs)及 [运行配置](https://github.com/clash-verge-rev/clash-verge-rev/blob/main/src-tauri/src/config/runtime.rs)。上游会维护内存状态和独立的配置生成流程，因此不能仅改磁盘文件并调用 Mihomo 重载就宣称已持久保存。

正式写入适配尚未实现。需先固定版本，增加独立配置所有者：只管理专属条目，保留原规则和脚本；验证用户在客户端修改配置时的冲突、订阅切换/成功刷新、重启、失败回退及 AppRoute 离线恢复。当前机器未发现其标准用户数据目录，尚未进行该客户端实机写入验收。这些工作仍在兼容矩阵中标为待完成。

实现入口：`src/main/adapters/mihomoEndpointInspector.ts`；界面 `MihomoInspectorPanel` 仅接收白名单能力结果。单位测试使用本机 HTTP 夹具；设置 UI 验证真实原生选择器调用链和四语展示；隔离故障脚本另启动带鉴权的真实 Mihomo 核对 API，不能替代 Clash Verge Rev 的配置持久化验收。

接口依据：[Mihomo 控制 API](https://wiki.metacubex.one/api/)。
