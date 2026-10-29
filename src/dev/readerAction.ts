import streamDeck, { action, SingletonAction, type KeyAction, type KeyDownEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import { readerStatus, setReaderEnabled, showReaderControl, hideReaderControl, onReaderChanged } from "./readerControl";

@action({ UUID: "com.deckbridge.wow.dev.reader" })
export class ReaderAction extends SingletonAction {
  private buttons = new Map<string, Pick<KeyAction<{}>, "setState" | "setTitle">>();
  private painting = false;
  private dirty = false;
  constructor() {
    super();
    onReaderChanged(() => { void this.paint().catch(error => streamDeck.logger.error(String(error))); });
  }
  private async paint() {
    this.dirty = true;
    if (this.painting) return;
    this.painting = true;
    try {
      while (this.dirty) {
        this.dirty = false;
        const { phase } = readerStatus();
        const label = { off: "Reader\nOFF", waiting: "Add\nAction Slot", starting: "Reader\nStarting", on: "Reader\nON", stopping: "Reader\nStopping", error: "Reader\nERROR" }[phase];
        for (const button of this.buttons.values()) {
          await button.setState(phase === "on" ? 1 : 0);
          if (readerStatus().phase !== phase) { this.dirty = true; break; }
          await button.setTitle(label);
        }
      }
    } finally { this.painting = false; }
  }
  override async onWillAppear(ev: WillAppearEvent) {
    if (!ev.action.isKey()) return;
    this.buttons.set(ev.action.id, ev.action);
    showReaderControl(ev.action.id);
    await this.paint();
  }
  override onWillDisappear(ev: WillDisappearEvent) { this.buttons.delete(ev.action.id); hideReaderControl(ev.action.id); }
  override onKeyDown(_ev: KeyDownEvent) { setReaderEnabled(!readerStatus().enabled); }
}
