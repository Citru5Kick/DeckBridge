// Fixed utility bank, distinct from action slots 1-96. Keep aligned with UtilityActions.lua.
export const QUEST_SLOT = 97;
export const BACKPACK_SLOT = 98;
export const WORLD_MAP_SLOT = 111;
export const CHARACTER_SLOT = 112;
export const SPELLBOOK_SLOT = 113;
export const EMOTES = [
  { id: "wave", label: "Wave", token: "WAVE", slot: 99 },
  { id: "dance", label: "Dance", token: "DANCE", slot: 100 },
  { id: "cheer", label: "Cheer", token: "CHEER", slot: 101 },
  { id: "clap", label: "Clap", token: "APPLAUD", slot: 102 },
  { id: "bow", label: "Bow", token: "BOW", slot: 103 },
  { id: "salute", label: "Salute", token: "SALUTE", slot: 104 },
  { id: "laugh", label: "Laugh", token: "LAUGH", slot: 105 },
  { id: "thank", label: "Thank", token: "THANK", slot: 106 },
  { id: "hello", label: "Hello", token: "HELLO", slot: 107 },
  { id: "bye", label: "Goodbye", token: "BYE", slot: 108 },
  { id: "point", label: "Point", token: "POINT", slot: 109 },
  { id: "shrug", label: "Shrug", token: "SHRUG", slot: 110 },
] as const;
export function selectEmote(value: unknown) {
  return value === undefined ? EMOTES[0] : EMOTES.find(emote => emote.id === value);
}
