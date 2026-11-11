import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { addManagedRules, assertNoSystemHostRouting, isProxyOnly, managedApplications, markerKey, overrideScript, removeManagedRules } from '../src/core/managedRouting.ts'
import type { Application } from '../src/shared/application.ts'

const app: Application = { id: 'music', name: '音乐', processes: ['Music.exe'], category: '音乐', source: 'manual', mode: 'proxy' }
const config = { proxies: [{ name: 'Node', type: 'ss' }], 'proxy-groups': [{ name: 'Group', type: 'select', proxies: ['Node'] }], rules: ['DOMAIN,existing.example,DIRECT', 'MATCH,Group'], dns: { enable: true }, untouched: { nested: 1 } }

test('新设置拒绝共享系统宿主，名称、主路径和辅助路径均不能绕过；允许撤销', () => {
  for (const name of ['EXPLORER.EXE', 'svchost.exe', 'rundll32.exe', 'Control.exe', 'cmd.exe', 'RuntimeBroker.exe']) {
    const host = { ...app, processes: [name] }
    assert.throws(() => assertNoSystemHostRouting([host]), /系统共享进程/)
    assert.throws(() => assertNoSystemHostRouting([{ ...app, path: `C:\\Windows\\${name}` }]), /系统共享进程/)
    assert.throws(() => assertNoSystemHostRouting([{ ...app, processPaths: [`C:\\Windows\\${name}`] }]), /系统共享进程/)
    assert.doesNotThrow(() => assertNoSystemHostRouting([{ ...host, mode: 'rule' }]))
  }
  assert.doesNotThrow(() => assertNoSystemHostRouting([app]))
})

test('应用与撤销仅增删带所有权标记的规则，原配置保持一致', () => {
  const managed = managedApplications([app], 'Group')
  const result = addManagedRules(config, managed)
  assert.equal(result.rules[0], 'PROCESS-NAME,Music.exe,Group')
  assert.deepEqual(removeManagedRules(result), config)
  assert.equal(config.rules.length, 2)
  assert.deepEqual(addManagedRules(result, managed), result)
})
test('生成脚本与本机编译一致，订阅更新后缺失出口安全跳过', () => {
  const apps = managedApplications([app], 'Group')
  const generated = overrideScript(apps)
  const run = (input: unknown) => JSON.parse(JSON.stringify(vm.runInNewContext(generated + '\nmain(config)', { config: structuredClone(input) }, { timeout: 500 })))
  assert.deepEqual(run(config), addManagedRules(config, apps))
  assert.deepEqual(run(run(config)), run(config))
  const changed = { ...config, 'proxy-groups': [], rules: ['MATCH,DIRECT'] }
  assert.deepEqual(run(changed), changed)
})
test('规则标记冲突时不擅自移除用户规则', () => {
  const result = addManagedRules(config, managedApplications([app], 'Group'))
  result.rules.unshift('DOMAIN,new.example,DIRECT')
  assert.throws(() => removeManagedRules(result), /标记/)
  assert.equal(result[markerKey].rules.length, 1)
})
test('拒绝示例、重复进程与修复通道，按规则模式不生成专属规则', () => {
  assert.throws(() => managedApplications([{ ...app, source: 'example' }], 'Group'), /示例/)
  assert.throws(() => managedApplications([{ ...app, processes: ['Codex.exe'] }], 'Group'), /修复通道/)
  assert.throws(() => managedApplications([app, { ...app, id: 'other' }], 'Group'), /同一进程/)
  assert.deepEqual(managedApplications([{ ...app, mode: 'rule' }]), [])
})
test('代理选择排除包含 DIRECT 的嵌套组和循环引用', () => {
  const proxies = { node: { name: 'node', type: 'Shadowsocks' }, DIRECT: { name: 'DIRECT', type: 'Direct' }, safe: { name: 'safe', type: 'Selector', all: ['node'] }, unsafe: { name: 'unsafe', type: 'Selector', all: ['safe', 'DIRECT'] }, loop: { name: 'loop', type: 'Selector', all: ['loop'] } }
  assert.equal(isProxyOnly('safe', proxies), true)
  assert.equal(isProxyOnly('unsafe', proxies), false)
  assert.equal(isProxyOnly('loop', proxies), false)
})
