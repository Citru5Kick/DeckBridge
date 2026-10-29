import streamDeck from "@elgato/streamdeck";
import { SlotAction, initGlobalSettings } from "./slot";
import { ReaderAction } from "./readerAction";
import { EmoteAction, QuestAction, BackpackAction, WorldMapAction, CharacterAction, SpellbookAction } from "./utilityActions";

streamDeck.actions.registerAction(new SlotAction());
streamDeck.actions.registerAction(new ReaderAction());
streamDeck.actions.registerAction(new EmoteAction());
streamDeck.actions.registerAction(new QuestAction());
streamDeck.actions.registerAction(new BackpackAction());
streamDeck.actions.registerAction(new WorldMapAction());
streamDeck.actions.registerAction(new CharacterAction());
streamDeck.actions.registerAction(new SpellbookAction());
initGlobalSettings();
streamDeck.connect();
