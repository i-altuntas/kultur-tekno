# Kültür Tekno başlatıcı ikonu (.ico) üretir ve tıklanabilir kısayol (.lnk) oluşturur.
# Kısayollar: proje kökü ve Masaüstü. Yeniden çalıştırmak güvenlidir (üzerine yazar).

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $root "launcher.vbs"
$wscript = Join-Path $env:WINDIR "System32\wscript.exe"
$assets  = Join-Path $root "assets"
$icoPath = Join-Path $assets "kultur-tekno.ico"
New-Item -ItemType Directory -Force -Path $assets | Out-Null

# --- İkonu çiz: koyu gri zemin, cyan kenar, "KT" yazısı ---
$size = 128
$bmp  = New-Object System.Drawing.Bitmap $size, $size
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# zemin
$g.Clear([System.Drawing.Color]::FromArgb(52, 55, 62))

# cyan çerçeve
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(0, 240, 255)), 6
$g.DrawRectangle($pen, 7, 7, ($size - 15), ($size - 15))

# "KT" metni
$font  = New-Object System.Drawing.Font "Segoe UI", 52, ([System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 240, 255))
$sf    = New-Object System.Drawing.StringFormat
$sf.Alignment     = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, -4, $size, $size
$g.DrawString("KT", $font, $brush, $rect, $sf)
$g.Dispose()

# .ico olarak kaydet
$hicon = $bmp.GetHicon()
$icon  = [System.Drawing.Icon]::FromHandle($hicon)
$fs    = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$bmp.Dispose()
Write-Host "Ikon olusturuldu: $icoPath"

# --- Kısayolları oluştur ---
function New-Shortcut($lnkPath) {
  $ws = New-Object -ComObject WScript.Shell
  $sc = $ws.CreateShortcut($lnkPath)
  $sc.TargetPath       = $wscript
  $sc.Arguments        = '"' + $vbsPath + '"'
  $sc.WorkingDirectory = $root
  $sc.IconLocation     = "$icoPath,0"
  $sc.Description      = "Kültür Tekno başlatıcı arayüzünü aç"
  $sc.Save()
  Write-Host "Kisayol olusturuldu: $lnkPath"
}

New-Shortcut (Join-Path $root "Kültür Tekno.lnk")

$desktop = [Environment]::GetFolderPath("Desktop")
if ($desktop -and (Test-Path $desktop)) {
  New-Shortcut (Join-Path $desktop "Kültür Tekno.lnk")
}

Write-Host "Tamam."
