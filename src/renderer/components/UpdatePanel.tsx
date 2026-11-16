import { useEffect, useState } from 'react'
import { Alert, Button, Collapse, Radio } from 'antd'
import { buildInfo } from '../buildInfo'
import { t, formatDateTime } from '../i18n'
import { settingsError } from '../settingsError'
import type { UpdateChannel, UpdateCheck, UpgradeVerification } from '../../shared/updates'

const channelKey = 'approute.update-channel.v1'
const resultLabels = { available: '发现新版本', current: '未发现更高的已发布版本。', 'no-release': '该通道尚无已发布版本。', unsupported: '当前系统或架构尚无对应安装包。', unavailable: '暂时无法检查更新，请稍后重试。' }
function savedChannel(): UpdateChannel {
  try { const value = localStorage.getItem(channelKey); if (value === 'stable' || value === 'preview') return value } catch { /* 使用构建所属通道。 */ }
  return buildInfo.version.includes('-preview.') ? 'preview' : 'stable'
}
export function UpdatePanel() {
  const [channel, setChannel] = useState(savedChannel)
  const [result, setResult] = useState<UpdateCheck>(), [upgrade, setUpgrade] = useState<UpgradeVerification>()
  const [busy, setBusy] = useState<'check' | 'download'>(), [notice, setNotice] = useState('')
  useEffect(() => { let mounted = true; void window.appRoute?.request<UpgradeVerification>('updates.status').then(value => { if (mounted) setUpgrade(value) }).catch(() => { if (mounted) setUpgrade({ state: 'unavailable' }) }); return () => { mounted = false } }, [])
  async function check() {
    if (!window.appRoute || busy) return
    setBusy('check'); setNotice('')
    try { setResult(await window.appRoute.request('updates.check', { channel })) }
    catch { setResult(undefined); setNotice('暂时无法检查更新，请稍后重试。') }
    finally { setBusy(undefined) }
  }
  async function download() {
    if (!result?.release || result.state !== 'available' || busy) return
    setBusy('download'); setNotice('')
    try {
      await window.appRoute!.request('updates.prepare', { channel, version: result.release.version })
      setNotice('升级前备份已保存，已打开对应安装包下载入口。')
      setUpgrade(await window.appRoute!.request('updates.status'))
    } catch (error) { setNotice(settingsError(error, '升级准备未完成，请重新检查；现有设置保持不变。')) }
    finally { setBusy(undefined) }
  }
  const failure = result?.reason === 'rate-limit' ? 'GitHub 暂时限制请求，请十五分钟后再检查。' : result?.reason === 'missing-package' ? '发布附件尚不完整，暂不提供下载，请稍后检查。' : result && resultLabels[result.state]
  return <section className="update-panel" aria-label={t('版本更新')}>
    <div className="update-controls"><Radio.Group aria-label={t('更新通道')} value={channel} disabled={Boolean(busy)} optionType="button" buttonStyle="solid" options={[{ value: 'stable', label: t('仅稳定版') }, { value: 'preview', label: t('包含预览版') }]} onChange={event => { const value = event.target.value as UpdateChannel; setChannel(value); setResult(undefined); setNotice(''); try { localStorage.setItem(channelKey, value) } catch { setNotice('更新通道未能保存，下次将使用默认通道。') } }} /><Button aria-label={t('检查更新')} aria-busy={busy === 'check'} loading={busy === 'check'} disabled={!window.appRoute || Boolean(busy)} onClick={() => void check()}>{t('检查更新')}</Button></div>
    {!result && !notice && <p className="secondary-copy">{t('从 GitHub 项目仓库读取公开发布信息，不上传应用列表或代理配置。')}</p>}
    {result && <><p className="update-result"><strong>{t(failure!)}</strong><span className="secondary-copy">{t('最近检查：{0}', [formatDateTime(result.checkedAt)])}</span></p>
      {result.release && <><p className="update-version">{result.release.version} · {formatDateTime(result.release.publishedAt)}</p><p className="secondary-copy break-text">{result.release.assetName} · {(result.release.size / 1048576).toFixed(1)} MiB</p>
        <Collapse items={[{ key: 'notes', label: t('发布说明与文件校验'), children: <><pre className="update-notes">{result.release.notes || t('发布说明为空，请稍后查看。')}</pre><p>SHA-256</p><code className="update-checksum">{result.release.sha256}</code><p className="secondary-copy">{t('SHA-256 仅用于文件校验，不能替代发布者签名。')}</p></> }]} />
        {result.state === 'available' && <Button type="primary" className="update-download" aria-label={t('备份并下载')} aria-busy={busy === 'download'} loading={busy === 'download'} disabled={Boolean(busy)} onClick={() => void download()}>{t('备份并下载')}</Button>}
      </>}
    </>}
    {notice && <Alert type="info" title={t(notice)} />}
    {upgrade && upgrade.state !== 'none' && <div className="upgrade-verification"><strong>{t('升级设置核对')}</strong><p>{t(upgrade.state === 'pending' ? '升级前备份已保存，等待安装 {0}。' : upgrade.state === 'preserved' ? '已核对升级前的应用设置，未发现丢失。' : upgrade.state === 'changed' ? '当前设置与升级前有 {0} 处差异，请在设置与备份中核对。' : '升级设置暂时无法核对，请在设置与备份中检查。', [upgrade.state === 'pending' ? upgrade.targetVersion ?? '' : upgrade.changedCount ?? 0])}</p>
      {upgrade.rules && <p className="secondary-copy">{t(upgrade.rules === 'loaded' ? '分流规则已加载，实际新连接仍需验证。' : upgrade.rules === 'waiting' ? '等待连接内核后核对分流规则。' : '分流规则待检查，请查看连接详情。')}</p>}
      {upgrade.checkedAt && <span className="secondary-copy">{formatDateTime(upgrade.checkedAt)}</span>}
    </div>}
  </section>
}
