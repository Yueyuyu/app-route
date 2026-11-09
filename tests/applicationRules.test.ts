import assert from 'node:assert/strict'
import test from 'node:test'
import { validProcessName } from '../src/core/applicationRules.ts'

test('允许中文、空格及大小写不同的 Windows 进程文件名', () => {
  for (const value of ['QQMusic.exe', '程序.EXE', 'My App.exe']) assert.equal(validProcessName(value), true)
})

test('拒绝规则注入、控制字符、完整路径和非 exe 输入', () => {
  for (const value of ['a.exe,DIRECT', 'a\n.exe', 'a\u0000.exe', 'C:\\Apps\\a.exe', '../a.exe', 'app', '.exe']) {
    assert.equal(validProcessName(value), false, value)
  }
})
