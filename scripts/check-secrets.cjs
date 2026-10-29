const { execFileSync } = require('node:child_process');

// Never include a matched value in diagnostics.
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['github-token', /github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}/],
  ['aws-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['google-key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['slack-token', /\bxox[baprs]-[0-9A-Za-z-]{15,}/],
  ['service-secret', /\b(?:sk_live_|sk_test_|sk-proj-)[A-Za-z0-9_-]{16,}/],
  ['literal-credential', /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|passwd|_authToken)["']?\s*[:=]\s*["'][^"'\r\n]{12,}["']/i],
  ['url-credential', /https?:\/\/[^\s/'"<>]+:[^\s/@'"<>]+@/i],
];

function sensitivePath(file) {
  const name = file.replaceAll('\\', '/').split('/').at(-1);
  if (name.toLowerCase() === '.env.example') return false;
  return /^(?:\.env(?:\..*)?|\.envrc|.*\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore)|id_(?:rsa|dsa|ecdsa|ed25519)|\.npmrc|\.netrc|\.pypirc|credentials(?:\..*)?\.json|secrets(?:\..*)?\.json|.*service[-_]account.*\.json)$/i.test(name);
}

function inspect(file, data) {
  const hits = [];
  if (sensitivePath(file)) hits.push({ file, rule: 'sensitive-filename' });
  if (/\.(?:png|tga)$/i.test(file)) return hits;
  const lines = data.toString('utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [rule, pattern] of rules) if (pattern.test(lines[i])) hits.push({ file, line: i + 1, rule });
  }
  return hits;
}

function git(args, input) {
  return execFileSync('git', args, { input, maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}

function scan(staged) {
  const objects = new Map();
  if (staged) {
    for (const row of git(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean)) {
      const match = /^(\d+) ([0-9a-f]+) 0\t([\s\S]+)$/.exec(row);
      if (!match) throw new Error('Unmerged index');
      if (match[1] === '160000') throw new Error('Submodule content must be reviewed separately');
      const names = objects.get(match[2]) ?? [];
      names.push(match[3]); objects.set(match[2], names);
    }
  } else {
    for (const row of git(['rev-list', '--objects', '--all']).toString().trim().split('\n').filter(Boolean)) {
      const split = row.indexOf(' ');
      objects.set(split < 0 ? row : row.slice(0, split), [split < 0 ? '(commit metadata)' : row.slice(split + 1)]);
    }
  }
  if (!objects.size) return { count: 0, hits: [] };
  const data = git(['cat-file', '--batch'], [...objects.keys()].join('\n') + '\n');
  const hits = []; let offset = 0, count = 0;
  while (offset < data.length) {
    const end = data.indexOf(10, offset);
    if (end < 0) throw new Error('Incomplete Git object header');
    const [sha, type, rawSize] = data.toString('utf8', offset, end).split(' ');
    const size = Number(rawSize);
    if (!Number.isSafeInteger(size) || size < 0 || end + size + 2 > data.length) throw new Error('Invalid Git object size');
    const bytes = data.subarray(end + 1, end + 1 + size); offset = end + size + 2;
    if (type !== 'blob' && type !== 'commit') continue;
    for (const file of objects.get(sha) ?? []) { hits.push(...inspect(file, bytes)); count++; }
  }
  return { count, hits };
}

if (require.main === module) {
  try {
    const staged = process.argv.includes('--staged');
    const result = scan(staged);
    if (result.hits.length) {
      for (const hit of result.hits) console.error(JSON.stringify(hit));
      console.error('Potential credentials detected. Inspect locally; never paste secret values into logs.');
      process.exitCode = 1;
    } else console.log(`OK: ${result.count} ${staged ? 'staged' : 'historical'} objects checked for known credential patterns`);
  } catch {
    console.error('Secret check could not complete; commit/build stopped.');
    process.exitCode = 1;
  }
}
module.exports = { sensitivePath, inspect, scan };
