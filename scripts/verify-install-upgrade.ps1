param([Parameter(Mandatory=$true)][string]$InstallerPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$expected = [IO.Path]::GetFullPath((Join-Path $root 'release\installer')) + [IO.Path]::DirectorySeparatorChar
if (-not $installer.StartsWith($expected, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($installer) -ne '.exe') { throw 'Only a locally built AppRoute installer is accepted.' }
if (Get-Process -Name AppRoute -ErrorAction SilentlyContinue) { throw 'Exit AppRoute normally before installer verification.' }
$dataRoot = Join-Path $env:LOCALAPPDATA 'AppRoute'
$partyRoot = Join-Path $env:APPDATA 'mihomo-party'
$targets = @(
  (Join-Path $dataRoot 'state.json'), (Join-Path $dataRoot 'inventory.json'), (Join-Path $dataRoot 'preferences.json'),
  (Join-Path $partyRoot 'config.yaml'), (Join-Path $partyRoot 'profile.yaml'), (Join-Path $partyRoot 'override.yaml'),
  (Join-Path $partyRoot 'override\approute-managed-v1.js'), (Join-Path $dataRoot 'recovery\Restore-Network.cmd')
)
$hashes = @{}
foreach ($file in $targets) { if (Test-Path -LiteralPath $file) { $hashes[$file] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash } }
# 静默运行本次构建的用户级安装器；它不会自动启动应用或触发网络规则写入。
$process = Start-Process -FilePath $installer -ArgumentList '/S' -WindowStyle Hidden -PassThru
if (-not $process) { throw 'Installer did not return a process handle. Inspect installation before retrying.' }
if (-not $process.WaitForExit(60000)) { throw 'Installer is still running; inspect its state before retrying.' }
if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
$changed = @($hashes.Keys | Where-Object { -not (Test-Path -LiteralPath $_) -or (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash -ne $hashes[$_] })
if ($changed.Count) { throw "Upgrade changed $($changed.Count) protected data files; keep backups and investigate." }
$executable = Join-Path $env:LOCALAPPDATA 'Programs\AppRoute\AppRoute.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'Expected user-level installation was not found.' }
foreach ($relative in @('resources\app\backend.mjs', 'resources\app\main.cjs', 'resources\app\preload.cjs', 'resources\app\ui\index.html', 'resources\app\ui\build-info.json')) {
  $installed = Join-Path (Split-Path -Parent $executable) $relative
  $built = Join-Path (Join-Path $root 'release\AppRoute-win32-x64') $relative
  if ((Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $built -Algorithm SHA256).Hash) { throw 'Installed payload differs from the verified build.' }
}
$result = @{ installerExitCode = $process.ExitCode; protectedFiles = $hashes.Count; protectedFilesUnchanged = $true; payloadMatchesBuild = $true; executableFound = $true; checkedAt = [DateTime]::UtcNow.ToString('o') }
$output = Join-Path $root '.runtime\acceptance'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'installer-verification.json') -Encoding utf8
$result | ConvertTo-Json
