const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const pluginDir = path.resolve("com.deckbridge.wow.dev.sdPlugin");
const manifest = JSON.parse(
    fs.readFileSync(path.join(pluginDir, "manifest.json"), "utf8")
);

const required = [
    "manifest.json",
    manifest.CodePath,
    "bin/package.json",
    "helpers/keysender.ps1",
    "helpers/keysender-dev.cs",
    "helpers/live-reader.cs",
    "helpers/live-icons.ps1"
];

function addImage(image) {
    if (!image) return;
    required.push(`${image}.png`, `${image}@2x.png`);
}

addImage(manifest.Icon);
addImage(manifest.CategoryIcon);

for (const action of manifest.Actions ?? []) {
    if (action.PropertyInspectorPath) {
        required.push(action.PropertyInspectorPath);
    }

    addImage(action.Icon);

    for (const state of action.States ?? []) {
        addImage(state.Image);
    }
}

let errors = 0;

for (const file of new Set(required)) {
    if (!fs.existsSync(path.join(pluginDir, file))) {
        console.error(`BRAK: ${file}`);
        errors++;
    }
}

const logsDir = path.join(pluginDir, "logs");

if (fs.existsSync(logsDir)) {
    console.log("INFO: Wykryto katalog logs — należy wykluczyć go z paczki.");
}

if (errors === 0) {
    try {
        execFileSync(process.execPath, [
            "--check",
            path.join(pluginDir, manifest.CodePath)
        ]);
        console.log("OK: Składnia plugin.js");
    } catch {
        console.error("BLAD: Niepoprawna skladnia plugin.js");
        errors++;
    }
}

if (errors > 0) {
    console.error(`Kontrola nieudana: ${errors} bledow.`);
    process.exit(1);
}

console.log(`OK: ${new Set(required).size} wymaganych plikow.`);
console.log("OK: Kontrola pakietu DEV zakonczona.");
