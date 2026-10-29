import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Entry } from "../db";
import { decodeLiveFrame } from "./liveProtocol";
import { readerStatus, setReaderEnabled, setReaderPhase, type ReaderPhase } from "./readerControl";

const helper = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../helpers/live-icons.ps1");
const shell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
let child: ChildProcessWithoutNullStreams | undefined;
let running = false;
let stopping = false;
let finishPhase: ReaderPhase = "off";
let heartbeat: ReturnType<typeof setInterval> | undefined;
function endHeartbeat() { if (heartbeat) clearInterval(heartbeat); heartbeat = undefined; }
export function startLiveIcons(update: (context: number, slots: Map<number, Entry>) => void, log: (message: string) => void): void {
  if (!readerStatus().enabled || child || running) return;
  running = true;
  stopping = false;
  setReaderPhase("starting");
  const proc = spawn(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helper], { windowsHide: true });
  child = proc;
  function fail(message: string) {
    log(message);
    finishPhase = "error";
    setReaderEnabled(false);
    setReaderPhase("error");
    stopLiveIcons("error");
  }
  function pulse() {
    if (!running || stopping || !readerStatus().enabled || child !== proc) return;
    if (proc.stdin.writable && !proc.stdin.destroyed) proc.stdin.write("PING\n", () => {});
  }
  proc.stdin.on("error", () => { if (running) fail("Screen Reader: lost helper connection."); });
  proc.on("spawn", () => {
    if (child !== proc || stopping || !readerStatus().enabled) return;
    pulse();
    heartbeat = setInterval(pulse, 500);
    heartbeat.unref();
    setReaderPhase("on");
  });
  let pending = "";
  proc.stdout.on("data", chunk => {
    if (!running || stopping || !readerStatus().enabled || child !== proc) return;
    pending += String(chunk);
    if (pending.length > 16384) { pending = ""; fail("Screen Reader: invalid helper output."); return; }
    let newline: number;
    while ((newline = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, newline).trim();
      pending = pending.slice(newline + 1);
      if (line === "DBREADER_GAME_EXITED") {
        setReaderEnabled(false);
        stopLiveIcons("off");
        return;
      }
      const frame = decodeLiveFrame(line);
      if (frame) update(frame.context, frame.slots);
    }
  });
  proc.stderr.on("data", () => { if (running) fail("Screen Reader: capture failed. Reader stopped; click to retry."); });
  proc.on("error", () => fail("Screen Reader: cannot start helper."));
  proc.on("close", () => {
    if (child !== proc) return;
    const unexpected = !stopping;
    child = undefined;
    running = false;
    stopping = false;
    endHeartbeat();
    if (unexpected) {
      setReaderEnabled(false);
      setReaderPhase("error");
      log("Screen Reader: helper exited. No automatic restart.");
    } else setReaderPhase(finishPhase);
  });
}
export function stopLiveIcons(phase: ReaderPhase = "off"): void {
  finishPhase = phase;
  running = false;
  endHeartbeat();
  const proc = child;
  if (!proc) { stopping = false; setReaderPhase(phase); return; }
  if (stopping) return;
  stopping = true;
  setReaderPhase(phase === "error" ? "error" : "stopping");
  // OFF is published only after the close event. EOF/lease expiry is a fallback.
  proc.stdin.end();
  try { proc.kill(); } catch { setReaderPhase("error"); }
}
process.once("exit", () => stopLiveIcons());
