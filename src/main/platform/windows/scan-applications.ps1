$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Drawing
$applications = @{}

function Add-Application([string]$displayName, [string]$executable, [string]$publisher) {
  if (-not $displayName -or -not $executable -or $executable -notmatch '\.exe$') { return }
  if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { return }
  $processName = [System.IO.Path]::GetFileName($executable)
  if ($processName -match '(?i)unins|uninstall|setup|installer|updater|crash|helper') { return }
  $key = $executable.ToLowerInvariant()
  if ($applications.ContainsKey($key)) { return }
  $iconData = $null
  $icon = $null
  $bitmap = $null
  $stream = $null
  try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($executable)
    if ($icon) {
      $bitmap = $icon.ToBitmap()
      $stream = New-Object System.IO.MemoryStream
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      $iconData = 'data:image/png;base64,' + [Convert]::ToBase64String($stream.ToArray())
    }
  } catch {
    $iconData = $null
  } finally {
    if ($stream) { $stream.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($icon) { $icon.Dispose() }
  }
  $applications[$key] = [PSCustomObject]@{
    id = $key; name = $displayName; processes = @($processName); path = $executable
    publisher = $publisher; icon = $iconData; source = 'scan'; mode = 'rule'; category = ''
  }
}

# 开始菜单快捷方式通常比安装登记更准确地指向主程序；不启动任何软件。
$shell = New-Object -ComObject WScript.Shell
$menus = @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('CommonPrograms'))
foreach ($menu in $menus) {
  foreach ($link in Get-ChildItem -LiteralPath $menu -Filter '*.lnk' -Recurse -File) {
    $shortcut = $shell.CreateShortcut($link.FullName)
    Add-Application $link.BaseName $shortcut.TargetPath ''
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
  if ($executable) { Add-Application $entry.DisplayName $executable $entry.Publisher }
}

# 补充有可见主窗口的便携应用，不读取或返回窗口标题。
foreach ($process in Get-Process) {
  if ($process.MainWindowHandle -eq 0 -or -not $process.Path) { continue }
  $displayName = $process.MainModule.FileVersionInfo.FileDescription
  if (-not $displayName) { $displayName = $process.ProcessName }
  Add-Application $displayName $process.Path $process.MainModule.FileVersionInfo.CompanyName
}
[System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) | Out-Null
$result = @($applications.Values | Sort-Object name)
ConvertTo-Json -InputObject $result -Depth 5 -Compress
