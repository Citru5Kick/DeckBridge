import fs from "node:fs";
import type { Entry } from "../db";
import { parseLuaSaved } from "./luaParser";

export const MAX_SAVED_BYTES = 8 * 1024 * 1024;
export function contextId(active: string): number {
  let hash = 5381;
  for (const byte of Buffer.from(active, "utf8")) hash = (hash * 33 + byte) % 0x1000000;
  return hash || 1;
}
export type SavedSnapshot = { context: number; slots: Map<number, Entry> };
export function parseSavedSnapshot(text: string): SavedSnapshot {
  const db = parseLuaSaved(text).DeckBridgeDevDB as any;
  if (!db || typeof db !== "object" || typeof db.active !== "string" || !db.active || db.active.length > 1024) throw new Error("Invalid DEV database/profile");
  if (!db.profiles || typeof db.profiles !== "object" || !Object.hasOwn(db.profiles, db.active)) throw new Error("Invalid DEV profile table");
  const profile = db.profiles[db.active];
  if (!profile || typeof profile !== "object") throw new Error("Missing DEV active profile");
  const slots = new Map<number, Entry>();
  for (const [key, raw] of Object.entries(profile)) {
    const slot = Number(key), entry = raw as any;
    if (!Number.isInteger(slot) || slot < 1 || slot > 96 || !entry || typeof entry !== "object") continue;
    if (!Number.isInteger(entry.id) || entry.id < 1 || entry.id > 1000) continue;
    if (!Number.isInteger(entry.icon) || entry.icon < 0 || entry.icon > 0xffffff) continue;
    slots.set(slot, { kind: "action", id: entry.id, icon: entry.icon });
  }
  return { context: contextId(db.active), slots };
}
let cached: { file: string; modified: number; size: number; snapshot: SavedSnapshot } | undefined;
export function loadSlots(file: string, dbName: "DeckBridgeDevDB"): SavedSnapshot {
  if (dbName !== "DeckBridgeDevDB") throw new Error("DEV database only");
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SAVED_BYTES) throw new Error("Invalid DEV SavedVariables file");
  if (cached?.file === file && cached.modified === stat.mtimeMs && cached.size === stat.size) return cached.snapshot;
  const fd = fs.openSync(file, "r");
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size > MAX_SAVED_BYTES) throw new Error("Invalid DEV SavedVariables size");
    const buffer = Buffer.alloc(Math.min(MAX_SAVED_BYTES + 1, opened.size + 1));
    let length = 0, read: number;
    while (length < buffer.length && (read = fs.readSync(fd, buffer, length, buffer.length - length, null)) > 0) length += read;
    if (length > MAX_SAVED_BYTES || length !== opened.size) throw new Error("DEV SavedVariables changed during read");
    const snapshot = parseSavedSnapshot(buffer.subarray(0, length).toString("utf8"));
    cached = { file, modified: stat.mtimeMs, size: stat.size, snapshot };
    return snapshot;
  } finally { fs.closeSync(fd); }
}
export class LiveState {
  context: number | undefined;
  private entries = new Map<number, { value: Entry; seen: number }>();
  clear(): void { this.context = undefined; this.entries.clear(); }
  update(context: number, slots: Map<number, Entry>, now = Date.now()): boolean {
    let changed = this.context !== context;
    if (changed) this.entries.clear();
    this.context = context;
    for (const [slot, value] of slots) {
      if (this.entries.get(slot)?.value.icon !== value.icon) changed = true;
      this.entries.set(slot, { value, seen: now });
    }
    return changed;
  }
  expire(now = Date.now()): boolean {
    let changed = false;
    for (const [slot, entry] of this.entries) if (now - entry.seen >= 3500) { this.entries.delete(slot); changed = true; }
    return changed;
  }
  overlay(saved?: SavedSnapshot): Map<number, Entry> {
    const slots = new Map(!saved || (this.context !== undefined && saved.context !== this.context) ? [] : saved.slots);
    for (const [slot, entry] of this.entries) slots.set(slot, entry.value);
    return slots;
  }
}
