# DeckBridge 0.1.13 — live icon guide

Duotone combines cyan #4BD8F5 and gold #F2CE7B on navy #101F30. Plugin icons are 72 and 144 px; addon textures are 32 px TGA. Editable source: scripts/create-duotone-icons.ps1. Ability icons still come from WoW.

Actions: Action Slot, Emote, Map & Quests, Backpack, Character, Spellbook and Screen Reader. The older World Map identifier remains a hidden alias to preserve assignments.

Screen Reader defaults to OFF. Place it together with Action Slot on the active page and click to authorize capture. Capture runs only while WoW is the foreground window. Closing the game or removing the last required button turns the reader off; restarting requires another click. A lease mechanism stops orphaned processes. The plugin, keyboard handling and SavedVariables reading operate independently of this toggle.

The minimap icon opens the zone editor and can be dragged around the minimap. /dbzones also opens the editor; /dbcheck checks bindings. Select a zone, snap it to a standard action bar, move, resize or rotate it by 90 degrees. Closing the editor hides outlines while small capture markers remain visible. Custom action bars require separate verification. The globe displays https://citru5kick.pl for copying.

The plugin uses com.deckbridge.wow.dev, the DeckBridgeDev addon and DeckBridgeDevDB. Preserve these technical identifiers and existing SavedVariables when updating.

Automated checks cover TypeScript, the DEV build, JS syntax, the manifest and package completeness. Mocked or synthetic tests do not verify in-game Lua, real screen capture or hardware behavior. These require manual testing.

Updates, uninstallation and troubleshooting: [user guide](USER-GUIDE.en.md). The release manifest does not configure a Node.js debugger.
