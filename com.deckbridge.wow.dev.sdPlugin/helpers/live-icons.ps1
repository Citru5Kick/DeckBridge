# DEV only. Cached marker sampling; periodic discovery. No images saved or sent.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path (Join-Path $PSScriptRoot 'live-reader.cs')
[DeckBridgeDevReaderLease]::Start([Console]::In)
[void][DeckBridgeDevScreen]::SetThreadDpiAwarenessContext([IntPtr](-4))
$nextDiscovery = [datetime]::MinValue
$lastWindow = [IntPtr]::Zero
$lastWidth = 0
$lastHeight = 0
$trackedGameId = 0
$trackedGameStart = 0
function Test-DeckBridgeGamePresent([int]$TrackedId, [long]$TrackedStart) {
  $processes = if ($TrackedId -gt 0) {
    @(Get-Process -Id $TrackedId -ErrorAction SilentlyContinue)
  } else {
    @(Get-Process -Name 'Wow','WowB','WowT','Wow-64','WowB-64','WowT-64' -ErrorAction SilentlyContinue)
  }
  try {
    foreach ($candidate in $processes) {
      try {
        if ($candidate.ProcessName -notmatch '^Wow(?:B|T)?(?:-64)?$' -or $candidate.HasExited) { continue }
        if ($TrackedStart -gt 0 -and $candidate.StartTime.ToUniversalTime().Ticks -ne $TrackedStart) { continue }
        return $true
      } catch { continue } # A process may exit while it is being inspected.
    }
    return $false
  } finally { foreach ($candidate in $processes) { $candidate.Dispose() } }
}
while ([DeckBridgeDevReaderLease]::Valid) {
  $bitmap = $null
  $graphics = $null
  $game = $null
  try {
    # This check is independent of foreground focus: Alt+Tab is not a game exit.
    if (-not (Test-DeckBridgeGamePresent $trackedGameId $trackedGameStart)) {
      [Console]::Out.WriteLine('DBREADER_GAME_EXITED')
      [Console]::Out.Flush()
      break
    }
    $window = [DeckBridgeDevScreen]::GetForegroundWindow()
    [uint32]$windowProcess = 0
    [void][DeckBridgeDevScreen]::GetWindowThreadProcessId($window, [ref]$windowProcess)
    $game = Get-Process -Id $windowProcess -ErrorAction SilentlyContinue
    if ($game -and $game.ProcessName -match '^Wow(?:B|T)?(?:-64)?$' -and ($trackedGameId -eq 0 -or $windowProcess -eq $trackedGameId)) {
      if ($trackedGameId -eq 0) {
        $trackedGameId = $windowProcess
        $trackedGameStart = $game.StartTime.ToUniversalTime().Ticks
      }
      $origin = New-Object DeckBridgeDevScreen+POINT
      $rect = New-Object DeckBridgeDevScreen+RECT
      if ([DeckBridgeDevScreen]::ClientToScreen($window, [ref]$origin) -and
          [DeckBridgeDevScreen]::GetClientRect($window, [ref]$rect) -and $rect.Right -gt 0 -and $rect.Bottom -gt 0 -and
          $rect.Right -le 8192 -and $rect.Bottom -le 8192 -and ([long]$rect.Right * $rect.Bottom) -le 16777216) {
        if ($lastWindow -ne $window -or $lastWidth -ne $rect.Right -or $lastHeight -ne $rect.Bottom) {
          [DeckBridgeDevScreen]::Reset()
          $nextDiscovery = [datetime]::MinValue
          $lastWindow = $window; $lastWidth = $rect.Right; $lastHeight = $rect.Bottom
        }
        $discover = [datetime]::UtcNow -ge $nextDiscovery
        if ($discover) {
          $area = New-Object System.Drawing.Rectangle(0, 0, $rect.Right, $rect.Bottom)
          $nextDiscovery = [datetime]::UtcNow.AddSeconds(5)
        } else { $area = [DeckBridgeDevScreen]::Bounds($rect.Right, $rect.Bottom) }
        if (-not $area.IsEmpty) {
          if (-not [DeckBridgeDevReaderLease]::Valid) { break }
          $bitmap = New-Object System.Drawing.Bitmap($area.Width, $area.Height)
          $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
          $graphics.CopyFromScreen(($origin.X + $area.X), ($origin.Y + $area.Y), 0, 0, $bitmap.Size)
          if ($discover) { $pairs = [DeckBridgeDevScreen]::Decode($bitmap) }
          else { $pairs = [DeckBridgeDevScreen]::ReadCached($bitmap, $area.X, $area.Y) }
          if ($pairs.Length -gt 0) {
            $context = [DeckBridgeDevScreen]::LastContext
            $sum = $context
            $entries = @(for ($i = 0; $i -lt $pairs.Length; $i += 2) {
              $sum = ($sum + $pairs[$i] + $pairs[$i + 1]) % 0x1000000
              @{ slot=$pairs[$i]; icon=$pairs[$i + 1] }
            })
            [Console]::Out.WriteLine((@{ protocol='DBDEV3'; context=$context; entries=$entries; checksum=$sum } | ConvertTo-Json -Depth 4 -Compress))
            [Console]::Out.Flush()
          }
        }
      }
    }
  } catch { [Console]::Error.WriteLine('DEV live icons: frame unavailable.') }
  finally {
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($game) { $game.Dispose() }
  }
  Start-Sleep -Milliseconds 1000
}
