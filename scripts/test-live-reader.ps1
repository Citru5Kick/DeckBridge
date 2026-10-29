# Tests the actual C# scanner with synthetic images. Never captures the desktop.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$tokens = $null
$errors = $null
$helper = Join-Path $PSScriptRoot '..\com.deckbridge.wow.dev.sdPlugin\helpers\live-icons.ps1'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($helper, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'PowerShell syntax error' }
Add-Type -ReferencedAssemblies System.Drawing -Path (Join-Path $PSScriptRoot '../com.deckbridge.wow.dev.sdPlugin/helpers/live-reader.cs')
function Paint-Cell($x, $y, $size, $value) {
  $color = [System.Drawing.Color]::FromArgb(255, ($value -shr 16) -band 255, ($value -shr 8) -band 255, $value -band 255)
  for ($dy = 0; $dy -lt $size; $dy++) {
    for ($dx = 0; $dx -lt $size; $dx++) { $bitmap.SetPixel($x + $dx, $y + $dy, $color) }
  }
}
function Paint-Marker($x, $y, $size, $slot, $icon, $context=12345) {
  $values = @(0xff00ff, 0x00ffff, (0xdb0000 + $slot), $icon, (($icon + $slot + $context + 0x444203) -band 0xffffff),$context)
  for ($j = 0; $j -lt 6; $j++) { Paint-Cell ($x + $j * $size) $y $size $values[$j] }
}
$bitmap = New-Object System.Drawing.Bitmap(1600, 1100)
try {
  if ([DeckBridgeDevScreen]::Decode($bitmap).Length) { throw 'Blank image accepted' }
  for ($slot = 1; $slot -le 96; $slot++) {
    $size = 1 + ($slot % 6)
    $x = 20 + (($slot - 1) % 12) * 100
    $y = 250 + [math]::Floor(($slot - 1) / 12) * 80
    $icon = if ($slot -eq 1) { 0 } elseif ($slot -eq 96) { 0xffffff } else { 100000 + $slot }
    Paint-Marker $x $y $size $slot $icon
  }
  $pairs = [DeckBridgeDevScreen]::Decode($bitmap)
  if ($pairs.Length -ne 192) { throw "Expected 96 markers, got $($pairs.Length / 2)" }
  for ($i = 0; $i -lt $pairs.Length; $i += 2) {
    $slot = $pairs[$i]
    $expected = if ($slot -eq 1) { 0 } elseif ($slot -eq 96) { 0xffffff } else { 100000 + $slot }
    if ($pairs[$i + 1] -ne $expected) { throw "Wrong icon $slot" }
  }
  if([DeckBridgeDevScreen]::LastContext -ne 12345){throw 'Wrong profile context'}
  $cached=[DeckBridgeDevScreen]::ReadCached($bitmap,0,0)
  if(($cached -join ',') -ne ($pairs -join ',')){throw 'Cached read differs from discovery'}
  $area=[DeckBridgeDevScreen]::Bounds(1600,1100)
  $crop=$bitmap.Clone($area,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $cropped=[DeckBridgeDevScreen]::ReadCached($crop,$area.X,$area.Y)
    if(($cropped -join ',') -ne ($pairs -join ',')){throw 'Cropped read differs'}
  } finally {$crop.Dispose()}
  # Live icon changes must update without a discovery scan.
  Paint-Marker 20 250 2 1 77
  if(([DeckBridgeDevScreen]::ReadCached($bitmap,0,0))[1] -ne 77){throw 'Cached icon change missed'}
  Paint-Marker 20 250 2 1 0
  # Deliberately invalid marker, then a conflicting duplicate: neither can replace data.
  Paint-Marker 1300 900 2 97 123
  if ([DeckBridgeDevScreen]::Decode($bitmap).Length -ne 192) { throw 'Out-of-range marker accepted' }
  Paint-Marker 1300 950 2 1 42
  if ([DeckBridgeDevScreen]::Decode($bitmap).Length -ne 190) { throw 'Conflicting duplicate accepted' }
  # Damage slot 2 checksum.
  Paint-Cell (120 + 4 * 3) 250 3 0
  if ([DeckBridgeDevScreen]::Decode($bitmap).Length -ne 188) { throw 'Corrupted marker accepted' }
} finally { $bitmap.Dispose() }
$bitmap=New-Object System.Drawing.Bitmap(640,480)
$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
try {
  Paint-Marker 20 20 2 1 123
  [void][DeckBridgeDevScreen]::Decode($bitmap)
  $graphics.Clear([System.Drawing.Color]::Black)
  Paint-Marker 400 400 3 1 123
  if([DeckBridgeDevScreen]::ReadCached($bitmap,0,0).Length){throw 'Moved marker read at old position'}
  if([DeckBridgeDevScreen]::Decode($bitmap).Length -ne 2){throw 'Moved marker not rediscovered'}
  Paint-Marker 400 400 3 1 123 54321
  [void][DeckBridgeDevScreen]::ReadCached($bitmap,0,0)
  if([DeckBridgeDevScreen]::LastContext -ne 54321){throw 'Profile switch not detected'}
  Paint-Marker 40 40 2 2 456 12345
  if([DeckBridgeDevScreen]::Decode($bitmap).Length){throw 'Mixed profile contexts accepted'}
}finally{$graphics.Dispose();$bitmap.Dispose()}
Write-Output 'OK: discovery, cached/cropped sampling, changed icons, 96 slots, sizes 1-6 px, profile context, invalid/duplicate slots and checksums.'
