# Test the parent lease only. Never calls the capture APIs.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Path (Join-Path $PSScriptRoot '../com.deckbridge.wow.dev.sdPlugin/helpers/live-reader.cs')
Add-Type -TypeDefinition @'
public class DeckBridgeLeaseTestInput : System.IO.TextReader {
  public System.Threading.ManualResetEvent Waiting = new System.Threading.ManualResetEvent(false);
  public System.Threading.ManualResetEvent Disconnect = new System.Threading.ManualResetEvent(false);
  bool first=true;
  public override string ReadLine(){if(first){first=false;return "PING";} Waiting.Set();Disconnect.WaitOne();return null;}
}
'@
if([DeckBridgeDevReaderLease]::Valid){throw 'Lease exists without parent'}
$inputFixture=New-Object DeckBridgeLeaseTestInput
[DeckBridgeDevReaderLease]::Start($inputFixture)
if(-not $inputFixture.Waiting.WaitOne(1000)){throw 'Lease monitor did not read heartbeat'}
if(-not [DeckBridgeDevReaderLease]::Valid){throw 'Valid parent heartbeat ignored'}
$field=[DeckBridgeDevReaderLease].GetField('lastPing',[System.Reflection.BindingFlags]'NonPublic,Static')
$field.SetValue($null,[long]0)
if([DeckBridgeDevReaderLease]::Valid){throw 'Expired lease remains valid'}
$inputFixture.Disconnect.Set()|Out-Null
Start-Sleep -Milliseconds 20
if([DeckBridgeDevReaderLease]::Valid){throw 'EOF left a valid lease'}
Write-Output 'OK: no lease before parent, heartbeat acceptance, expiry and EOF shutdown (no screen capture).'
