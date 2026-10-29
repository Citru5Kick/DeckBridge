import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyAction,
  KeyDownEvent,
  KeyUpEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import fs from "node:fs";
import type { Entry } from "../db";
import { loadSlots, LiveState, type SavedSnapshot } from "./data";
import { iconDataUri } from "./icons";
import { keyDown, keyUp, releaseAllKeys, warmUp, MAX_SLOT } from "./keys";
import { deckBridgeSlot } from "../actionBars";
import path from "node:path";
import { findSavedVariables } from "../wowPaths";
import { startLiveIcons, stopLiveIcons } from "./liveIcons";
import { readerStatus, setReaderEnabled, onReaderChanged } from "./readerControl";



const SAVED_VARIABLES_FILE = "DeckBridgeDev.lua";
const DATABASE_NAME = "DeckBridgeDevDB";

type ActionSettings = {
  slot?: string | number;
  bar?: string | number;
  position?: string | number;
};
type GlobalSettings = { file?: string; liveIcons?: string };

function isValidSavedVariablesFile(file?: string): file is string {
  return Boolean(
    file &&
    path.basename(file).toLowerCase() === SAVED_VARIABLES_FILE.toLowerCase() &&
    fs.existsSync(file)
  );
}

const visible = new Map<string, { action: KeyAction<ActionSettings>; settings: ActionSettings }>();
let currentFile: string | undefined;
let watched: string | undefined;
let liveEnabled = false;
const liveState = new LiveState();
let revision = 0;
const painted = new Map<string, { input: string; output: string; complete: boolean }>();
let refreshPending = false;
let refreshing = false;

function syncLiveReader() {
  const status = readerStatus();
  if (liveEnabled !== status.enabled) { liveState.clear(); revision++; }
  liveEnabled = status.enabled;
  if (!liveEnabled || visible.size === 0) {
    stopLiveIcons(liveEnabled ? "waiting" : status.phase === "error" ? "error" : "off");
    return;
  }
  startLiveIcons((context, slots) => {
    if (liveState.update(context, slots)) { revision++; void refreshAll(); }
  }, message => streamDeck.logger.warn(message));
}
onReaderChanged(() => { syncLiveReader(); void refreshAll(); });

const slotOf = (s: ActionSettings): number | undefined => {
  if (s.bar !== undefined || s.position !== undefined) {
    return deckBridgeSlot(
      Number(s.bar ?? 1),
      Number(s.position ?? 1)
    );
  }

  if (s.slot !== undefined) {
    const n = Number(s.slot);
    return Number.isInteger(n) && n >= 1 && n <= MAX_SLOT
      ? n
      : undefined;
  }

  // Nowy przycisk bez zapisanych ustawień:
  // domyślnie Pasek 1, Pozycja 1.
  return deckBridgeSlot(1, 1);
};

function watch(file?: string) {
  if (watched === file) return;
  if (watched) fs.unwatchFile(watched);
  watched = file;
  // SavedVariables is rewritten when you /reload or log out.
  if (file) fs.watchFile(file, { interval: 3000 }, () => { revision++; void refreshAll(); });
}

async function paint(
  a: KeyAction<ActionSettings>,
  slot: number | undefined,
  slots: Map<number, Entry>
) {
  const e = slot ? slots.get(slot) : undefined;
  const input = `${slot ?? 0}:${e?.icon ?? 0}`;
  const old = painted.get(a.id);
  if (old?.input === input && old.complete) return;
  const currentRevision = revision;

  const img = e?.icon
    ? await iconDataUri(e.icon).catch((err) => {
        streamDeck.logger.error(String(err));
        return undefined;
      })
    : undefined;

  if (currentRevision !== revision || !visible.has(a.id) || slotOf(visible.get(a.id)!.settings) !== slot) return;
  const output = `${slot ?? 0}:${img ? e!.icon : 0}`;
  if (old?.output !== output) {
    await a.setImage(img);
    await a.setTitle(img ? "" : slot ? String(slot) : "");
  }
  painted.set(a.id, { input, output, complete: !e?.icon || Boolean(img) });
}

async function refreshAll() {
  refreshPending = true;
  if (refreshing) return;
  refreshing = true;
  try {
    while (refreshPending) {
      refreshPending = false;
      await refreshOnce();
    }
  } catch (error) {
    streamDeck.logger.error(`DEV refresh failed: ${String(error)}`);
  } finally {
    refreshing = false;
  }
}

async function refreshOnce() {
  if (!visible.size) return;
  watch(currentFile);
  let saved: SavedSnapshot | undefined;
  if (currentFile) {
    try {
      saved = loadSlots(currentFile, DATABASE_NAME);
    } catch (e) {
      streamDeck.logger.error(`Cannot read DEV SavedVariables: ${String(e)}`);
    }
  }
  const slots = liveEnabled ? liveState.overlay(saved) : saved?.slots ?? new Map<number, Entry>();
  // Four bounded workers avoid serial network waits and avoid unbounded requests.
  const work = [...visible.values()];
  const snapshotRevision = revision;
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, work.length) }, async () => {
    while (index < work.length && snapshotRevision === revision) { const v = work[index++]; await paint(v.action, slotOf(v.settings), slots); }
  }));
}

const refreshTimer = setInterval(() => {
  if (!visible.size) return;
  if (liveState.expire()) revision++;
  void refreshAll();
}, 1000);
refreshTimer.unref();



/** Call once after registering actions. Global settings hold the SavedVariables path. */
export function initGlobalSettings() {
  streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>(async (ev) => {
    revision++;
    const configuredFile = ev.settings.file?.trim();

    // Zachowaj sciezke ustawiona przez uzytkownika.
    if (isValidSavedVariablesFile(configuredFile)) {
      if (currentFile !== configuredFile) { liveState.clear(); painted.clear(); }
      currentFile = configuredFile;
      await refreshAll();
      return;
    }

    // Automatyczne wyszukiwanie SavedVariables.
    const found = findSavedVariables(SAVED_VARIABLES_FILE);

    if (found.length === 1) {
      currentFile = found[0];

      streamDeck.logger.info("DEV SavedVariables detected.");

      await streamDeck.settings.setGlobalSettings({
        ...ev.settings,
        file: currentFile
      });

      await refreshAll();
      return;
    }

    currentFile = undefined;

    if (found.length > 1) {
  streamDeck.logger.warn(
    `Multiple DEV SavedVariables files found: ${found.length}`
  );
} else {
  streamDeck.logger.warn(
    "SavedVariables not found. Configure the path manually."
  );
}

    await refreshAll();
  });

  setTimeout(() => {
  void streamDeck.settings.getGlobalSettings<GlobalSettings>()
    .then(async (settings) => {

      const configuredFile = settings.file?.trim();

      if (isValidSavedVariablesFile(configuredFile)) {
        currentFile = configuredFile;


        await refreshAll();
      }
    })
    .catch((error) => {
      streamDeck.logger.error(
        `DeckBridge getGlobalSettings error: ${String(error)}`
      );
    });
	}, 500);
}

@action({
  UUID: "com.deckbridge.wow.dev.slot"
})

export class SlotAction extends SingletonAction<ActionSettings> {
  constructor() {
    super();
    warmUp();
  }

  override async onWillAppear(ev: WillAppearEvent<ActionSettings>) {
  if (!ev.action.isKey()) return;

  streamDeck.logger.info(
    `DeckBridge button appeared: ${ev.action.id}`
  );

  visible.set(ev.action.id, {
    action: ev.action,
    settings: ev.payload.settings
  });
  revision++;
  syncLiveReader();

	streamDeck.logger.info(
		`DeckBridge button settings: ${JSON.stringify(ev.payload.settings)}`
	);

  streamDeck.logger.info(
    `DeckBridge visible buttons: ${visible.size}`
  );

  await refreshAll();
}

  override onWillDisappear(ev: WillDisappearEvent<ActionSettings>) {
    keyUp(ev.action.id);
    visible.delete(ev.action.id);
    painted.delete(ev.action.id);
    if (!visible.size) { setReaderEnabled(false); releaseAllKeys(); watch(undefined); liveState.clear(); }
    syncLiveReader();
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionSettings>) {
    keyUp(ev.action.id);
    revision++;
    const v = visible.get(ev.action.id);
    if (v) v.settings = ev.payload.settings;
    await refreshAll();
  }

  override onKeyDown(ev: KeyDownEvent<ActionSettings>) {
    const slot = slotOf(ev.payload.settings);
    if (slot) keyDown(ev.action.id, slot);
  }

  override onKeyUp(ev: KeyUpEvent<ActionSettings>) {
    keyUp(ev.action.id);
  }
}
