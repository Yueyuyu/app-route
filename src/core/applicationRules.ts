// 当前编辑器只接受文件名；完整路径匹配应使用独立字段，不能混入规则文本。
export function validProcessName(value: string, mac = false): boolean {
  const name = value.trim()
  if (mac) return name.length > 0 && name.length <= 255 && name !== '.' && name !== '..' && !/^[.-]/.test(name) && !/[\\/:*?"<>|,\x00-\x1f]/.test(name)
  return /^[^\\/:*?"<>|,\x00-\x1f]+\.exe$/i.test(name)
}
