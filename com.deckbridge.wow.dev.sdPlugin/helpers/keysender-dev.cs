using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

namespace DeckBridgeDevKeys {
  public interface IBackend {
    long WoWWindow();
    bool IsDown(ushort key);
    void Send(ushort key, bool up);
  }
  // Testable state machine. Only keys pressed by this session are released.
  public sealed class Session {
    sealed class Press { public ushort[] Keys; public long Expires; }
    sealed class Ref { public int Count; public bool Owned; }
    readonly IBackend backend;
    readonly Dictionary<string, Press> presses = new Dictionary<string, Press>();
    readonly Dictionary<ushort, Ref> refs = new Dictionary<ushort, Ref>();
    long window;
    public Session(IBackend backend) { this.backend = backend; }
    static ushort[][] mods = { new ushort[0], new ushort[]{0xa4}, new ushort[]{0xa2}, new ushort[]{0xa0}, new ushort[]{0xa4,0xa2}, new ushort[]{0xa4,0xa0}, new ushort[]{0xa2,0xa0}, new ushort[]{0xa4,0xa2,0xa0} };
    public void Down(string token, int slot, long now) {
      Tick(now);
      long target = backend.WoWWindow();
      if (slot < 1 || slot > 113 || target == 0 || presses.ContainsKey(token) || presses.Count >= 113) return;
      window = target;
      var keys = slot <= 96 ? new List<ushort>(mods[(slot - 1) / 12]) : new List<ushort>();
      if (slot <= 96) keys.Add((ushort)(0x70 + (slot - 1) % 12));
      else {
        int index = slot - 97;
        // WoW does not reliably bind F13-F24. Standard A-Q keys with all
        // three modifiers form a separate bank from the F1-F12 action slots.
        keys.Add(0xa4); keys.Add(0xa2); keys.Add(0xa0);
        keys.Add((ushort)(0x41 + index));
      }
      // Register before injection so cleanup also handles a partially sent sequence.
      var press = new Press { Keys = keys.ToArray(), Expires = now + 1500 };
      presses.Add(token, press);
      try {
        foreach (ushort key in press.Keys) {
          if (backend.WoWWindow() != window) { ReleaseAll(); return; }
          Ref count;
          if (!refs.TryGetValue(key, out count)) {
            count = new Ref { Count = 0, Owned = !backend.IsDown(key) };
            refs.Add(key, count);
            if (count.Owned) backend.Send(key, false);
          }
          count.Count++;
        }
      } catch { ReleaseAll(); throw; }
    }
    public void Heartbeat(string token, long now) {
      Tick(now);
      Press press;
      if (presses.TryGetValue(token, out press)) press.Expires = now + 1500;
    }
    public void Up(string token) {
      Press press;
      if (!presses.TryGetValue(token, out press)) return;
      presses.Remove(token);
      for (int i = press.Keys.Length - 1; i >= 0; i--) {
        Ref count;
        ushort key = press.Keys[i];
        if (!refs.TryGetValue(key, out count)) continue;
        if (--count.Count <= 0) {
          refs.Remove(key);
          if (count.Owned) backend.Send(key, true);
        }
      }
    }
    public void ReleaseAll() {
      foreach (string token in new List<string>(presses.Keys)) Up(token);
      window = 0;
    }
    public void Tick(long now) {
      if (presses.Count == 0) return;
      if (backend.WoWWindow() != window) { ReleaseAll(); return; }
      foreach (string token in new List<string>(presses.Keys)) {
        if (presses[token].Expires <= now) Up(token);
      }
    }
  }
  public sealed class WindowsBackend : IBackend {
    [StructLayout(LayoutKind.Sequential)] struct MOUSE { public int x,y; public uint data,flags,time; public IntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] struct KEY { public ushort vk,scan; public uint flags,time; public IntPtr extra; }
    [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public MOUSE mouse; [FieldOffset(0)] public KEY key; }
    [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION input; }
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, INPUT[] input, int size);
    public long WoWWindow() {
      IntPtr h = GetForegroundWindow();
      uint id; GetWindowThreadProcessId(h, out id);
      try {
        using (var process = Process.GetProcessById((int)id)) {
          string name = process.ProcessName.ToLowerInvariant();
          return name == "wow" || name == "wowb" || name == "wowt" || name == "wow-64" ? h.ToInt64() : 0;
        }
      } catch { return 0; }
    }
    public bool IsDown(ushort key) { return (GetAsyncKeyState(key) & 0x8000) != 0; }
    public void Send(ushort key, bool up) {
      var input = new INPUT[1];
      input[0].type = 1; input[0].input.key.vk = key; input[0].input.key.flags = up ? 2u : 0u;
      if (SendInput(1, input, Marshal.SizeOf(typeof(INPUT))) != 1) throw new InvalidOperationException("DEV input rejected");
    }
  }
  public static class Runner {
    static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
    static long Clock() { return (long)(Stopwatch.GetTimestamp() * (1000.0 / Stopwatch.Frequency)); }
    public static void Run() {
      var session = new Session(new WindowsBackend());
      var gate = new object();
      bool done = false;
      var monitor = new Thread(() => {
        while (true) {
          lock (gate) {
            if (done) return;
            try { session.Tick(Clock()); } catch { /* Main loop/finally also performs cleanup. */ }
          }
          Thread.Sleep(50);
        }
      });
      monitor.IsBackground = true; monitor.Start();
      try {
        Console.WriteLine("ready"); Console.Out.Flush();
        string line;
        while ((line = Console.ReadLine()) != null) {
          if (line.Length > 160) continue;
          string[] parts = line.Split(' ');
          lock (gate) {
            if (parts.Length == 1 && parts[0] == "R") { session.ReleaseAll(); continue; }
            if (parts.Length < 2 || parts[1].Length < 1 || parts[1].Length > 32) continue;
            if (parts[0] == "U" && parts.Length == 2) session.Up(parts[1]);
            else if (parts[0] == "H" && parts.Length == 2) session.Heartbeat(parts[1], Clock());
            else if (parts[0] == "D" && parts.Length == 4) {
              int slot; long sent, now = Now();
              if (int.TryParse(parts[2], out slot) && long.TryParse(parts[3], out sent) && now >= sent - 100 && now - sent <= 500) session.Down(parts[1], slot, Clock());
            }
          }
        }
      } finally {
        lock (gate) { done = true; session.ReleaseAll(); }
      }
    }
  }
}
