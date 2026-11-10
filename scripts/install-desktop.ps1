$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'release\AppRoute-win32-x64'
$destination = Join-Path $env:LOCALAPPDATA 'Programs\AppRoute'
$executable = Join-Path $destination 'AppRoute.exe'
if (-not (Test-Path -LiteralPath (Join-Path $source 'AppRoute.exe'))) { throw 'Build the desktop package first.' }
# 安装前只检查自己的目标路径，不结束任何现有进程。
if (Get-Process -Name AppRoute -ErrorAction SilentlyContinue | Where-Object { -not $_.Path -or $_.Path -eq $executable }) { throw 'Please exit AppRoute from its tray before updating.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Get-ChildItem -LiteralPath $source -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force }
if (-not (Test-Path -LiteralPath $executable)) { throw 'Desktop executable was not installed.' }
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AppRoute.lnk'
$startLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'AppRoute.lnk'
$shell = New-Object -ComObject WScript.Shell
foreach ($linkPath in @($desktopLink, $startLink)) {
  if (Test-Path -LiteralPath $linkPath) {
    $backup = Join-Path $root '.runtime\desktop-shortcut-backup'
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    Copy-Item -LiteralPath $linkPath -Destination (Join-Path $backup (([guid]::NewGuid().ToString()) + '.lnk'))
  }
  $link = $shell.CreateShortcut($linkPath)
  $link.TargetPath = $executable
  $link.WorkingDirectory = $destination
  $link.IconLocation = (Join-Path $destination 'resources\app\ui\favicon.ico')
  $link.Description = 'AppRoute desktop application'
  $link.Save()
}
[System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) | Out-Null
Write-Output 'AppRoute desktop installed; shortcuts now open AppRoute.exe.'
