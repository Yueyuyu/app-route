import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { resolveLocale, translate, translateProxyOutlet, isLanguagePreference } from '../src/shared/i18n/index.ts'
import { messages } from '../src/shared/i18n/messages.ts'
import { LanguagePreferencesStore } from '../src/main/desktop/languagePreferences.ts'

test('首次跟随系统语言，支持地区变体，未支持语言回退简体中文', () => {
  assert.equal(resolveLocale('system', ['fr-CA']), 'fr')
  assert.equal(resolveLocale('system', ['ja-JP']), 'ja')
  assert.equal(resolveLocale('system', ['en-GB']), 'en')
  assert.equal(resolveLocale('system', ['zh-Hans-CN']), 'zh-CN')
  assert.equal(resolveLocale('system', ['de-DE']), 'zh-CN')
  assert.equal(resolveLocale('en', ['zh-CN']), 'en')
  assert.equal(isLanguagePreference('../../state.json'), false)
})

test('四语文案完整，插值槽位一致，节点与程序路径保持原样', () => {
  const slots = (value: string) => [...new Set(value.match(/\{\d+\}/g) ?? [])].sort()
  for (const [source, translations] of Object.entries(messages)) {
    assert.equal(translations.length, 3, source)
    for (const translated of translations) { assert.ok(translated.trim(), source); assert.deepEqual(slots(translated), slots(source), source) }
  }
  assert.equal(translate('en', '已选择 {0} 个应用', [5]), 'Selected apps: 5')
  assert.equal(translate('fr', '已验证 Music.exe 的 2 条新连接；其余进程仍待观测。'), '2 nouvelles connexions de Music.exe vérifiées ; les autres processus restent à observer.')
  assert.equal(translate('ja', '{0} · 当前直连', ['🚀 自定义节点']), '🚀 自定义节点 · 現在は直接接続')
  assert.equal(translate('en', 'C:\\Applications\\我的软件\\music.exe'), 'C:\\Applications\\我的软件\\music.exe')
  assert.equal(translate('en', '未知的内核错误 E42'), '未知的内核错误 E42')
  assert.equal(translate('en', '__proto__'), '__proto__')
  assert.equal(translate('en', 'constructor'), 'constructor')
  assert.equal(translate('zh-CN', '已选择 {0} 个应用', [2]), '已选择 2 个应用')
  assert.equal(translateProxyOutlet('en', { target: '恢复网络', chain: [], node: '已连接', kind: 'proxy', health: 'healthy' }), '已连接')
})

test('语言偏好跨实例保留，只写偏好文件；损坏文件与分流状态不被覆盖', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'approute-language-'))
  try {
    const state = '{"managed":["fixture"],"revision":"keep"}'
    await fs.writeFile(path.join(root, 'state.json'), state)
    const store = new LanguagePreferencesStore(root)
    assert.equal(await store.read(), 'system')
    await store.write('fr')
    assert.equal(await new LanguagePreferencesStore(root).read(), 'fr')
    await assert.rejects(store.write('invalid'))
    assert.equal(await store.read(), 'fr')
    await fs.writeFile(path.join(root, 'preferences.json'), '{broken')
    await assert.rejects(store.write('ja'))
    assert.equal(await fs.readFile(path.join(root, 'preferences.json'), 'utf8'), '{broken')
    assert.equal(await fs.readFile(path.join(root, 'state.json'), 'utf8'), state)
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
