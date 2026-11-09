# 桌面桥接边界（规划）

当前运行形态是 Vite 开发预览，尚未包含 Electron 主进程入口或 preload 实现。

桌面化时在此提供带类型的有限接口，例如 `applications.scan()`；调用固定 IPC 通道。
界面不得获得任意文件读写、任意 shell、任意 URL 请求或代理控制凭据。
扫描实现复用 `../main/platform/windows/scanApplications.ts`，不在界面重新实现。
Electron 的 contextIsolation 和 sandbox 应开启，nodeIntegration 应关闭。
