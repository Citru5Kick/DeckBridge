import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIRECTORY = path.join(os.homedir(), ".deckbridge-dev", "icons-v1");
const LISTFILE = "https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv";
const CDN = "https://wow.zamimg.com/images/wow/icons/large/";
const IMAGE_LIMIT = 2 * 1024 * 1024;
const MAP_LIMIT = 32 * 1024 * 1024;
const LIST_LIMIT = 256 * 1024 * 1024;
const NAME = /^[a-z0-9_-]{1,200}$/;
const ALLOWED_HOSTS = new Set(["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com", "github-releases.githubusercontent.com", "wow.zamimg.com"]);
export function validIconId(id: unknown): id is number { return typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 0xffffff; }
function validateURL(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443") || !ALLOWED_HOSTS.has(parsed.hostname)) throw new Error("Unexpected icon download URL");
}
export async function safeResponse(url: string, signal: AbortSignal): Promise<Response> {
  for (let redirects = 0; redirects <= 5; redirects++) {
    validateURL(url);
    const response = await fetch(url, { signal, redirect: "manual" });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("Missing download redirect");
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error(`Icon download failed: ${response.status}`); }
    return response;
  }
  throw new Error("Too many icon redirects");
}
export async function readLimited(response: Response, limit: number): Promise<Buffer> {
  if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new Error("Icon download too large"); }
  const reader = response.body!.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Icon download too large");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size);
  } finally { await reader.cancel().catch(() => {}); }
}
function readFileLimited(file: string, limit: number): Buffer | undefined {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) return;
    const fd = fs.openSync(file, "r");
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.size > limit) return;
      const bytes = Buffer.alloc(opened.size + 1);
      let length = 0, read: number;
      while (length < bytes.length && (read = fs.readSync(fd, bytes, length, bytes.length - length, null)) > 0) length += read;
      if (length !== opened.size || length > limit) return;
      return bytes.subarray(0, length);
    } finally { fs.closeSync(fd); }
  } catch { return; }
}
let mapPromise: Promise<Record<string, string>> | undefined;
let nextMapAttempt = 0;
async function loadMap(): Promise<Record<string, string>> {
  if (mapPromise) return mapPromise;
  if (Date.now() < nextMapAttempt) throw new Error("DEV icon map is in retry cooldown");
  mapPromise = (async () => {
    const mapFile = path.join(DIRECTORY, "icon-map.json");
    const saved = readFileLimited(mapFile, MAP_LIMIT);
    if (saved) {
      try {
        const raw = JSON.parse(saved.toString("utf8"));
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid icon map");
        const clean: Record<string, string> = Object.create(null);
        for (const [id, name] of Object.entries(raw)) if (validIconId(Number(id)) && typeof name === "string" && NAME.test(name)) clean[id] = name;
        if (Object.keys(clean).length) return clean;
      } catch { /* Rebuild an invalid DEV-only map within bounded limits. */ }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await safeResponse(LISTFILE, controller.signal);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const clean: Record<string, string> = Object.create(null);
      let total = 0, carry = "";
      function consume(line: string): void {
        const match = /^(\d+);interface\/icons\/([a-z0-9_-]{1,200})\.blp$/i.exec(line.trim());
        if (match && validIconId(Number(match[1]))) clean[match[1]] = match[2].toLowerCase();
      }
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (value.byteLength > 1024 * 1024) throw new Error("DEV icon list chunk too large");
          if (total > LIST_LIMIT) throw new Error("DEV icon list too large");
          carry += decoder.decode(value, { stream: true });
          let newline: number;
          while ((newline = carry.indexOf("\n")) >= 0) { consume(carry.slice(0, newline)); carry = carry.slice(newline + 1); }
          if (carry.length > 4096) throw new Error("DEV icon list line too long");
        }
        carry += decoder.decode();
        if (carry) consume(carry);
      } finally { await reader.cancel().catch(() => {}); }
      const serialized = JSON.stringify(clean);
      if (Object.keys(clean).length === 0 || Buffer.byteLength(serialized) > MAP_LIMIT) throw new Error("Invalid DEV icon map size");
      fs.mkdirSync(DIRECTORY, { recursive: true });
      fs.writeFileSync(mapFile, serialized);
      return clean;
    } finally { clearTimeout(timeout); }
  })().catch(error => { mapPromise = undefined; nextMapAttempt = Date.now() + 60000; throw error; });
  return mapPromise;
}
const memory = new Map<number, string>();
const pending = new Map<number, Promise<string | undefined>>();
const retry = new Map<number, number>();
let memoryBytes = 0;
let downloadWindow = 0, downloadCount = 0;
let diskBytes: number | undefined;
function mayCache(bytes: number): boolean {
  if (diskBytes === undefined) {
    diskBytes = 0;
    try {
      for (const file of fs.readdirSync(DIRECTORY)) {
        if (!/^\d+\.jpg$/.test(file)) continue;
        const stat = fs.lstatSync(path.join(DIRECTORY, file));
        if (stat.isFile() && !stat.isSymbolicLink()) diskBytes += stat.size;
        if (diskBytes > 128 * 1024 * 1024) break;
      }
    } catch { /* A new DEV cache has no files yet. */ }
  }
  if (diskBytes + bytes > 128 * 1024 * 1024) return false;
  diskBytes += bytes;
  return true;
}
function remember(id: number, uri: string): string {
  if (memory.has(id)) return memory.get(id)!;
  memory.set(id, uri); memoryBytes += uri.length;
  while (memoryBytes > 12 * 1024 * 1024 && memory.size > 1) {
    const oldest = memory.keys().next().value!;
    memoryBytes -= memory.get(oldest)!.length; memory.delete(oldest);
  }
  return uri;
}
export async function iconDataUri(id: number): Promise<string | undefined> {
  if (!validIconId(id)) return;
  const hit = memory.get(id);
  if (hit) { memory.delete(id); memory.set(id, hit); return hit; }
  if (pending.has(id)) return pending.get(id);
  if (Date.now() < (retry.get(id) ?? 0)) return;
  // Bound network concurrency even for forged/rapidly changing optical data.
  if (pending.size >= 4) return;
  const job = (async () => {
    const file = path.join(DIRECTORY, `${id}.jpg`);
    let bytes = readFileLimited(file, IMAGE_LIMIT);
    if (!bytes) {
      const name = (await loadMap())[String(id)];
      if (!name || !NAME.test(name)) return;
      if (Date.now() - downloadWindow >= 60000) { downloadWindow = Date.now(); downloadCount = 0; }
      if (downloadCount >= 120) return;
      downloadCount++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try { bytes = await readLimited(await safeResponse(CDN + name + ".jpg", controller.signal), IMAGE_LIMIT); }
      finally { clearTimeout(timeout); }
      if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("Unexpected DEV icon image format");
      if (mayCache(bytes.length)) {
        fs.mkdirSync(DIRECTORY, { recursive: true });
        fs.writeFileSync(file, bytes);
      }
    }
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return;
    return remember(id, "data:image/jpeg;base64," + bytes.toString("base64"));
  })();
  pending.set(id, job);
  try { return await job; }
  finally {
    pending.delete(id);
    if (!memory.has(id)) retry.set(id, Date.now() + 30000);
    while (retry.size > 256) retry.delete(retry.keys().next().value!);
  }
}
