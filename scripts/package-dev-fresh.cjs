// Creates a new release directory without replacing earlier packages.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
assert.equal(process.cwd(), root, 'Run from the repository root');
const destination = path.join(root, `dev-release-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const plugin = 'com.deckbridge.wow.dev.sdPlugin';
const sources = new Map();
function add(source, relative) {
  assert(fs.lstatSync(source).isFile(), `Not a regular file: ${source}`);
  assert(!sources.has(relative), `Duplicate: ${relative}`);
  sources.set(relative, source);
}
const files = [
  'manifest.json', 'bin/plugin.js', 'bin/package.json', 'helpers/keysender.ps1', 'helpers/live-icons.ps1', 'ui/slot.html',
  'helpers/keysender-dev.cs', 'helpers/live-reader.cs',
  'ui/emote.html', 'ui/utility.html',
  'ui/reader.html',
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
assert(fs.lstatSync(path.join(root, plugin)).isDirectory());
for (const file of files) add(path.join(root, plugin, file), path.join(plugin, file));
for (const file of ['DeckBridgeDev.lua', 'LiveIcons.lua', 'UtilityActions.lua', 'DeckBridgeDev.toc', 'Textures/Duotone/brand.tga', 'Textures/Duotone/settings.tga', 'Textures/Duotone/website.tga']) {
  add(path.join(root, 'addon/DeckBridgeDev', file), path.join('addon/DeckBridgeDev', file));
}
for (const lang of ['pl', 'en']) add(path.join(root, `LIVE-ICONS.${lang}.md`), `LIVE-ICONS.${lang}.md`);
for (const file of ['assets/social/twitch.svg', 'assets/social/website.svg']) add(path.join(root, file), file);
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.txt', 'README.md', 'README.pl.md', 'PRIVACY.md', 'USER-GUIDE.en.md', 'USER-GUIDE.pl.md', 'TESTING.en.md', 'TESTING.pl.md', 'CONTRIBUTING.md', 'SECURITY.md', 'duotone-preview.png']) add(path.join(root, file), file);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expected = [...sources].map(([relative, source]) => ({ path: relative, sha256: hash(source) }));
fs.mkdirSync(destination); // Atomic refusal if the directory already exists.
for (const [relative, source] of sources) {
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
}
for (const entry of expected) assert.equal(hash(path.join(destination, entry.path)), entry.sha256, entry.path);
const manifest = JSON.parse(fs.readFileSync(path.join(destination, plugin, 'manifest.json'), 'utf8'));
assert.equal(manifest.UUID, 'com.deckbridge.wow.dev');
assert.equal(manifest.CodePath, 'bin/plugin.js');
assert.deepEqual(manifest.Actions.map(action => action.UUID).sort(), ['slot','emote','quests','backpack','worldmap','character','spellbook','reader'].map(name => 'com.deckbridge.wow.dev.' + name).sort());
assert(!fs.existsSync(path.join(destination, plugin, 'logs')));
const toc = fs.readFileSync(path.join(destination, 'addon/DeckBridgeDev/DeckBridgeDev.toc'), 'utf8');
assert.match(toc, /^## SavedVariables: DeckBridgeDevDB\r?$/m);
assert.match(toc, /^DeckBridgeDev\.lua\r?$/m);
const bundle = fs.readFileSync(path.join(destination, plugin, 'bin/plugin.js'), 'utf8');
assert(bundle.includes('com.deckbridge.wow.dev.slot'));
assert(!bundle.includes('com.deckbridge.wow.slot'));
assert(bundle.includes('DeckBridgeDevDB'));
assert(bundle.includes('DeckBridgeDev.lua'));
assert(bundle.includes('DBDEV3'));
assert(bundle.includes('live-icons.ps1'));
// Confirm that the action entry uses the expected database and data file.
const entry = fs.readFileSync(path.join(root, 'src/dev/slot.ts'), 'utf8');
assert(entry.includes('const SAVED_VARIABLES_FILE = "DeckBridgeDev.lua";'));
assert(entry.includes('const DATABASE_NAME = "DeckBridgeDevDB";'));
assert(entry.includes('loadSlots(currentFile, DATABASE_NAME)'));
assert(entry.includes('findSavedVariables(SAVED_VARIABLES_FILE)'));
assert(!entry.includes('process.env.DECKBRIDGE_TARGET'));
assert.match(toc, /^LiveIcons\.lua\r?$/m);
assert.match(toc, /^UtilityActions\.lua\r?$/m);
execFileSync(process.execPath, ['--check', path.join(destination, plugin, 'bin/plugin.js')], { stdio: 'inherit' });
// All JavaScript dependencies are bundled; runtime imports must be Node built-ins.
const ts = require('typescript');
const { isBuiltin } = require('node:module');
const ast = ts.createSourceFile('plugin.js', bundle, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
function checkImports(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    if (node.moduleSpecifier) assert(isBuiltin(node.moduleSpecifier.text), `External runtime import: ${node.moduleSpecifier.text}`);
  }
  if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
    assert(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && isBuiltin(node.arguments[0].text), 'Unresolved dynamic runtime import');
  }
  ts.forEachChild(node, checkImports);
}
checkImports(ast);
const actual = [];
function inventory(directory, prefix = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) inventory(path.join(directory, entry.name), relative);
    else { assert(entry.isFile()); actual.push(relative); }
  }
}
inventory(destination);
assert.deepEqual(actual.sort(), [...sources.keys()].sort());
fs.writeFileSync(path.join(destination, 'SHA256SUMS.json'), JSON.stringify(expected, null, 2) + '\n', { flag: 'wx' });
console.log(`OK: ${expected.length} files; Node built-in runtime imports only; no external node_modules copied.\n${destination}`);
