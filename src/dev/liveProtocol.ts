import { actionSlot } from "../actionBars";
import type { Entry } from "../db";

// DBDEV2: independently identified visible slots. Hidden bars can be absent.
export function decodeLiveFrame(line: string): { context: number; slots: Map<number, Entry> } | undefined {
  try {
    if (line.length > 8192) return;
    const data = JSON.parse(line);
    if (line.length > 8192 || data?.protocol !== "DBDEV3" || !Number.isInteger(data.context) || data.context < 1 || data.context > 0xffffff || !Array.isArray(data.entries) || data.entries.length < 1 || data.entries.length > 96) return;
    const slots = new Map<number, Entry>();
    let sum = data.context;
    for (const entry of data.entries) {
      const slot = entry?.slot, icon = entry?.icon;
      if (!Number.isInteger(slot) || slot < 1 || slot > 96 || slots.has(slot)) return;
      if (!Number.isInteger(icon) || icon < 0 || icon > 0xffffff) return;
      slots.set(slot, { kind: "action", id: actionSlot(Math.floor((slot - 1) / 12) + 1, (slot - 1) % 12 + 1)!, icon });
      sum = (sum + slot + icon) % 0x1000000;
    }
    if (sum !== data.checksum) return;
    return { context: data.context, slots };
  } catch { return; }
}
