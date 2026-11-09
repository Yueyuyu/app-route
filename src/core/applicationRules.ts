// 当前编辑器只接受文件名；完整路径匹配应使用独立字段，不能混入规则文本。
export function validProcessName(value: string): boolean {
  return /^[^\\/:*?"<>|,\x00-\x1f]+\.exe$/i.test(value.trim())
}
