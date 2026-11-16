// 精确替换只在临时副本发生。实现变化后匹配失败，要求重新审查破坏点，不能悄悄跳过。
export const regressionCases = [
  { id: 'remove-failed-domain-proxy', file: 'src/main/services/routingService.ts',
    before: "request.applications.flatMap(app => app.mode === 'rule' ? [] : context.exceptions?.get(app.id)", after: 'request.applications.flatMap(app => context.exceptions?.get(app.id)',
    test: 'tests/routingTransaction.test.ts', name: '代理例外出口失效后仍能撤销应用专属规则' },
  { id: 'domain-suffix-boundary', file: 'src/core/domainExceptions.ts', before: "domain.endsWith('.' + item.domain)", after: 'domain.endsWith(item.domain)',
    test: 'tests/domainExceptions.test.ts', name: '域名例外按精确和最长后缀排序，拒绝越界匹配和规则注入' },
  { id: 'rebind-stale-helpers', file: 'src/main/services/routingService.ts',
    before: 'samePrimary ? previousPaths : undefined', after: 'previousPaths',
    test: 'tests/routingTransaction.test.ts', name: '失效路径重绑需确认，失败保留旧规则，成功移除旧身份且不保留旧辅助路径' },
  { id: 'scenario-stale-source', file: 'src/main/services/settingsScenarios.ts',
    before: 'draft.fingerprint !== await this.fingerprint()', after: 'false',
    test: 'tests/scenarios.test.ts', name: '方案拒绝过期来源、伪造条目、重复名称、临时状态及内容变化后的删除' },
  { id: 'temporary-manual-choice', file: 'src/main/services/routingService.ts',
    before: "source === 'helper' ? original?.temporary : undefined", after: 'true ? original?.temporary : undefined',
    test: 'tests/routingTransaction.test.ts', name: '临时续期保留最初选择，旧定时不能覆盖手动改选，策略变更不破坏恢复目标' },
  { id: 'stale-routing-undo', file: 'src/core/routingHistory.ts',
    before: 'tx.after.revision !== current.revision || historyStateSignature(tx.after) !== historyStateSignature(current)', after: 'false',
    test: 'tests/routingTransaction.test.ts', name: '撤销拒绝后续新修改和过期页面，不重放旧选择' },
  { id: 'duplicate-import-binding', file: 'src/main/services/settingsTransfer.ts',
    before: 'if ([...session.applications].some(([key, app]) => key !== row.key && processPathKey(app.path!) === identity))', after: 'if (false)',
    test: 'tests/settingsTransfer.test.ts', name: '人工绑定只更新预览，拒绝任意路径、重复目标、共享宿主与旧预览，应用时重新核对路径' },
  { id: 'trusted-release-assets', file: 'src/core/releaseUpdates.ts',
    before: 'asset.browser_download_url !== downloadUrl', after: 'false',
    test: 'tests/releaseUpdates.test.ts', name: '下载必须匹配系统架构、固定仓库与校验摘要，缺失附件不能假报最新' },
  { id: 'upgrade-backup-integrity', file: 'src/main/services/upgradeVerification.ts',
    before: 'backup.fingerprint !== baseline.fingerprint', after: 'false',
    test: 'tests/releaseUpdates.test.ts', name: '升级备份只追加本机备份，升级核对不重放配置，发现用户新选择时保留它' },
  { id: 'diagnosis-missing-records', file: 'src/core/applicationDiagnosis.ts',
    before: 'const integrityIssue = Boolean(status?.dataIssue || status?.untrackedRuleCount)', after: 'const integrityIssue = false',
    test: 'tests/applicationDiagnosis.test.ts', name: '管理记录缺失或损坏不能被单应用诊断解释成沿用原规则' },
  { id: 'single-flight-status', file: 'src/core/statusRefresh.ts',
    before: 'if (this.pending) return this.pending', after: '/* proof: duplicate pending reads */',
    test: 'tests/statusRefresh.test.ts', name: '慢状态请求合并，完成后下一次读取仍访问新状态' },
  { id: 'fair-connection-evidence', file: 'src/core/connectionEvidence.ts',
    before: 'return { evidence: selected, observations }', after: 'return { evidence: evidence.slice(0, 50), observations }',
    test: 'tests/statusRefresh.test.ts', name: '繁忙应用不能挤掉其他应用证据，采样不隐藏任何应用的异常' },
  { id: 'preserve-user-rules', file: 'src/core/managedRouting.ts',
    before: 'copy.rules = copy.rules.slice(marker.rules.length)', after: 'copy.rules = []',
    test: 'tests/managedRouting.test.ts', name: '应用与撤销仅增删带所有权标记的规则，原配置保持一致' },
  { id: 'stale-import-preview', file: 'src/main/services/settingsTransfer.ts',
    before: "if (session.fingerprint !== await this.fingerprint()) throw new Error('设置已变化，请重新预览。')\n      if (request.restoreStrategy", after: '/* proof: removed stale-preview guard */\n      if (request.restoreStrategy',
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
