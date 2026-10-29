# Run only the process-presence function with fake processes. No game/capture API calls.
$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$path=Join-Path $PSScriptRoot '../com.deckbridge.wow.dev.sdPlugin/helpers/live-icons.ps1'
$ast=[System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'PowerShell syntax error'}
$function=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-DeckBridgeGamePresent'},$true)
if(-not $function){throw 'Process check missing'}
. ([scriptblock]::Create($function.Extent.Text))
$script:fixtures=@()
function Get-Process {param($Id,$Name,$ErrorAction) foreach($process in $script:fixtures){if(-not $Id -or $process.Id -eq $Id){$process}}}
function Fake-Process($id,$name,$start){
 $p=[pscustomobject]@{Id=$id;ProcessName=$name;StartTime=$start;HasExited=$false;Disposed=$false}
 $p|Add-Member -MemberType ScriptMethod -Name Dispose -Value {$this.Disposed=$true}
 return $p
}
$start=[datetime]::SpecifyKind([datetime]'2026-01-01',[DateTimeKind]::Utc)
if(Test-DeckBridgeGamePresent 0 0){throw 'Absent game detected as running'}
$game=Fake-Process 42 'Wow' $start
$script:fixtures=@($game)
if(-not(Test-DeckBridgeGamePresent 0 0)){throw 'Existing non-foreground game was missed'}
if(-not $game.Disposed){throw 'Process handle not disposed'}
if(-not(Test-DeckBridgeGamePresent 42 $start.Ticks)){throw 'Tracked game was missed'}
$script:fixtures=@((Fake-Process 99 'Wow' $start))
if(Test-DeckBridgeGamePresent 42 $start.Ticks){throw 'Another game preserved consent for a closed process'}
$script:fixtures=@((Fake-Process 42 'Wow' $start.AddSeconds(1)))
if(Test-DeckBridgeGamePresent 42 $start.Ticks){throw 'PID reuse preserved consent'}
$script:fixtures=@((Fake-Process 42 'Browser' $start))
if(Test-DeckBridgeGamePresent 42 $start.Ticks){throw 'Non-game process accepted'}
$game=Fake-Process 42 'Wow' $start;$game.HasExited=$true;$script:fixtures=@($game)
if(Test-DeckBridgeGamePresent 42 $start.Ticks){throw 'Exited game accepted'}
Write-Output 'OK: no game, background game, tracked process exit, another instance, PID reuse, unrelated processes and handle disposal (mocked processes).'
