using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class DeckBridgeDevScreen {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  sealed class Marker { public int X, Y, Size; }
  static Dictionary<int, Marker> cache = new Dictionary<int, Marker>();
  public static int LastContext { get; private set; }
  public static int CacheCount { get { return cache.Count; } }
  public static void Reset() { cache.Clear(); LastContext = 0; }
  static int RGB(byte[] data, int stride, int x, int y) {
    int n = y * stride + x * 4;
    return (data[n + 2] << 16) | (data[n + 1] << 8) | data[n];
  }
  static int Color(Bitmap bitmap, int x, int y) { return bitmap.GetPixel(x,y).ToArgb() & 0xffffff; }
  public static Rectangle Bounds(int width, int height) {
    Rectangle bounds = Rectangle.Empty;
    foreach (var marker in cache.Values) {
      var rect = new Rectangle(marker.X, marker.Y, 6 * marker.Size, marker.Size);
      bounds = bounds.IsEmpty ? rect : Rectangle.Union(bounds, rect);
    }
    return Rectangle.Intersect(bounds, new Rectangle(0,0,width,height));
  }
  static int[] Result(SortedDictionary<int, int> icons) {
    var result = new List<int>();
    foreach (var pair in icons) { result.Add(pair.Key); result.Add(pair.Value); }
    return result.ToArray();
  }
  // Discovery is occasional; only here is an image-wide managed buffer allocated.
  public static int[] Decode(Bitmap bitmap) {
    Reset();
    var locked = bitmap.LockBits(new Rectangle(0,0,bitmap.Width,bitmap.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    try {
      if (locked.Stride <= 0) return new int[0];
      var pixels = new byte[checked(locked.Stride * bitmap.Height)];
      Marshal.Copy(locked.Scan0, pixels, 0, pixels.Length);
      var icons = new SortedDictionary<int, int>();
      var conflicts = new HashSet<int>();
      bool mixedContext = false;
      for (int y=0; y<bitmap.Height; y++) {
        int row = y * locked.Stride;
        for (int x=0, offset=row; x<bitmap.Width-5; x++, offset+=4) {
          if (pixels[offset] != 255 || pixels[offset+1] != 0 || pixels[offset+2] != 255) continue;
          for (int size=1; size<=12 && x+5*size<bitmap.Width; size++) {
            if (RGB(pixels,locked.Stride,x+size,y) != 0x00ffff) continue;
            int slot = RGB(pixels,locked.Stride,x+2*size,y)-0xdb0000;
            if (slot<1 || slot>96) continue;
            int icon = RGB(pixels,locked.Stride,x+3*size,y);
            int check = RGB(pixels,locked.Stride,x+4*size,y);
            int context = RGB(pixels,locked.Stride,x+5*size,y);
            if (context == 0 || ((icon+slot+context+0x444203)&0xffffff) != check) continue;
            if (LastContext != 0 && LastContext != context) mixedContext = true;
            LastContext = context;
            if (icons.ContainsKey(slot) && icons[slot] != icon) conflicts.Add(slot);
            else {
              if (!icons.ContainsKey(slot)) cache[slot] = new Marker { X=x,Y=y,Size=size };
              icons[slot] = icon;
            }
          }
        }
      }
      if (mixedContext) { Reset(); return new int[0]; }
      foreach(int slot in conflicts) { icons.Remove(slot); cache.Remove(slot); }
      return Result(icons);
    } finally { bitmap.UnlockBits(locked); }
  }
  // Bitmap is only the cached bounding area, not necessarily the full client image.
  public static int[] ReadCached(Bitmap bitmap, int originX, int originY) {
    var icons = new SortedDictionary<int, int>();
    int frameContext=0;
    foreach(var pair in cache) {
      var m=pair.Value;
      int x=m.X-originX, y=m.Y-originY, size=m.Size;
      if(x<0 || y<0 || x+5*size>=bitmap.Width || y>=bitmap.Height) continue;
      if(Color(bitmap,x,y)!=0xff00ff || Color(bitmap,x+size,y)!=0x00ffff || Color(bitmap,x+2*size,y)!=0xdb0000+pair.Key) continue;
      int icon=Color(bitmap,x+3*size,y), context=Color(bitmap,x+5*size,y);
      if(context==0 || ((icon+pair.Key+context+0x444203)&0xffffff)!=Color(bitmap,x+4*size,y)) continue;
      if(frameContext!=0 && frameContext!=context) return new int[0];
      frameContext=context;
      icons[pair.Key]=icon;
    }
    if(frameContext!=0) LastContext=frameContext;
    return Result(icons);
  }
}
// A crashed plugin must not leave an orphaned screen reader capturing indefinitely.
public static class DeckBridgeDevReaderLease {
  static volatile bool connected;
  static long lastPing;
  static long Now() { return (long)(System.Diagnostics.Stopwatch.GetTimestamp() * (1000.0 / System.Diagnostics.Stopwatch.Frequency)); }
  public static bool Valid {
    get { return connected && Now() - System.Threading.Interlocked.Read(ref lastPing) < 3000; }
  }
  public static void Start(System.IO.TextReader input) {
    connected = true;
    System.Threading.Interlocked.Exchange(ref lastPing, Now());
    var monitor = new System.Threading.Thread(() => {
      try {
        string line;
        while ((line = input.ReadLine()) != null) if (line == "PING") System.Threading.Interlocked.Exchange(ref lastPing, Now());
      } finally { connected = false; }
    });
    monitor.IsBackground = true;
    monitor.Start();
  }
}
