const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(source, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    assert(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }});
  return exports;
}
const bars = load('src/actionBars.ts');
const { decodeLiveFrame } = load('src/dev/liveProtocol.ts', { '../actionBars': bars });
function encode(entries) {
  return JSON.stringify({ protocol: 'DBDEV3', context: 12345, entries,
    checksum: entries.reduce((sum, e) => (sum + e.slot + e.icon) % 0x1000000, 12345) });
}
const entries = Array.from({length: 96}, (_, i) => ({slot: i + 1, icon: i === 0 ? 0 : i === 95 ? 0xffffff : 100000 + i}));
const decoded = decodeLiveFrame(encode(entries)).slots;
assert.equal(decoded.size, 96);
for (const e of entries) {
  assert.equal(decoded.get(e.slot).icon, e.icon);
  assert.equal(decoded.get(e.slot).id, bars.actionSlot(Math.floor((e.slot - 1) / 12) + 1, (e.slot - 1) % 12 + 1));
}
// Bars may be hidden or vertical: sparse and unordered snapshots must keep identities.
const sparse = decodeLiveFrame(encode([entries[95], entries[0], entries[37]])).slots;
assert.equal(sparse.size, 3);
assert.equal(sparse.get(96).icon, 0xffffff);
assert.equal(sparse.get(1).icon, 0);
for (const invalid of [
  [], [...entries, entries[0]], [entries[0], entries[0]],
  ...[-1, 0x1000000, 1.5, null, '123'].map(icon => [{slot: 1, icon}]),
  ...[0, 97, -1, 1.5, null, '1'].map(slot => [{slot, icon: 123}])
]) assert.equal(decodeLiveFrame(encode(invalid)), undefined);
const frame = JSON.parse(encode(entries));
for (const invalid of [
  {...frame, protocol: 'DBDEV2'}, {...frame, checksum: frame.checksum + 1},
  {...frame, context: 0}, {...frame, context: '12345'},
  {...frame, entries: [null]}, {...frame, entries: null}
]) assert.equal(decodeLiveFrame(JSON.stringify(invalid)), undefined);
for (const invalid of ['', '{', 'null', '[]']) assert.equal(decodeLiveFrame(invalid), undefined);
console.log('OK: 96 slots, sparse/unordered updates, zero/max icons, duplicate/invalid slots, checksum and malformed-frame rejection.');
