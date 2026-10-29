// Generate full license texts for production dependencies from the locked installation.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
let text = 'DeckBridge third-party runtime dependency notices\nGenerated from package-lock.json and installed package license files.\n';
for (const [relative, info] of Object.entries(lock.packages)) {
 if (!relative || info.dev) continue;
 const pkg = JSON.parse(fs.readFileSync(path.join(relative, 'package.json'), 'utf8'));
 assert.equal(pkg.version, info.version, 'Installed version differs from lock: ' + relative);
 const licenses = fs.readdirSync(relative).filter(name => /^(license|copying)([.\-]|$)/i.test(name));
 assert(licenses.length, 'Missing license: ' + relative);
 text += '\n========================================\n' + pkg.name + '@' + pkg.version + ' (' + info.license + ')\n';
 for (const name of licenses) text += fs.readFileSync(path.join(relative, name), 'utf8') + '\n';
}
fs.writeFileSync('THIRD_PARTY_NOTICES.txt', text.trimEnd() + '\n');
console.log('OK: full runtime dependency license texts generated');
