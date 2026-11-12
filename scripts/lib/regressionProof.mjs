// 精确替换只在临时副本发生。实现变化后匹配失败，要求重新审查破坏点，不能悄悄跳过。
export const regressionCases = [
  { id: 'preserve-user-rules', file: 'src/core/managedRouting.ts',
    before: 'copy.rules = copy.rules.slice(marker.rules.length)', after: 'copy.rules = []',
    test: 'tests/managedRouting.test.ts', name: '应用与撤销仅增删带所有权标记的规则，原配置保持一致' },
  { id: 'stale-import-preview', file: 'src/main/services/settingsTransfer.ts',
    before: "if (session.fingerprint !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')", after: '/* proof: removed stale-preview guard */',
    test: 'tests/settingsTransfer.test.ts', name: '路径缺失、共享宿主和预览后变更均不能偷偷写入' },
  { id: 'stale-backup-delete', file: 'src/main/services/settingsBackups.ts',
    before: 'if (!current.restorable || current.fingerprint !== fingerprint)', after: 'if (!current.restorable)',
    test: 'tests/settingsTransfer.test.ts', name: '备份列表、过期删除、损坏文件与路径边界' },
]
export function breakOnce(source, scenario) {
  if (source.split(scenario.before).length !== 2) throw new Error(`${scenario.id}: 破坏点应精确出现一次，请重新审查实现`)
  return source.replace(scenario.before, scenario.after)
}
export function verifyTestResult(result, scenario, broken) {
  if (result.error || result.signal) throw new Error(`${scenario.id}: 运行异常或超时，不算测试发现缺陷`)
  const output = result.stdout + result.stderr
  if (broken) {
    if (result.status === 0 || !output.includes(`- ${scenario.name}`) || !output.includes("code: 'ERR_ASSERTION'") || !output.includes('not ok')) {
      throw new Error(`${scenario.id}: 需要目标测试的实际断言失败，不能用编译、加载错误或跳过代替`)
    }
  } else if (result.status !== 0 || !output.includes(`- ${scenario.name}`) || !/# pass [1-9]/.test(output)) throw new Error(`${scenario.id}: 正常实现没有通过目标测试`)
}
