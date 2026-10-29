import { action, SingletonAction, type DidReceiveSettingsEvent, type KeyDownEvent, type KeyUpEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import { keyDownUtility, keyUp, warmUp } from "./keys";
import { BACKPACK_SLOT, QUEST_SLOT, CHARACTER_SLOT, SPELLBOOK_SLOT, selectEmote } from "./utilities";

type UtilitySettings = { emote?: string };
const MAP_AND_QUESTS = { slot: QUEST_SLOT, label: "Map &\nQuests" };
abstract class UtilityAction extends SingletonAction<UtilitySettings> {
  constructor() { super(); warmUp(); }
  protected abstract selection(settings: UtilitySettings): { slot: number; label: string } | undefined;
  override async onWillAppear(ev: WillAppearEvent<UtilitySettings>) {
    warmUp();
    if (ev.action.isKey()) await ev.action.setTitle(this.selection(ev.payload.settings)?.label ?? "Select emote");
  }
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<UtilitySettings>) {
    keyUp(ev.action.id);
    if (ev.action.isKey()) await ev.action.setTitle(this.selection(ev.payload.settings)?.label ?? "Select emote");
  }
  override onKeyDown(ev: KeyDownEvent<UtilitySettings>) {
    const selected = this.selection(ev.payload.settings);
    if (selected) keyDownUtility(ev.action.id, selected.slot);
  }
  override onKeyUp(ev: KeyUpEvent<UtilitySettings>) { keyUp(ev.action.id); }
  override onWillDisappear(ev: WillDisappearEvent<UtilitySettings>) { keyUp(ev.action.id); }
}
@action({ UUID: "com.deckbridge.wow.dev.emote" })
export class EmoteAction extends UtilityAction {
  protected selection(settings: UtilitySettings) { return selectEmote(settings.emote); }
}
@action({ UUID: "com.deckbridge.wow.dev.quests" })
export class QuestAction extends UtilityAction {
  protected selection() { return MAP_AND_QUESTS; }
}
@action({ UUID: "com.deckbridge.wow.dev.backpack" })
export class BackpackAction extends UtilityAction {
  protected selection() { return { slot: BACKPACK_SLOT, label: "Backpack" }; }
}
@action({ UUID: "com.deckbridge.wow.dev.worldmap" })
export class WorldMapAction extends UtilityAction {
  // Existing World Map buttons remain usable, but new buttons use Map & Quests.
  protected selection() { return MAP_AND_QUESTS; }
}
@action({ UUID: "com.deckbridge.wow.dev.character" })
export class CharacterAction extends UtilityAction {
  protected selection() { return { slot: CHARACTER_SLOT, label: "Character" }; }
}
@action({ UUID: "com.deckbridge.wow.dev.spellbook" })
export class SpellbookAction extends UtilityAction {
  protected selection() { return { slot: SPELLBOOK_SLOT, label: "Spellbook" }; }
}
