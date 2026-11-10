$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'extract-application-icon.ps1')
$applications = @{}
$scanWarnings = @()

function Add-Application([string]$displayName, [string]$executable, [string]$publisher, [string]$iconResource = '', [string]$iconMethod = 'executable', [string]$discovery = 'installed') {
  if (-not $displayName -or -not $executable -or $executable -notmatch '\.exe$') { return }
  if ($executable.StartsWith('\\') -or -not (Test-Path -LiteralPath $executable -PathType Leaf)) { return }
  $processName = [System.IO.Path]::GetFileName($executable)
  if ($processName -match '(?i)unins|uninstall|setup|installer|updater|crash|helper') { return }
  # 共享系统宿主不是独立应用，不能把宿主当作商店应用的进程身份。
  if ($processName -match '^(?i:ApplicationFrameHost|TextInputHost|RuntimeBroker)\.exe$') { return }
  $key = $executable.ToLowerInvariant()
  if ($applications.ContainsKey($key) -and $applications[$key].icon) { return }
  $iconData = Read-ApplicationIcon $iconResource
  if (-not $iconData) { $iconData = Read-ApplicationIcon $executable; $iconMethod = 'executable' }
  # 部分工具把图标放在同目录的 UI 资源 DLL，而非启动 EXE。
  if (-not $iconData) {
    $uiResource = Join-Path ([System.IO.Path]::GetDirectoryName($executable)) ([System.IO.Path]::GetFileNameWithoutExtension($executable) + 'UI.dll')
    $iconData = Read-ApplicationIcon $uiResource
    if (-not $iconData -and $processName -ieq 'appverif.exe' -and $executable.StartsWith($env:WINDIR, [StringComparison]::OrdinalIgnoreCase)) {
      $iconData = Read-ApplicationIcon (Join-Path $env:WINDIR 'System32/appverifUI.dll')
    }
  }
  $applications[$key] = [PSCustomObject]@{
    id = $key; name = $displayName; processes = @($processName); path = $executable
    publisher = $publisher; discovery = $discovery; icon = $iconData; iconMethod = $iconMethod; source = 'scan'; mode = 'rule'; category = ''
  }
}

# 开始菜单快捷方式通常比安装登记更准确地指向主程序；不启动任何软件。
$shell = New-Object -ComObject WScript.Shell
$menus = @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('CommonPrograms'))
foreach ($menu in $menus) {
  foreach ($link in Get-ChildItem -LiteralPath $menu -Filter '*.lnk' -Recurse -File) {
    $shortcut = $shell.CreateShortcut($link.FullName)
    Add-Application $link.BaseName $shortcut.TargetPath '' $shortcut.IconLocation 'shortcut'
  }
}

$registryPaths = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($entry in Get-ItemProperty $registryPaths) {
  if (-not $entry.DisplayName -or $entry.SystemComponent -eq 1) { continue }
  $rawIcon = [Environment]::ExpandEnvironmentVariables([string]$entry.DisplayIcon)
  $executable = $null
  if ($rawIcon -match '^"?(.+?\.exe)"?(?:,\s*-?\d+)?$') { $executable = $matches[1] }
  if ($executable) { Add-Application $entry.DisplayName $executable $entry.Publisher $rawIcon 'registry' }
}

# 补充有可见主窗口的便携应用，不读取或返回窗口标题。
foreach ($process in Get-Process) {
  if ($process.MainWindowHandle -eq 0 -or -not $process.Path) { continue }
  $displayName = $process.MainModule.FileVersionInfo.FileDescription
  if (-not $displayName) { $displayName = $process.ProcessName }
  Add-Application $displayName $process.Path $process.MainModule.FileVersionInfo.CompanyName '' 'executable' 'running'
}
[System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) | Out-Null

# 商店应用按开始菜单 AUMID 与清单关联，不枚举受保护目录、不启用管理员权限。
try {
  $startApps = @{}
  foreach ($app in Get-StartApps -ErrorAction Stop) { $startApps[$app.AppID] = $app.Name }
  foreach ($package in Get-AppxPackage -ErrorAction Stop) {
    if (-not $package.InstallLocation -or $package.IsFramework -or $package.IsResourcePackage) { continue }
    try {
      $manifest = Get-AppxPackageManifest -Package $package.PackageFullName -ErrorAction Stop
      foreach ($app in $manifest.Package.Applications.Application) {
        $appName = $startApps[($package.PackageFamilyName + '!' + $app.Id)]
        if (-not $appName -or -not $app.Executable) { continue }
        $executable = Join-Path $package.InstallLocation $app.Executable
        $logo = [string]$app.VisualElements.Square44x44Logo
        $iconPath = ''
        if ($logo) {
          $basePath = Join-Path $package.InstallLocation $logo
          $directory = Split-Path -Parent $basePath
          $stem = [System.IO.Path]::GetFileNameWithoutExtension($basePath)
          $candidates = @(Get-ChildItem -LiteralPath $directory -Filter ($stem + '*.png') -File | Sort-Object @{ Expression = { if ($_.Name -match 'targetsize-64') { 0 } elseif ($_.Name -match 'targetsize-256') { 1 } elseif ($_.Name -match 'scale-200') { 2 } else { 3 } } }, Name)
          if ($candidates.Count) { $iconPath = $candidates[0].FullName }
        }
        Add-Application $appName $executable $package.PublisherDisplayName $iconPath 'package'
      }
    } catch { $scanWarnings += '部分商店应用的清单无法读取。' }
  }
} catch { $scanWarnings += '商店应用扫描不可用，已保留其他扫描结果。' }
$result = @($applications.Values | Sort-Object name)
ConvertTo-Json -InputObject @{ applications = $result; warnings = @($scanWarnings | Select-Object -Unique) } -Depth 5 -Compress
