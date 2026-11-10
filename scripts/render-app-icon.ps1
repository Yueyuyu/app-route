$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# 将已确认的 CSS 底板参数封装成透明 PNG；箭头沿用同一文件，不重新生成。
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'resources/brand/app-icon'
$spec = Get-Content -LiteralPath (Join-Path $assetDirectory 'approved.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$glyphPath = Join-Path $assetDirectory 'route-glyph.png'
# 不依赖 Get-FileHash 模块，兼容 npm 从其他 PowerShell 版本继承模块路径的情况。
function Get-AssetHash([string]$Path) {
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($algorithm.ComputeHash([System.IO.File]::ReadAllBytes($Path))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}
if ((Get-AssetHash $glyphPath) -ne $spec.glyphSha256) {
    throw '箭头文件与已确认的哈希不一致。'
}
$wordmarkPath = Join-Path $projectRoot 'public/brand/app-route-wordmark.png'
if ((Get-AssetHash $wordmarkPath) -ne $spec.wordmarkSha256) {
    throw '艺术字已变化，请先确认新的定稿；此脚本不修改艺术字。'
}

# 把同一箭头嵌入独立 SVG，避免 img 加载 SVG 时无法引用外部图片。
$glyphBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($glyphPath))
$inline = $spec.inline
$inset = $spec.glyphInsetRatio * 100
$contentPercent = 100 - $inset * 2
$inlineSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <svg x="$inset%" y="$inset%" width="$contentPercent%" height="$contentPercent%" viewBox="0 0 256 256" overflow="visible">
    <defs><filter id="contour" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="$($inline.outerRadius)" result="outer"/>
      <feGaussianBlur in="outer" stdDeviation="$($inline.edgeBlur)" result="edge"/>
      <feFlood flood-color="$($inline.rimColor)"/><feComposite in2="edge" operator="in" result="rim"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="$($inline.innerRadius)" result="inner"/>
      <feGaussianBlur in="inner" stdDeviation="$($inline.edgeBlur)" result="soft-inner"/>
      <feFlood flood-color="$($inline.fillColor)"/><feComposite in2="soft-inner" operator="in" result="enamel"/>
      <feMerge><feMergeNode in="rim"/><feMergeNode in="enamel"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs>
    <image href="data:image/png;base64,$glyphBase64" width="256" height="256" filter="url(#contour)"/>
  </svg>
</svg>
"@
[System.IO.File]::WriteAllText((Join-Path $projectRoot 'public/brand/app-route-inline.svg'), $inlineSvg, [System.Text.UTF8Encoding]::new($false))
$desktop = $spec.desktop

$size = 1024
$bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$glyph = [System.Drawing.Image]::FromFile($glyphPath)
$plate = [System.Drawing.Drawing2D.GraphicsPath]::new()
$gradient = $null
$rim = $null
$shiftedPlate = $null
$transform = $null
try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $diameter = [single]($size * $desktop.cornerRadiusRatio * 2)
    $far = [single]($size - $diameter)
    $plate.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $plate.AddArc($far, 0, $diameter, $diameter, 270, 90)
    $plate.AddArc($far, $far, $diameter, $diameter, 0, 90)
    $plate.AddArc(0, $far, $diameter, $diameter, 90, 90)
    $plate.CloseFigure()

    # CSS 的 0 度朝上、90 度朝右；按正方形投影长度还原 145 度渐变。
    $radians = $desktop.gradientAngleDegrees * [Math]::PI / 180
    $directionX = [Math]::Sin($radians)
    $directionY = -[Math]::Cos($radians)
    $length = $size * ([Math]::Abs($directionX) + [Math]::Abs($directionY))
    $start = [System.Drawing.PointF]::new(($size - $directionX * $length) / 2, ($size - $directionY * $length) / 2)
    $end = [System.Drawing.PointF]::new(($size + $directionX * $length) / 2, ($size + $directionY * $length) / 2)
    $colors = @($desktop.gradientStops | ForEach-Object { [System.Drawing.ColorTranslator]::FromHtml($_.color) })
    $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new($start, $end, $colors[0], $colors[-1])
    $blend = [System.Drawing.Drawing2D.ColorBlend]::new($colors.Count)
    $blend.Colors = [System.Drawing.Color[]]$colors
    $blend.Positions = [single[]]@($desktop.gradientStops | ForEach-Object { $_.position })
    $gradient.InterpolationColors = $blend
    $graphics.FillPath($gradient, $plate)

    # 对应预览 inset 0 1px 0 #435266；外投影由页面或桌面背景承载，不烘焙进透明外角。
    $shiftedPlate = $plate.Clone()
    $transform = [System.Drawing.Drawing2D.Matrix]::new()
    $transform.Translate(0, [single]($size / 118))
    $shiftedPlate.Transform($transform)
    $graphics.SetClip($plate)
    $graphics.SetClip($shiftedPlate, [System.Drawing.Drawing2D.CombineMode]::Exclude)
    $rim = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($desktop.insetRimColor))
    $graphics.FillPath($rim, $plate)
    $graphics.ResetClip()

    $padding = [single]($size * $spec.glyphInsetRatio)
    $content = [single]($size - $padding * 2)
    $graphics.DrawImage($glyph, [System.Drawing.RectangleF]::new($padding, $padding, $content, $content))
    $bitmap.Save((Join-Path $projectRoot 'public/brand/app-route.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    if ($transform) { $transform.Dispose() }
    if ($shiftedPlate) { $shiftedPlate.Dispose() }
    if ($rim) { $rim.Dispose() }
    if ($gradient) { $gradient.Dispose() }
    $plate.Dispose()
    $glyph.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}
Write-Output '已导出应用内随形 SVG 和桌面深灰蓝 1024px 主图；艺术字未修改。'
