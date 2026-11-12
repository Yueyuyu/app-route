param([Parameter(Mandatory=$true)][string]$InstallerPath)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'This disposable install/uninstall check only runs on GitHub-hosted CI.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA 'AppRoute'
$installation = Join-Path $env:LOCALAPPDATA 'Programs\AppRoute'
if ((Test-Path -LiteralPath $dataRoot) -or (Test-Path -LiteralPath $installation)) { throw 'Clean-install check requires an unused runner profile.' }
New-Item -ItemType Directory -Path $dataRoot | Out-Null
$sentinel = Join-Path $dataRoot 'installation-sentinel.json'
'{"fixture":"preserve-user-data"}' | Set-Content -LiteralPath $sentinel -Encoding utf8
$before = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash
& (Join-Path $PSScriptRoot 'verify-install-upgrade.ps1') -InstallerPath $InstallerPath
& (Join-Path $PSScriptRoot 'verify-install-upgrade.ps1') -InstallerPath $InstallerPath
$uninstaller = Join-Path $installation 'Uninstall AppRoute.exe'
if (-not (Test-Path -LiteralPath $uninstaller)) { throw 'Expected AppRoute uninstaller is missing.' }
$output = Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Path $output -Force | Out-Null
# NSIS 默认启动临时子进程后立即退出。自建临时副本并传入 _?=，等待真正执行卸载的进程。
# _?= 必须是最后一个参数且不加引号（包括安装路径含空格时）。不手工删除安装目录来伪造成功。
$temporaryUninstaller = Join-Path $output ('uninstall-check-' + [Guid]::NewGuid().ToString('N') + '.exe')
Copy-Item -LiteralPath $uninstaller -Destination $temporaryUninstaller
$timer = [Diagnostics.Stopwatch]::StartNew()
$process = Start-Process -FilePath $temporaryUninstaller -ArgumentList "/S _?=$installation" -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(120000)) { throw 'Uninstall did not finish within 120 seconds; remaining files were preserved for diagnosis.' }
if ($process.ExitCode -ne 0) { throw "Uninstaller failed: $($process.ExitCode)" }
$executable = Join-Path $installation 'AppRoute.exe'
for ($attempt = 0; $attempt -lt 150 -and (Test-Path -LiteralPath $executable); $attempt++) { Start-Sleep -Milliseconds 200 }
$remainingPayload = @('AppRoute.exe', 'resources\app\main.cjs', 'Uninstall AppRoute.exe') | Where-Object { Test-Path -LiteralPath (Join-Path $installation $_) }
if ($remainingPayload) { throw "Uninstall left installed files in place: $($remainingPayload -join ', ')" }
if (-not (Test-Path -LiteralPath $sentinel) -or (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash -ne $before) { throw 'Install, upgrade or uninstall changed user data.' }
Remove-Item -LiteralPath $temporaryUninstaller
@{ freshInstall = $true; upgrade = $true; uninstall = $true; userDataPreserved = $true; uninstallExitCode = $process.ExitCode; uninstallDurationMs = $timer.ElapsedMilliseconds; checkedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'clean-install-check.json') -Encoding utf8
