Add-Type -AssemblyName System.Drawing

$sourcePath = "d:\BestBill-Offline\frontend\public\logo.png"
if (!(Test-Path $sourcePath)) {
    Write-Error "Source logo.png not found at $sourcePath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($sourcePath)

$resDir = "d:\BestBill-Admin\android\app\src\main\res"

$densities = @(
    @{ folder = "mipmap-mdpi";    iconSize = 48;  fgSize = 108 },
    @{ folder = "mipmap-hdpi";    iconSize = 72;  fgSize = 162 },
    @{ folder = "mipmap-xhdpi";   iconSize = 96;  fgSize = 216 },
    @{ folder = "mipmap-xxhdpi";  iconSize = 144; fgSize = 324 },
    @{ folder = "mipmap-xxxhdpi"; iconSize = 192; fgSize = 432 }
)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [int]$DrawWidth = $Width,
        [int]$DrawHeight = $Height,
        [int]$OffsetX = 0,
        [int]$OffsetY = 0
    )
    $destBitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($destBitmap)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($Image, $OffsetX, $OffsetY, $DrawWidth, $DrawHeight)
    $g.Dispose()
    return $destBitmap
}

foreach ($d in $densities) {
    $targetFolder = Join-Path $resDir $d.folder
    if (!(Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }

    # 1. ic_launcher.png (Full size icon for legacy launchers)
    $bmpIcon = Resize-Image -Image $srcImage -Width $d.iconSize -Height $d.iconSize
    $bmpIcon.Save((Join-Path $targetFolder "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpIcon.Dispose()

    # 2. ic_launcher_round.png
    $bmpRound = Resize-Image -Image $srcImage -Width $d.iconSize -Height $d.iconSize
    $bmpRound.Save((Join-Path $targetFolder "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()

    # 3. ic_launcher_foreground.png (Adaptive icon foreground with padding for safe zone)
    $innerSize = [int]($d.fgSize * 0.72)
    $offset = [int](($d.fgSize - $innerSize) / 2)
    $bmpFg = Resize-Image -Image $srcImage -Width $d.fgSize -Height $d.fgSize -DrawWidth $innerSize -DrawHeight $innerSize -OffsetX $offset -OffsetY $offset
    $bmpFg.Save((Join-Path $targetFolder "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Host "Generated icons for $($d.folder)"
}

$srcImage.Dispose()
Write-Host "All Android app icons updated successfully!"
