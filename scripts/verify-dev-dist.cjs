const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(process.argv[2] || "dist/com.deckbridge.wow.dev.sdPlugin");
if (path.basename(root) !== 'com.deckbridge.wow.dev.sdPlugin') throw new Error('DEV plugin directory required');

const expected = [
    "manifest.json",
    "bin/plugin.js",
    "bin/package.json",
    "helpers/keysender.ps1",
    "helpers/keysender-dev.cs",
    "helpers/live-reader.cs",
    "helpers/live-icons.ps1",
    "ui/slot.html",
    "ui/emote.html",
    "ui/utility.html",
    "ui/reader.html",
    "imgs/duotone/brand.png",
  "imgs/duotone/brand@2x.png",
  "imgs/duotone/slot.png",
  "imgs/duotone/slot@2x.png",
  "imgs/duotone/emote.png",
  "imgs/duotone/emote@2x.png",
  "imgs/duotone/map.png",
  "imgs/duotone/map@2x.png",
  "imgs/duotone/backpack.png",
  "imgs/duotone/backpack@2x.png",
  "imgs/duotone/character.png",
  "imgs/duotone/character@2x.png",
  "imgs/duotone/spellbook.png",
  "imgs/duotone/spellbook@2x.png",
  "imgs/duotone/reader-off.png",
  "imgs/duotone/reader-off@2x.png",
  "imgs/duotone/reader-on.png",
  "imgs/duotone/reader-on@2x.png",
  "imgs/duotone/settings.png",
  "imgs/duotone/settings@2x.png",
  "imgs/duotone/website.png",
  "imgs/duotone/website@2x.png"
];

function listFiles(dir, prefix = "") {
    const result = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relative = path.posix.join(prefix, entry.name);
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            result.push(...listFiles(full, relative));
        } else if (entry.isFile()) {
            result.push(relative);
        } else {
            throw new Error(`Nieobslugiwany element: ${relative}`);
        }
    }

    return result;
}

if (!fs.existsSync(root)) {
    console.error("BLAD: Brak katalogu dystrybucyjnego DEV.");
    process.exit(1);
}

const actual = listFiles(root);
const expectedSet = new Set(expected);
const actualSet = new Set(actual);

const missing = [...expectedSet].filter(file => !actualSet.has(file));
const unexpected = actual.filter(file => !expectedSet.has(file));

for (const file of missing) {
    console.error(`BRAK: ${file}`);
}

for (const file of unexpected) {
    console.error(`NIEOCZEKIWANY PLIK: ${file}`);
}

if (missing.length || unexpected.length) {
    console.error("BLAD: Nieprawidlowa zawartosc wydania DEV.");
    process.exit(1);
}

const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "manifest.json"), "utf8")
);

if (
    manifest.UUID !== "com.deckbridge.wow.dev" ||
    manifest.Actions?.[0]?.UUID !== "com.deckbridge.wow.dev.slot" ||
    manifest.CodePath !== "bin/plugin.js"
) {
    console.error("BLAD: Nieprawidlowy manifest DEV.");
    process.exit(1);
}

execFileSync(process.execPath, [
    "--check",
    path.join(root, "bin/plugin.js")
]);

console.log(`OK: Dokladnie ${actual.length} oczekiwanych plikow.`);
console.log("OK: Brak dodatkowych plikow i logow.");
console.log("OK: Manifest DEV i skladnia JavaScript.");
console.log("OK: Wydanie DEV zweryfikowane.");
