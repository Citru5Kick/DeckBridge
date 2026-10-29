# Editable, deterministic artwork. Creates a new DEV-only icon family; no existing assets replaced.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$plugin=Join-Path $repo 'com.deckbridge.wow.dev.sdPlugin/imgs/duotone'
$addon=Join-Path $repo 'addon/DeckBridgeDev/Textures/Duotone'
foreach($target in @($plugin,$addon)){
  if(Test-Path -LiteralPath $target){throw "Destination already exists: $target"}
  New-Item -ItemType Directory -Path $target|Out-Null
}
$colors=@{Navy='#101F30';Cyan='#4BD8F5';Gold='#F2CE7B';Gray='#8795A7';Green='#50E29A';Border='#20394E'}
$brushes=@{}
foreach($key in $colors.Keys){$brushes[$key]=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($colors[$key]))}
function RRect($brush,[single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
 $path=New-Object System.Drawing.Drawing2D.GraphicsPath
 try{$d=2*$r;$path.AddArc($x,$y,$d,$d,180,90);$path.AddArc(($x+$w-$d),$y,$d,$d,270,90);$path.AddArc(($x+$w-$d),($y+$h-$d),$d,$d,0,90);$path.AddArc($x,($y+$h-$d),$d,$d,90,90);$path.CloseFigure();$g.FillPath($brush,$path)}finally{$path.Dispose()}
}
function Poly($brush,[single[]]$coordinates){
 $points=New-Object System.Drawing.PointF[] ($coordinates.Length/2)
 for($i=0;$i -lt $points.Length;$i++){$points[$i]=[System.Drawing.PointF]::new($coordinates[2*$i],$coordinates[2*$i+1])}
 $g.FillPolygon($brush,$points)
}
function Stroke($brush,[single]$width,[single]$x1,[single]$y1,[single]$x2,[single]$y2){
 $pen=New-Object System.Drawing.Pen($brush.Color,$width)
 try{$pen.StartCap=[System.Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=$pen.StartCap;$g.DrawLine($pen,$x1,$y1,$x2,$y2)}finally{$pen.Dispose()}
}
function Spark($brush,[single]$x,[single]$y,[single]$r){Poly $brush @($x,($y-$r),($x+2),($y-2),($x+$r),$y,($x+2),($y+2),$x,($y+$r),($x-2),($y+2),($x-$r),$y,($x-2),($y-2))}
function New-DuotoneIcon($name,[int]$size,[bool]$small=$false){
 $bitmap=New-Object System.Drawing.Bitmap($size,$size)
 $g=[System.Drawing.Graphics]::FromImage($bitmap)
 $navy=$brushes.Navy;$cyan=$brushes.Cyan;$gold=$brushes.Gold;$gray=$brushes.Gray
 try{
  $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.ScaleTransform(($size/72),($size/72))
  if($small){$g.FillEllipse($navy,0,0,72,72);$g.TranslateTransform(0,4)}
  else{RRect $brushes.Border 0 0 72 72 11;RRect $navy 1 1 70 70 10}
  switch($name){
   'brand' {
    $arch=New-Object System.Drawing.Pen($gold.Color,5)
    try{$g.DrawArc($arch,14,16,44,39,180,180)}finally{$arch.Dispose()}
    Stroke $gold 3 13 34 59 34
    RRect $gold 10 29 15 19 2;RRect $cyan 10 33 11 15 2
    RRect $gold 47 29 15 19 2;RRect $cyan 51 33 11 15 2
   }
   'slot' {RRect $cyan 15 10 18 18 3;RRect $gold 38 10 18 18 3;RRect $gold 15 33 18 18 3;RRect $gold 38 33 18 18 3}
   'emote' {
    $g.FillEllipse($cyan,15,9,42,42);$g.FillEllipse($navy,25,21,4,5);$g.FillEllipse($navy,43,21,4,5)
    $g.FillPie($navy,24,24,24,18,0,180);Spark $gold 57 13 5
   }
   'map' {
    Poly $gold @(13,16,27,10,27,44,13,50)
    Poly $cyan @(27,10,43,17,43,50,27,44)
    Poly $gold @(43,17,57,11,57,43,43,50)
    Stroke $navy 2 27 12 27 42;Stroke $navy 2 43 19 43 48
    $g.FillEllipse($navy,43,32,22,22);$g.FillEllipse($gold,46,35,16,16)
    RRect $navy 53 38 2.5 7 1;$g.FillEllipse($navy,53,47,2.5,2.5)
   }
   'backpack' {
    $pen=New-Object System.Drawing.Pen($gold.Color,4)
    try{$g.DrawArc($pen,28,7,16,15,180,180)}finally{$pen.Dispose()}
    RRect $gold 14 24 8 22 3;RRect $gold 50 24 8 22 3
    RRect $cyan 20 14 32 39 6;RRect $gold 20 14 32 14 5
    RRect $navy 31 23 10 10 2;RRect $gold 34 25 4 5 1
    RRect $navy 26 37 20 11 3;RRect $gold 28 39 16 7 2
   }
   'character' {
    $g.FillEllipse($gold,27,9,18,20);RRect $gold 30 24 12 10 2
    Poly $cyan @(23,31,30,29,36,36,42,29,49,31,48,51,24,51)
    Poly $gold @(13,30,23,29,29,41,22,46,12,40)
    Poly $gold @(49,29,59,30,60,40,50,46,43,41)
    Stroke $navy 2 16 31 25 41;Stroke $navy 2 56 31 47 41
    Stroke $gold 3 30 39 36 44;Stroke $gold 3 36 44 42 39
   }
   'spellbook' {
    Poly $gold @(12,20,21,16,34,23,34,52,20,45,12,47)
    Poly $gold @(38,23,51,16,60,20,60,47,51,45,38,52)
    Poly $cyan @(16,21,22,20,32,25,32,46,22,41,16,42)
    Poly $cyan @(40,25,50,20,56,21,56,42,50,41,40,46)
    Stroke $gold 2 36 24 36 52;Spark $gold 36 10 8
   }
   {$_ -in 'reader-off','reader-on'} {
    $active=$name -eq 'reader-on';$body=if($active){$cyan}else{$gray}
    RRect $body 13 9 46 32 4;RRect $navy 17 13 38 24 2
    RRect $body 32 40 8 8 1;RRect $body 23 47 26 4 1
    $power=if($active){$brushes.Green}else{$gray}
    $pen=New-Object System.Drawing.Pen($power.Color,2.5)
    try{$g.DrawArc($pen,27,18,18,14,-40,260)}finally{$pen.Dispose()}
    Stroke $power 2.5 36 16 36 24
    $g.FillEllipse($navy,47,34,17,17)
    if($active){$g.FillEllipse($brushes.Green,50,37,11,11)}
    else{Stroke $gray 4 50 47 61 36}
   }
   'settings' {
    $points=New-Object System.Drawing.PointF[] 48
    for($i=0;$i -lt 48;$i++){$a=2*[math]::PI*$i/48;$r=if(($i%6)-in 0,1,2){23}else{18};$points[$i]=[System.Drawing.PointF]::new((36+[math]::Cos($a)*$r),(30+[math]::Sin($a)*$r))}
    $g.FillPolygon($gold,$points);$g.FillEllipse($navy,27,21,18,18);$g.FillEllipse($cyan,30,24,12,12)
   }
   'website' {
    $g.FillEllipse($cyan,14,8,44,44);$g.FillEllipse($navy,18,12,36,36)
    $pen=New-Object System.Drawing.Pen($gold.Color,3)
    try{$g.DrawEllipse($pen,27,9,18,42)}finally{$pen.Dispose()}
    Stroke $gold 2.5 18 30 54 30;Stroke $gold 2 21 20 51 20;Stroke $gold 2 21 40 51 40
   }
  }
 }finally{$g.Dispose()}
 return $bitmap
}
function Save-Tga($bitmap,$file){
 $size=$bitmap.Width;$bytes=New-Object byte[] (18+$size*$size*4)
 $bytes[2]=2;$bytes[12]=$size-band 255;$bytes[13]=$size-shr 8;$bytes[14]=$size-band 255;$bytes[15]=$size-shr 8;$bytes[16]=32;$bytes[17]=40
 $n=18
 for($y=0;$y -lt $size;$y++){for($x=0;$x -lt $size;$x++){$c=$bitmap.GetPixel($x,$y);$bytes[$n]=$c.B;$bytes[$n+1]=$c.G;$bytes[$n+2]=$c.R;$bytes[$n+3]=$c.A;$n+=4}}
 [System.IO.File]::WriteAllBytes($file,$bytes)
}
try{
 foreach($name in @('brand','slot','emote','map','backpack','character','spellbook','reader-off','reader-on','settings','website')){
  foreach($size in @(72,144)){$b=New-DuotoneIcon $name $size;try{$suffix=if($size -eq 144){'@2x'}else{''};$b.Save((Join-Path $plugin ($name+$suffix+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)}finally{$b.Dispose()}}
 }
 foreach($name in @('brand','settings','website')){$b=New-DuotoneIcon $name 32 $true;try{Save-Tga $b (Join-Path $addon ($name+'.tga'))}finally{$b.Dispose()}}
}finally{foreach($brush in $brushes.Values){$brush.Dispose()}}
Write-Output 'OK: Duotone PNG 72/144 and addon TGA 32 generated in new DEV folders.'
