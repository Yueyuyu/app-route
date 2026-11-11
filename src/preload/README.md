# 桌面桥接

`index.ts` 通过 contextBridge 暴露固定业务请求和刷新事件。主进程核对主框架及本地协议来源，再转发至独立 Node 后台。不得暴露 ipcRenderer、任意文件访问或 shell 执行。
