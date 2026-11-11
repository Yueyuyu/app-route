# 固定的本机资源读取；不执行目标程序。避免 ExtractAssociatedIcon 返回系统通用图标。
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AppRouteIconNative {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern int SHDefExtractIconW(string file, int index, uint flags, out IntPtr large, out IntPtr small, uint size);
  [DllImport("user32.dll")]
  public static extern bool DestroyIcon(IntPtr handle);
}
'@

function Read-ApplicationIcon([string]$resource) {
  if (-not $resource) { return $null }
  $resource = [Environment]::ExpandEnvironmentVariables($resource.Trim())
  $index = 0
  if ($resource -match '^"?(.+?)"?,\s*(-?\d+)$') { $resource = $matches[1]; $index = [int]$matches[2] }
  $resource = $resource.Trim('"')
  # 不读取 UNC 图标，避免扫描触发远端访问。
  if ($resource.StartsWith('\\') -or -not (Test-Path -LiteralPath $resource -PathType Leaf)) { return $null }
  $large = [IntPtr]::Zero; $small = [IntPtr]::Zero
  $bitmap = $null; $icon = $null; $stream = $null
  try {
    if ([System.IO.Path]::GetExtension($resource) -ieq '.png') {
      $bitmap = [System.Drawing.Bitmap]::new($resource)
      if ($bitmap.Width -gt 512 -or $bitmap.Height -gt 512) { return $null }
    } else {
      $result = [AppRouteIconNative]::SHDefExtractIconW($resource, $index, 0, [ref]$large, [ref]$small, 64)
      if ($result -ne 0 -or $large -eq [IntPtr]::Zero) { return $null }
      $icon = [System.Drawing.Icon]::FromHandle($large)
      $bitmap = $icon.ToBitmap()
    }
    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    return 'data:image/png;base64,' + [Convert]::ToBase64String($stream.ToArray())
  } catch { return $null }
  finally {
    if ($stream) { $stream.Dispose() }; if ($bitmap) { $bitmap.Dispose() }; if ($icon) { $icon.Dispose() }
    if ($large -ne [IntPtr]::Zero) { [AppRouteIconNative]::DestroyIcon($large) | Out-Null }
    if ($small -ne [IntPtr]::Zero) { [AppRouteIconNative]::DestroyIcon($small) | Out-Null }
  }
}
