# Kültür Tekno — grafik başlatıcı.
# Aşamaları canlı gösterir, gerektiğinde tıklama ister, sonunda tarayıcıda açar.
# Windows PowerShell (STA) ile çalışır; launcher.vbs bunu gizli başlatır.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root = $PSScriptRoot

# ---- yollar ----
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) { $nodeExe = 'C:\Program Files\nodejs\node.exe' }
$icoPath = Join-Path $root 'assets\kultur-tekno.ico'
$viteBin = Join-Path $root 'client\node_modules\vite\bin\vite.js'
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'

# ---- renkler ----
$cBg   = [Drawing.Color]::FromArgb(52,55,62)
$cPanel= [Drawing.Color]::FromArgb(40,43,50)
$cTxt  = [Drawing.Color]::FromArgb(238,241,246)
$cMut  = [Drawing.Color]::FromArgb(150,157,170)
$cCyan = [Drawing.Color]::FromArgb(0,240,255)
$cLime = [Drawing.Color]::FromArgb(182,255,59)
$cRed  = [Drawing.Color]::FromArgb(255,107,107)

# ---- form ----
$form = New-Object Windows.Forms.Form
$form.Text = 'Kültür Tekno — Başlatıcı'
$form.ClientSize = New-Object Drawing.Size(560,540)
$form.StartPosition = 'CenterScreen'
$form.BackColor = $cBg
$form.ForeColor = $cTxt
$form.Font = New-Object Drawing.Font('Segoe UI',10)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
if (Test-Path $icoPath) { try { $form.Icon = New-Object Drawing.Icon($icoPath) } catch {} }

$title = New-Object Windows.Forms.Label
$title.Text = 'KÜLTÜR TEKNO'
$title.Font = New-Object Drawing.Font('Segoe UI',20,[Drawing.FontStyle]::Bold)
$title.ForeColor = $cCyan
$title.AutoSize = $true
$title.Location = New-Object Drawing.Point(24,18)
$form.Controls.Add($title)

$sub = New-Object Windows.Forms.Label
$sub.Text = '// başlatılıyor'
$sub.ForeColor = $cMut
$sub.AutoSize = $true
$sub.Location = New-Object Drawing.Point(27,58)
$form.Controls.Add($sub)

# ---- aşama etiketleri ----
$stepTexts = @(
  'PostgreSQL bağlantısı (5432)',
  'API sunucusu (4000)',
  'Web arayüzü (5173)',
  'Tarayıcıda açmaya hazır'
)
$stepLbls = @()
for ($i=0; $i -lt $stepTexts.Count; $i++) {
  $l = New-Object Windows.Forms.Label
  $l.AutoSize = $true
  $l.Font = New-Object Drawing.Font('Segoe UI',11)
  $l.ForeColor = $cMut
  $l.Location = New-Object Drawing.Point(28, (96 + $i*30))
  $l.Text = ([char]0x25A1 + '  ' + $stepTexts[$i])
  $form.Controls.Add($l)
  $stepLbls += $l
}

# ---- ilerleme çubuğu ----
$pb = New-Object Windows.Forms.ProgressBar
$pb.Location = New-Object Drawing.Point(28,228)
$pb.Size = New-Object Drawing.Size(504,14)
$pb.Style = 'Marquee'
$pb.MarqueeAnimationSpeed = 30
$form.Controls.Add($pb)

# ---- günlük kutusu ----
$rtb = New-Object Windows.Forms.RichTextBox
$rtb.Location = New-Object Drawing.Point(28,256)
$rtb.Size = New-Object Drawing.Size(504,190)
$rtb.BackColor = $cPanel
$rtb.ForeColor = $cTxt
$rtb.BorderStyle = 'None'
$rtb.ReadOnly = $true
$rtb.Font = New-Object Drawing.Font('Consolas',9)
$form.Controls.Add($rtb)

# ---- butonlar ----
$btnOpen = New-Object Windows.Forms.Button
$btnOpen.Text = 'Tarayıcıda Aç'
$btnOpen.Size = New-Object Drawing.Size(180,40)
$btnOpen.Location = New-Object Drawing.Point(28,466)
$btnOpen.FlatStyle = 'Flat'
$btnOpen.BackColor = $cBg
$btnOpen.ForeColor = $cMut
$btnOpen.Enabled = $false
$btnOpen.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(77,81,92)
$form.Controls.Add($btnOpen)

$btnStop = New-Object Windows.Forms.Button
$btnStop.Text = 'Sunucuları Durdur'
$btnStop.Size = New-Object Drawing.Size(170,40)
$btnStop.Location = New-Object Drawing.Point(222,466)
$btnStop.FlatStyle = 'Flat'
$btnStop.BackColor = $cBg
$btnStop.ForeColor = $cTxt
$btnStop.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(255,107,107)
$form.Controls.Add($btnStop)

$btnClose = New-Object Windows.Forms.Button
$btnClose.Text = 'Kapat'
$btnClose.Size = New-Object Drawing.Size(110,40)
$btnClose.Location = New-Object Drawing.Point(422,466)
$btnClose.FlatStyle = 'Flat'
$btnClose.BackColor = $cBg
$btnClose.ForeColor = $cTxt
$btnClose.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(77,81,92)
$form.Controls.Add($btnClose)

$url = 'http://localhost:5173/'

# ===== yardımcılar =====
function Log($msg,$col) {
  if (-not $col) { $col = $cTxt }
  $rtb.SelectionStart = $rtb.TextLength
  $rtb.SelectionLength = 0
  $rtb.SelectionColor = $col
  $rtb.AppendText((Get-Date -Format 'HH:mm:ss') + '  ' + $msg + "`r`n")
  $rtb.ScrollToCaret()
  [Windows.Forms.Application]::DoEvents()
}

function Set-Step($i,$state) {
  $l = $stepLbls[$i]; $t = $stepTexts[$i]
  switch ($state) {
    'run' { $l.ForeColor = $cCyan; $l.Text = ([char]0x00BB + '  ' + $t + '  …') }
    'ok'  { $l.ForeColor = $cLime; $l.Text = ([char]0x2713 + '  ' + $t) }
    'err' { $l.ForeColor = $cRed;  $l.Text = ([char]0x2717 + '  ' + $t) }
    default { $l.ForeColor = $cMut; $l.Text = ([char]0x25A1 + '  ' + $t) }
  }
  [Windows.Forms.Application]::DoEvents()
}

function Test-Port($p) {
  try {
    $c = New-Object Net.Sockets.TcpClient
    $iar = $c.BeginConnect('127.0.0.1',$p,$null,$null)
    $ok = $iar.AsyncWaitHandle.WaitOne(600)
    if ($ok -and $c.Connected) { $c.Close(); return $true }
    $c.Close(); return $false
  } catch { return $false }
}

function Wait-Url($u,$timeoutSec) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $u | Out-Null; return $true } catch {}
    Start-Sleep -Milliseconds 400
    [Windows.Forms.Application]::DoEvents()
  }
  return $false
}

function Start-Hidden($file,$arguments,$wd) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $file
  $psi.Arguments = $arguments
  $psi.WorkingDirectory = $wd
  $psi.UseShellExecute = $true
  $psi.WindowStyle = 'Hidden'
  return [Diagnostics.Process]::Start($psi)
}

function Stop-Port($p) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    return $true
  } catch { return $false }
}

function Ready-State {
  $pb.Style = 'Continuous'; $pb.Value = 100
  $sub.Text = '// hazır'
  $btnOpen.Enabled = $true
  $btnOpen.BackColor = $cCyan
  $btnOpen.ForeColor = [Drawing.Color]::Black
  $btnOpen.Font = New-Object Drawing.Font('Segoe UI',10,[Drawing.FontStyle]::Bold)
  $btnOpen.FlatAppearance.BorderColor = $cCyan
  Log ''
  Log ('>> Hazir! "Tarayici' + [char]0x0064 + 'a Ac" dugmesine tiklayin.') $cLime
}

# ===== başlatma akışı =====
function Start-Sequence {
  Log 'Kültür Tekno başlatılıyor…' $cCyan

  # 1) PostgreSQL
  Set-Step 0 'run'; Log 'PostgreSQL kontrol ediliyor (port 5432)…'
  if (Test-Port 5432) {
    Set-Step 0 'ok'; Log 'PostgreSQL çalışıyor.' $cLime
  } else {
    Set-Step 0 'err'; Log 'PostgreSQL 5432 portunda bulunamadı.' $cRed
    $r = [Windows.Forms.MessageBox]::Show(
      "PostgreSQL'e (5432) bağlanılamadı. Servis kapalı olabilir.`n`nYine de devam edilsin mi?",
      'PostgreSQL bulunamadı',
      [Windows.Forms.MessageBoxButtons]::YesNo,
      [Windows.Forms.MessageBoxIcon]::Warning)
    if ($r -ne [Windows.Forms.DialogResult]::Yes) {
      Log 'İptal edildi.' $cRed; $pb.Style='Continuous'; $pb.Value=0; return
    }
    Log 'Kullanıcı devam etmeyi seçti.' $cMut
  }

  # 2) API
  Set-Step 1 'run'
  if (Test-Port 4000) {
    Log 'API zaten çalışıyor (4000).' $cLime; Set-Step 1 'ok'
  } else {
    Log 'API sunucusu başlatılıyor…'
    try {
      $script:apiProc = Start-Hidden $nodeExe 'index.js' $serverDir
      if (Wait-Url 'http://localhost:4000/api/health' 30) {
        Set-Step 1 'ok'; Log 'API hazır → http://localhost:4000' $cLime
      } else {
        Set-Step 1 'err'; Log 'API 30 sn içinde yanıt vermedi.' $cRed
        [Windows.Forms.MessageBox]::Show("API başlatılamadı. 'server' klasöründe 'npm install' yapıldı mı ve .env şifresi doğru mu?",'API hatası') | Out-Null
        $pb.Style='Continuous'; $pb.Value=0; return
      }
    } catch {
      Set-Step 1 'err'; Log ('Hata: ' + $_.Exception.Message) $cRed; return
    }
  }

  # 3) Web
  Set-Step 2 'run'
  if (Test-Port 5173) {
    Log 'Web arayüzü zaten çalışıyor (5173).' $cLime; Set-Step 2 'ok'
  } else {
    Log 'Web arayüzü başlatılıyor (Vite)…'
    try {
      $script:webProc = Start-Hidden $nodeExe ('"' + $viteBin + '"') $clientDir
      if (Wait-Url $url 45) {
        Set-Step 2 'ok'; Log 'Web arayüzü hazır → http://localhost:5173' $cLime
      } else {
        Set-Step 2 'err'; Log 'Web arayüzü 45 sn içinde yanıt vermedi.' $cRed
        [Windows.Forms.MessageBox]::Show("Web arayüzü başlatılamadı. 'client' klasöründe 'npm install' yapıldı mı?",'Arayüz hatası') | Out-Null
        $pb.Style='Continuous'; $pb.Value=0; return
      }
    } catch {
      Set-Step 2 'err'; Log ('Hata: ' + $_.Exception.Message) $cRed; return
    }
  }

  # 4) Hazır — tarayıcıda açmak için tıklama iste
  Set-Step 3 'ok'
  Ready-State
}

# ===== olaylar =====
$btnOpen.Add_Click({
  Log ('Tarayıcıda açılıyor: ' + $url) $cCyan
  Start-Process $url
})

$btnStop.Add_Click({
  $r = [Windows.Forms.MessageBox]::Show(
    "API (4000) ve Web (5173) sunucuları durdurulsun mu?",
    'Sunucuları durdur',
    [Windows.Forms.MessageBoxButtons]::YesNo,
    [Windows.Forms.MessageBoxIcon]::Question)
  if ($r -eq [Windows.Forms.DialogResult]::Yes) {
    Stop-Port 5173 | Out-Null
    Stop-Port 4000 | Out-Null
    Log 'Sunucular durduruldu.' $cRed
    Set-Step 1 'idle'; Set-Step 2 'idle'; Set-Step 3 'idle'
    $btnOpen.Enabled = $false; $btnOpen.BackColor = $cBg; $btnOpen.ForeColor = $cMut
    $pb.Value = 0
  }
})

$btnClose.Add_Click({ $form.Close() })

$form.Add_Shown({
  $script:timer = New-Object Windows.Forms.Timer
  $script:timer.Interval = 300
  $script:timer.Add_Tick({ $script:timer.Stop(); Start-Sequence })
  $script:timer.Start()
})

[void]$form.ShowDialog()
