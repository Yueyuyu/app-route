$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# 只缩放、封装 render-app-icon.ps1 输出的深灰蓝桌面主图，不裁切或改色。
$projectRoot = Split-Path -Parent $PSScriptRoot
$brandDirectory = Join-Path $projectRoot 'public/brand'
$sourcePath = Join-Path $brandDirectory 'app-route.png'
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
$pngFrames = @{}
$iconSizes = @(16, 24, 32, 48, 64, 128, 256)
$pngSizes = @(32, 128, 180, 512)

try {
    if ($sourceImage.Width -ne $sourceImage.Height) {
        throw '已确认的原图必须为正方形。'
    }
    foreach ($size in (($iconSizes + $pngSizes) | Sort-Object -Unique)) {
        $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $stream = [System.IO.MemoryStream]::new()
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($sourceImage, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
            $pngFrames[$size] = $stream.ToArray()
            if ($size -in $pngSizes) {
                [System.IO.File]::WriteAllBytes((Join-Path $brandDirectory "app-route-$size.png"), $pngFrames[$size])
            }
        } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
            $stream.Dispose()
        }
    }
} finally {
    $sourceImage.Dispose()
}

# ICO 内嵌 PNG 帧，保留透明通道，适用于 Windows Vista 及后续版本。
$iconPath = Join-Path $projectRoot 'public/favicon.ico'
$iconStream = [System.IO.File]::Create($iconPath)
$writer = [System.IO.BinaryWriter]::new($iconStream)
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$iconSizes.Count)
    $offset = 6 + 16 * $iconSizes.Count
    foreach ($size in $iconSizes) {
        $dimensionByte = if ($size -eq 256) { 0 } else { $size }
        $writer.Write([byte]$dimensionByte)
        $writer.Write([byte]$dimensionByte)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$pngFrames[$size].Length)
        $writer.Write([uint32]$offset)
        $offset += $pngFrames[$size].Length
    }
    foreach ($size in $iconSizes) {
        $writer.Write([byte[]]$pngFrames[$size])
    }
} finally {
    $writer.Dispose()
    $iconStream.Dispose()
}
Write-Output '已导出 AppRoute PNG（32/128/180/512）和 ICO（16/24/32/48/64/128/256）。'
