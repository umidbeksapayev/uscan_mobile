# Kadr-u belgisidan ilova ikonkalarini chizadi (Windows GDI+, qo'shimcha paket
# kerak emas). Ishlatish:
#
#   powershell -File scripts/make-icons.ps1 assets/images
#
# Geometriya `src/components/logo.tsx` dagi `LogoMark` SVG'si bilan AYNAN bir
# xil (viewBox 64x64) — belgi o'zgarsa IKKALASI ham yangilanishi shart, aks
# holda ilova ichidagi logo va ilova ikonkasi bir-biridan farq qila boshlaydi
# (aynan shu farq oldin ikkita identifikatsiya paydo bo'lishiga olib kelgan).
#
# Fon rasmi (`android-icon-background.png`) bu skriptga kirmaydi — u ochiq ko'k
# "chizma" fon, o'zgarishsiz qoladi.
Add-Type -AssemblyName System.Drawing

$Out = $args[0]
if (-not $Out) { throw "chiqish papkasi kerak" }
New-Item -ItemType Directory -Force $Out | Out-Null

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

function Draw-Mark {
  param(
    [int]$Size,
    [double]$Scale,          # belgi kanvasning necha ulushini egallaydi
    [string]$Frame,          # kadr burchaklari rangi
    [string]$Letter,         # "u" rangi
    [string]$Beam,           # skaner chizig'i rangi
    [string]$Grad1 = $null,  # fon gradienti (bo'sh = shaffof)
    [string]$Grad2 = $null,
    [string]$File
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($Grad1) {
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, (C $Grad1), (C $Grad2), 45.0)
    $g.FillRectangle($brush, $rect)
    $brush.Dispose()
  }

  # 64x64 koordinata tizimiga o'tamiz
  $markPx = $Size * $Scale
  $g.TranslateTransform([single](($Size - $markPx) / 2), [single](($Size - $markPx) / 2))
  $g.ScaleTransform([single]($markPx / 64), [single]($markPx / 64))

  # --- kadr burchaklari (stroke 6, dumaloq uch) ---
  $pen = New-Object System.Drawing.Pen((C $Frame), 6)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $tl = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tl.AddLine(5, 21, 5, 13); $tl.AddArc(5, 5, 16, 16, 180, 90); $tl.AddLine(13, 5, 21, 5)
  $tr = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tr.AddLine(43, 5, 51, 5); $tr.AddArc(43, 5, 16, 16, 270, 90); $tr.AddLine(59, 13, 59, 21)
  $br = New-Object System.Drawing.Drawing2D.GraphicsPath
  $br.AddLine(59, 43, 59, 51); $br.AddArc(43, 43, 16, 16, 0, 90); $br.AddLine(51, 59, 43, 59)
  $bl = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bl.AddLine(21, 59, 13, 59); $bl.AddArc(5, 43, 16, 16, 90, 90); $bl.AddLine(5, 51, 5, 43)
  foreach ($p in @($tl, $tr, $br, $bl)) { $g.DrawPath($pen, $p); $p.Dispose() }
  $pen.Dispose()

  # --- skaner chizig'i (dumaloq uchli 4 px chiziq = rx 2 li rect) ---
  $penBeam = New-Object System.Drawing.Pen((C $Beam), 4)
  $penBeam.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penBeam.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($penBeam, 22, 20, 42, 20)
  $penBeam.Dispose()

  # --- "u" ---
  $penU = New-Object System.Drawing.Pen((C $Letter), 7)
  $penU.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penU.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penU.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $u = New-Object System.Drawing.Drawing2D.GraphicsPath
  $u.AddLine(41, 29, 41, 35); $u.AddArc(23, 26, 18, 18, 0, 180); $u.AddLine(23, 35, 23, 29)
  $g.DrawPath($penU, $u)
  $u.Dispose(); $penU.Dispose()

  $g.Dispose()
  $path = Join-Path $Out $File
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  "{0}  ({1}x{1})" -f $File, $Size
}

# 1. Do'kon/iOS ikonkasi — brend gradienti + oq belgi
Draw-Mark -Size 1024 -Scale 0.60 -Frame "#FFFFFF" -Letter "#FFFFFF" -Beam "#BBD8FB" `
          -Grad1 "#2F80ED" -Grad2 "#0F3D6E" -File "icon.png"

# 2. Android adaptiv oldingi qatlam — shaffof, brend ranglarida
#    (fon rasmi ochiq ko'k "chizma" — o'zgarmaydi). Xavfsiz doira ichida turishi
#    uchun belgi kanvasning 46% ini egallaydi.
Draw-Mark -Size 1024 -Scale 0.46 -Frame "#0F3D6E" -Letter "#2F80ED" -Beam "#7DB4F5" `
          -File "android-icon-foreground.png"

# 3. Monoxrom qatlam — tizim o'zi bo'yaydi, faqat shakl muhim
Draw-Mark -Size 1024 -Scale 0.46 -Frame "#FFFFFF" -Letter "#FFFFFF" -Beam "#FFFFFF" `
          -File "android-icon-monochrome.png"

# 4. Splash — foni to'q navy (#0F3D6E) / tungi (#0F172A), shuning uchun oq belgi
Draw-Mark -Size 512 -Scale 0.86 -Frame "#FFFFFF" -Letter "#FFFFFF" -Beam "#BBD8FB" `
          -File "splash-icon.png"

# 5. Web favicon
Draw-Mark -Size 96 -Scale 0.70 -Frame "#FFFFFF" -Letter "#FFFFFF" -Beam "#BBD8FB" `
          -Grad1 "#2F80ED" -Grad2 "#0F3D6E" -File "favicon.png"
