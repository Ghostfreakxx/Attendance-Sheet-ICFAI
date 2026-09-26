// Runs every browser test suite. Usage:  npm test
const { execFileSync } = require('child_process');
const path = require('path');
let failed = 0;
for (const t of ['full', 'edge', 'scale', 'pwa']) {
  try { execFileSync(process.execPath, [path.join(__dirname, t + '.test.js')], { stdio: 'inherit' }); }
  catch (e) { failed++; }
}
console.log(failed ? `\n${failed} suite(s) FAILED` : '\nAll suites passed');
process.exit(failed ? 1 : 0);
