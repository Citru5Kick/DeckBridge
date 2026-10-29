export type ReaderPhase = "off" | "waiting" | "starting" | "on" | "stopping" | "error";
let enabled = false; // Deliberately not persisted: every plugin session starts without consent.
let phase: ReaderPhase = "off";
const controls = new Set<string>();
const listeners = new Set<() => void>();
function notify() { for (const listener of listeners) queueMicrotask(listener); }
export function readerStatus() { return { enabled, phase }; }
export function setReaderPhase(value: ReaderPhase): void { if (phase !== value) { phase = value; notify(); } }
export function setReaderEnabled(value: boolean): void {
  if (value && controls.size === 0) return;
  if (enabled === value) return;
  enabled = value;
  phase = value ? "waiting" : (phase === "on" || phase === "starting" ? "stopping" : "off");
  notify();
}
export function showReaderControl(id: string): void { controls.add(id); }
export function hideReaderControl(id: string): void { controls.delete(id); if (!controls.size) setReaderEnabled(false); }
export function onReaderChanged(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
