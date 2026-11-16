import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { assertExceptionPaths, bindDomainExceptions, canonicalRulePayload, matchingDomainException, validateDomainExceptions } from '../src/core/domainExceptions.ts'
import { addManagedRules, effectiveApplications, overrideScript, removeManagedRules, ruleStrings } from '../src/core/managedRouting.ts'
import type { ManagedApplication } from '../src/shared/integration.ts'
import { parseRoutingState } from '../src/main/storage/routingStateStore.ts'

const entries = [{ kind: 'suffix', domain: 'example.test', mode: 'proxy' }, { kind: 'exact', domain: 'API.Example.test', mode: 'direct' }, { kind: 'suffix', domain: 'cdn.example.test', mode: 'direct' }]
const app: ManagedApplication = { id: 'music', name: 'Music', mode: 'direct', processes: ['Music.exe'], processPaths: ['C:\\Apps (x86)\\Music.exe'], domainExceptions: bindDomainExceptions(entries, 'Group') }
test('域名例外按精确和最长后缀排序，拒绝越界匹配和规则注入', () => {
  assert.deepEqual(validateDomainExceptions(entries).map(item => item.domain), ['api.example.test', 'cdn.example.test', 'example.test'])
  assert.equal(matchingDomainException(app, 'API.EXAMPLE.TEST.')?.mode, 'direct')
  assert.equal(matchingDomainException(app, 'asset.cdn.example.test')?.mode, 'direct')
  assert.equal(matchingDomainException(app, 'shop.example.test')?.mode, 'proxy')
  assert.equal(matchingDomainException(app, 'badexample.test'), undefined)
  for (const domain of ['https://example.test', '127.0.0.1', '*.example.test', 'a..test', 'a.test:80', 'x),MATCH,DIRECT', '-x.test', 'a.test/', '', 'a'.repeat(64)+'.test']) assert.throws(() => validateDomainExceptions([{ kind: 'exact', domain, mode: 'direct' }]))
  assert.throws(() => validateDomainExceptions([entries[0], entries[0]]))
  assert.throws(() => bindDomainExceptions(entries, 'Group,other'))
  assert.throws(() => assertExceptionPaths(['C:\\broken (\\Music.exe']))
  assert.doesNotThrow(() => assertExceptionPaths(app.processPaths))
})
test('域名例外必须与程序路径相交，覆写和即时配置一致，恢复保留原规则', () => {
  const config = { 'proxy-groups': [{ name: 'Group', type: 'select', proxies: ['DIRECT'] }], rules: ['DOMAIN,example.test,DIRECT', 'MATCH,DIRECT'] }
  const expected = addManagedRules(config, [app])
  assert.equal(expected.rules[0], 'AND,((PROCESS-PATH,C:\\Apps (x86)\\Music.exe),(DOMAIN,api.example.test)),DIRECT')
  assert.equal(expected.rules[2], 'AND,((PROCESS-PATH,C:\\Apps (x86)\\Music.exe),(DOMAIN-SUFFIX,example.test)),Group')
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(overrideScript([app])+'; main(input)', { input: config }))), expected)
  assert.deepEqual(removeManagedRules(expected), config)
  assert.equal(canonicalRulePayload('AND', '((PROCESS-PATH,C:\\Apps (x86)\\Music.exe),(DOMAIN,api.example.test))'), '((ProcessPath,C:\\Apps (x86)\\Music.exe) && (Domain,api.example.test))')
  assert.ok(ruleStrings(effectiveApplications([app], ['DIRECT']))[2].endsWith(',REJECT'))
  const missingBase = { ...app, mode: 'proxy' as const, target: 'Missing', missingTargetAction: 'original' as const }
  assert.equal(ruleStrings(effectiveApplications([missingBase], ['DIRECT'])).length, 3, 'missing base leaves specific exceptions but no base rule')
  const restored = parseRoutingState(JSON.stringify({ revision: 'test', managed: [app] }))
  assert.deepEqual(restored.managed[0].domainExceptions, app.domainExceptions)
  assert.throws(() => parseRoutingState(JSON.stringify({ revision: 'test', managed: [{ ...app, processPaths: undefined }] })))
})
