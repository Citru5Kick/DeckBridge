# DEV only. The helper releases owned keys on focus loss, EOF or heartbeat expiry.
$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'keysender-dev.cs')
[DeckBridgeDevKeys.Runner]::Run()