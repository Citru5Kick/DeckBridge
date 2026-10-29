import fs from "node:fs";
import path from "node:path";

const WOW_FOLDERS = [
  "World of Warcraft",
  path.join("battlenet", "World of Warcraft"),
  path.join("Program Files (x86)", "World of Warcraft"),
  path.join("Program Files", "World of Warcraft"),
  path.join("Games", "World of Warcraft"),
];

export function findSavedVariables(fileName = "DeckBridgeDev.lua"): string[] {
  const results = new Set<string>();

  const drives = "CDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const drive of drives) {
    for (const folder of WOW_FOLDERS) {
      const accountsPath = path.join(
        `${drive}:\\`,
        folder,
        "_retail_",
        "WTF",
        "Account"
      );

      if (!fs.existsSync(accountsPath)) continue;

      try {
        const accounts = fs.readdirSync(accountsPath, {
          withFileTypes: true
        });

        for (const account of accounts) {
          if (!account.isDirectory()) continue;

          const savedFile = path.join(
            accountsPath,
            account.name,
            "SavedVariables",
            fileName
          );

          if (fs.existsSync(savedFile)) {
            results.add(savedFile);
          }
        }
      } catch {
        // Folder niedostępny — pomijamy.
      }
    }
  }

  return [...results];
}
