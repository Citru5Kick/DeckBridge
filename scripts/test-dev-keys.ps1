# Fake backend only. Does not call SendInput or inspect the actual keyboard.
$ErrorActionPreference = 'Stop'
$source=Get-Content -Raw (Join-Path $PSScriptRoot '../com.deckbridge.wow.dev.sdPlugin/helpers/keysender-dev.cs')
$tests=@'
namespace DeckBridgeDevKeys.Tests {
  public class Fake : IBackend {
    public long Window=42;
    public System.Collections.Generic.List<string> Sent = new System.Collections.Generic.List<string>();
    public bool PhysicalCtrl;
    public long WoWWindow(){return Window;}
    public bool IsDown(ushort key){return key==0xa2 && PhysicalCtrl;}
    public void Send(ushort key,bool up){Sent.Add(key+(up?"U":"D"));}
  }
  public static class Tests {
    static void Check(bool value,string message){if(!value)throw new System.Exception(message);}
    public static void Run(){
      var fake=new Fake();var session=new Session(fake);
      fake.Window=0;session.Down("a",25,0);Check(fake.Sent.Count==0,"Input outside WoW");
      fake.Window=42;session.Down("a",25,0);session.Down("b",26,0);
      Check(fake.Sent.Count==3,"Shared modifier pressed twice");
      session.Up("a");Check(!fake.Sent.Contains("162U"),"Modifier released while still held");
      session.Up("b");Check(fake.Sent.Count==6 && fake.Sent[5]=="162U","Modifier not released");
      fake.Sent.Clear();session.Down("a",25,0);fake.Window=0;session.Tick(1);
      Check(fake.Sent.Count==4,"Focus loss did not release keys");
      fake.Window=42;fake.Sent.Clear();session.Down("a",25,0);session.Heartbeat("a",1000);session.Tick(1600);
      Check(fake.Sent.Count==2,"Heartbeat lease lost early");session.Tick(2500);Check(fake.Sent.Count==4,"Lease expiry did not release");
      fake.Sent.Clear();fake.PhysicalCtrl=true;session.Down("a",25,0);session.Up("a");
      Check(fake.Sent.Count==2 && !fake.Sent.Contains("162U"),"Physical modifier was released");
      fake.PhysicalCtrl=false;fake.Sent.Clear();session.Down("a",25,0);session.ReleaseAll();session.Up("a");
      Check(fake.Sent.Count==4,"Cleanup is not idempotent");
      fake.Sent.Clear();session.Down("a",0,0);session.Down("b",114,0);Check(fake.Sent.Count==0,"Invalid slot injected");
      for(int slot=97;slot<=113;slot++){
        fake.Sent.Clear();session.Down("panel",slot,0);session.Up("panel");
        Check(fake.Sent.Count==8 && fake.Sent[0]=="164D" && fake.Sent[1]=="162D" && fake.Sent[2]=="160D" && fake.Sent[3]==((slot-32)+"D") && fake.Sent[4]==((slot-32)+"U") && fake.Sent[7]=="164U","Utility standard-letter key mismatch");
      }
    }
  }
}
'@
Add-Type -TypeDefinition ($source+$tests)
[DeckBridgeDevKeys.Tests.Tests]::Run()
Write-Output 'OK: foreground guard, overlapping presses, modifiers, focus loss, heartbeat expiry, physical modifiers, cleanup and invalid slots (fake backend).'
