import fs from 'node:fs/promises'
import path from 'node:path'
import { isLanguagePreference, type LanguagePreference } from '../../shared/i18n/index.ts'

/** 独立于分流状态保存界面偏好；损坏的文件不被静默覆盖。 */
export class LanguagePreferencesStore {
  private readonly directory: string
  constructor(directory: string) { this.directory = directory }
  async read(): Promise<LanguagePreference> {
    const text = await fs.readFile(path.join(this.directory, 'preferences.json'), 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error })
    if (!text) return 'system'
    const value = JSON.parse(text)
    if (value.version !== 1 || !isLanguagePreference(value.language)) throw new Error('语言设置无法读取，请保留原文件后重试。')
    return value.language
  }
  async write(language: unknown): Promise<LanguagePreference> {
    if (!isLanguagePreference(language)) throw new Error('不支持的显示语言。')
    await this.read()
    await fs.mkdir(this.directory, { recursive: true })
    const destination = path.join(this.directory, 'preferences.json'), temporary = destination + '.tmp'
    await fs.writeFile(temporary, JSON.stringify({ version: 1, language }) + '\n', 'utf8')
    await fs.rename(temporary, destination)
    return language
  }
}
