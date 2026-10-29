import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const MAX_SLOT = 96;
let processHandle: ChildProcessWithoutNullStreams | undefined;
let ready = false;
let serial = 0;
const pressed = new Map<string, string>();
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../helpers/keysender.ps1");
const shell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
function write(command: string): void {
  if (!processHandle?.stdin.writable || processHandle.stdin.destroyed) return;
  processHandle.stdin.write(command + "\n", () => {});
}
export function warmUp(): void {
  if (processHandle) return;
  const child = spawn(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { windowsHide: true });
  processHandle = child;
  ready = false;
  let startup = "";
  child.stdout.on("data", data => {
    startup = (startup + String(data)).slice(-64);
    if (startup.includes("ready")) ready = true;
  });
  child.stderr.on("data", () => {});
  child.stdin.on("error", () => { ready = false; pressed.clear(); });
  child.on("error", () => { ready = false; pressed.clear(); });
  child.on("close", () => {
    if (processHandle === child) { processHandle = undefined; ready = false; pressed.clear(); }
  });
}
export function keyDown(action: string, slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SLOT) return;
  press(action, slot);
}
export function keyDownUtility(action: string, slot: number): void {
  if (!Number.isInteger(slot) || slot < 97 || slot > 113) return;
  press(action, slot);
}
function press(action: string, slot: number): void {
  if (pressed.has(action)) return;
  warmUp();
  // Drop presses during startup rather than replaying them after compilation.
  if (!ready) return;
  const token = `p${++serial}`;
  pressed.set(action, token);
  write(`D ${token} ${slot} ${Date.now()}`);
}
export function keyUp(action: string): void {
  const token = pressed.get(action);
  if (!token) return;
  pressed.delete(action);
  write(`U ${token}`);
}
export function releaseAllKeys(): void { pressed.clear(); write("R"); }
const heartbeat = setInterval(() => { for (const token of pressed.values()) write(`H ${token}`); }, 400);
heartbeat.unref();
process.once("exit", () => { releaseAllKeys(); processHandle?.stdin.end(); });
