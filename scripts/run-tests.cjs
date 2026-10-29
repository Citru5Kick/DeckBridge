const { execFileSync } = require('node:child_process');
for (const name of ['test-dev-actions', 'test-dev-data', 'test-dev-icons', 'test-live-protocol', 'test-reader-control', 'test-utilities', 'test-public-sdk']) {
 console.log('Running ' + name); execFileSync(process.execPath, ['scripts/' + name + '.cjs'], { stdio: 'inherit' });
}
