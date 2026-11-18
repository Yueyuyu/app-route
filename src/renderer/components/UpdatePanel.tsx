import { useEffect, useState } from 'react'
import { Alert, Button, Collapse, Progress, Radio, Switch } from 'antd'
import { t, formatDateTime } from '../i18n'
import type { UpdateChannel, UpgradeVerification } from '../../shared/updates'
import { useReleaseUpdates } from '../hooks/useReleaseUpdates'

const resultLabels = { available: '发现新版本', current: '未发现更高的已发布版本。', 'no-release': '该通道尚无已发布版本。', unsupported: '当前系统或架构尚无对应安装包。', unavailable: '暂时无法检查更新，请稍后重试。' }
export function UpdatePanel() {
  const updates = useReleaseUpdates()
  const { channel, setChannel, result, checking, check, automatic, setAutomatic, preferenceError, downloadState, installing } = updates
  const [upgrade, setUpgrade] = useState<UpgradeVerification>()
  const transferring = ['preparing', 'downloading', 'verifying'].includes(downloadState.phase)
  const ready = downloadState.phase === 'ready'
  const busy = checking || transferring || installing
  const sameDownload = downloadState.version === result?.release?.version
  const automaticInstall = downloadState.installation === 'automatic'
  const mac = window.appRoute?.platform === 'darwin'
  useEffect(() => {
    if (installing) return
    let mounted = true
    void window.appRoute?.request<UpgradeVerification>('updates.status').then(value => { if (mounted) setUpgrade(value) }).catch(() => { if (mounted) setUpgrade({ state: 'unavailable' }) })
    return () => { mounted = false }
  }, [downloadState.phase, installing])
  const failure = result?.reason === 'rate-limit' ? 'GitHub 暂时限制请求，请十五分钟后再检查。' : result?.reason === 'missing-package' ? '发布附件尚不完整，暂不提供下载，请稍后检查。' : result && resultLabels[result.state]
  const phaseLabel = installing ? '正在准备安装更新，请稍后操作。' : downloadState.phase === 'preparing' ? '正在保存升级前备份' : downloadState.phase === 'verifying' ? '正在校验安装包' : ready ? '安装包已就绪' : '正在下载更新'
  const error = updates.actionError || downloadState.message
  return <section className="update-panel" aria-label={t('版本更新')}>
    <div className="update-controls"><Radio.Group aria-label={t('更新通道')} value={channel} disabled={busy} optionType="button" buttonStyle="solid" options={[{ value: 'stable', label: t('仅稳定版') }, { value: 'preview', label: t('包含预览版') }]} onChange={event => setChannel(event.target.value as UpdateChannel)} /><Button aria-label={t('检查更新')} aria-busy={checking} loading={checking} disabled={!window.appRoute || busy} onClick={() => void check()}>{t('检查更新')}</Button></div>
    <label className="update-automatic"><span>{t('自动检查新版本')}</span><Switch size="small" checked={automatic} disabled={installing} aria-label={t('自动检查新版本')} onChange={setAutomatic} /></label>
    {preferenceError && <Alert type="warning" title={t('更新偏好未能保存，下次将使用默认设置。')} />}
    {!result && <p className="secondary-copy">{t('从 GitHub 项目仓库读取公开发布信息，不上传应用列表或代理配置。')}</p>}
    {result && <><p className="update-result"><strong>{t(failure!)}</strong><span className="secondary-copy">{t('最近检查：{0}', [formatDateTime(result.checkedAt)])}</span></p>
      {result.release && <><p className="update-version">v{result.release.version} · {formatDateTime(result.release.publishedAt)}</p><p className="secondary-copy break-text">{result.release.assetName} · {(result.release.size / 1048576).toFixed(1)} MiB</p>
        <Collapse items={[{ key: 'notes', label: t('发布说明与文件校验'), children: <><pre className="update-notes">{result.release.notes || t('发布说明为空，请稍后查看。')}</pre><p>SHA-256</p><code className="update-checksum">{result.release.sha256}</code><p className="secondary-copy">{t('SHA-256 仅用于文件校验，不能替代发布者签名。')}</p></> }]} />
        {result.state === 'available' && !transferring && !installing && (!ready || !sameDownload) && <Button type="primary" className="update-download" disabled={busy} onClick={() => void updates.download()}>{t('备份并下载')}</Button>}
      </>}
    </>}
    {(transferring || ready || installing) && <div className="update-transfer">
      <div className="update-transfer-title" role="status"><strong>{t(phaseLabel)}</strong><span>v{downloadState.version}</span></div>
      {downloadState.phase === 'downloading' && <Progress percent={Math.min(100, Math.floor(downloadState.received / Math.max(1, downloadState.total) * 100))} size="small" />}
      {transferring && <Button size="small" onClick={() => void updates.cancelDownload()}>{t('取消下载')}</Button>}
      {ready && !installing && <><p className="secondary-copy">{t(automaticInstall ? '安装前将再次备份设置，随后退出并自动安装、重新打开。' : mac ? '打开安装包后，将 AppRoute 拖入应用程序文件夹完成替换。' : '当前为目录运行版，请从下载目录手动运行安装包。')}</p>
        <div className="update-actions"><Button type="primary" onClick={() => void updates.install()}>{t(automaticInstall ? '安装并重启' : mac ? '打开安装包' : '打开下载目录')}</Button>
          {automaticInstall && <Button onClick={() => void updates.reveal()}>{t('打开下载目录')}</Button>}
          <Button type="text" onClick={() => void updates.download()} disabled={!sameDownload || checking}>{t('重新下载')}</Button>
        </div></>}
    </div>}
    {downloadState.phase === 'cancelled' && <p className="secondary-copy" role="status">{t('下载已取消，可随时重新下载。')}</p>}
    {error && <Alert type="error" title={t(error)} />}
    {updates.manualOpened && <Alert type="info" title={t(mac ? '安装包已打开；请手动完成替换后重新打开 AppRoute。' : '下载目录已打开；请手动完成安装后重新打开 AppRoute。')} />}
    {upgrade && upgrade.state !== 'none' && <div className="upgrade-verification"><strong>{t('升级设置核对')}</strong><p>{t(upgrade.state === 'pending' ? '升级前备份已保存，等待安装 {0}。' : upgrade.state === 'preserved' ? '已核对升级前的应用设置，未发现丢失。' : upgrade.state === 'changed' ? '当前设置与升级前有 {0} 处差异，请在设置与备份中核对。' : '升级设置暂时无法核对，请在设置与备份中检查。', [upgrade.state === 'pending' ? upgrade.targetVersion ?? '' : upgrade.changedCount ?? 0])}</p>
      {upgrade.rules && <p className="secondary-copy">{t(upgrade.rules === 'loaded' ? '分流规则已加载，实际新连接仍需验证。' : upgrade.rules === 'waiting' ? '等待连接内核后核对分流规则。' : '分流规则待检查，请查看连接详情。')}</p>}
      {upgrade.checkedAt && <span className="secondary-copy">{formatDateTime(upgrade.checkedAt)}</span>}
    </div>}
  </section>
}
