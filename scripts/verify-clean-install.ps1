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
$process = Start-Process -FilePath $uninstaller -ArgumentList '/S' -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(60000)) { throw 'Uninstall did not finish.' }
$executable = Join-Path $installation 'AppRoute.exe'
for ($attempt = 0; $attempt -lt 150 -and (Test-Path -LiteralPath $executable); $attempt++) { Start-Sleep -Milliseconds 200 }
if (Test-Path -LiteralPath $executable) { throw 'Uninstall left the application executable in place.' }
if (-not (Test-Path -LiteralPath $sentinel) -or (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash -ne $before) { throw 'Install, upgrade or uninstall changed user data.' }
$output = Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Path $output -Force | Out-Null
@{ freshInstall = $true; upgrade = $true; uninstall = $true; userDataPreserved = $true; checkedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'clean-install-check.json') -Encoding utf8
