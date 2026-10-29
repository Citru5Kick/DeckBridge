# DeckBridge — usage and troubleshooting

[Polski](USER-GUIDE.pl.md) · [Installation and requirements](README.md) · [Privacy](PRIVACY.md)

## Setup

In WoW, open the editor using the minimap button or `/dbzones`. Select a zone, enable it and choose its source bar. Automatic fitting snaps the zone to a standard action bar. You can also drag, resize using its bottom-right handle and rotate it by 90 degrees. The selected zone has a gold outline. Close the editor when finished: outlines disappear while small capture markers remain. Custom action bars require separate testing.

In Stream Deck, add Action Slot. Select the matching zone and position 1–12. Set the actual `WTF/Account/<account>/SavedVariables/DeckBridgeDev.lua` file if automatic discovery does not select the right one. Do not select another DeckBridge edition's file. After the first login, `/reload` writes initial data to disk.

Place Screen Reader on the same device page as Action Slot. It defaults to OFF; click to authorize capture. Pixels are captured only while WoW is foreground. Closing the game, switching capture off or removing the last required control stops the reader. Returning requires another click. OFF applies to screen capture; the plugin can still handle keys and read the data file.

Emote provides a selection list. Map & Quests, Backpack, Character and Spellbook are separate actions. `/dbcheck` checks addon key bindings. Review conflicts with modified F1–F12 and Ctrl+Alt+Shift+A–Q. The first press during helper startup can be dropped; try again after startup.

## Updating

1. Download a compatible release package from Releases and compare its SHA-256 with the published checksums. Note your current version.
2. Switch Screen Reader OFF and close WoW. Back up this edition's addon/plugin folders, `DeckBridgeDev.lua`, and Stream Deck settings/assignments. User data is not included in release packages.
3. Locate the actual `Interface/AddOns/DeckBridgeDev` and `%APPDATA%/Elgato/StreamDeck/Plugins/com.deckbridge.wow.dev.sdPlugin` paths. Only these two folders are update targets. Do not copy the whole addon tree, Plugins directory or the ZIP's parent directory.
4. Stop only `com.deckbridge.wow.dev` before replacing plugin files. If you do not know how to stop it separately, ask for help before overwriting. Do not close all of Stream Deck to restart this edition.
5. Install the matching addon/plugin pair and start only this plugin. Preserve technical folder names. Do not replace SavedVariables, profiles or another DeckBridge edition.
6. Start the game, check `/dbcheck`, one action and an icon change. Enable the reader manually again. If verification fails, stop the updated edition and use your backups.

## Uninstalling

Switch the reader OFF, close WoW and stop only `com.deckbridge.wow.dev`. Remove this edition's actions from Stream Deck profiles if no longer needed. After checking full paths, remove only the `DeckBridgeDev` addon folder and `com.deckbridge.wow.dev.sdPlugin` plugin folder.

You may retain `DeckBridgeDev.lua` SavedVariables and `%USERPROFILE%/.deckbridge-dev/icons-v1` for a later installation. Deleting them is a separate optional decision: close the game and stop the plugin first, back up the data and verify that it belongs to this edition. Do not delete entire WTF, account or Plugins directories, or another DeckBridge edition's data.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No DeckBridge category | Was the built plugin folder installed rather than the source ZIP? Are the README requirements met? |
| Missing data or old icons | Log in, use `/reload`, and check the `DeckBridgeDev.lua` path/name. WoW writes the disk file when saving, not on every ability change. |
| Icons change only after `/reload` | Enable Screen Reader on a page with Action Slot, make WoW foreground and check the active zone and visible markers. |
| Reader returned to OFF | After closing the game, leaving the page/removing required controls or restarting, enable it manually. This is intentional. |
| Reader ERROR | Press the control to retry after an error. Check Windows PowerShell availability and report recurring errors. Do not bypass system protections to work around the error. |
| Button does not activate an action | Make WoW foreground, allow the helper to start, check `/dbcheck` and key conflicts. Leave combat before rechecking binding changes. |
| Some icons are blank | Check access to the icon services described in PRIVACY.md. Reading an identifier and downloading its image are separate operations. |

Include DeckBridge, WoW, Windows and Stream Deck versions, display scaling, steps and results in reports. Redact logs/screenshots. Never post SavedVariables, account directory names or profile exports. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
