// Shared helpers for the browser tests. Run everything with:  npm test
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FILE_URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'icfai-attendance-v1';

function suite(name){
  let pass = 0, fail = 0;
  return {
    ok(cond, msg){ if(cond) pass++; else { fail++; console.log('  FAIL:', msg); } },
    done(){ console.log(`${name}: ${pass} passed, ${fail} failed`); if(fail) process.exitCode = 1; }
  };
}

// Read saved data from the page, expanding the compact storage format.
function state(page){
  return page.evaluate((KEY) => {
    const d = JSON.parse(localStorage.getItem(KEY));
    d.sessions.forEach(x => {
      if(typeof x.m === 'string'){ x.marks = {}; [...x.m].forEach((c, k) => { if(c !== '.') x.marks[d.students[k].id] = c; }); }
    });
    return d;
  }, KEY);
}

function readDownload(download){ return download.path().then(p => fs.readFileSync(p, 'utf8')); }

// Tiny static server (service workers need http, not file://).
function serve(port){
  const types = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if(!f.startsWith(ROOT) || !fs.existsSync(f)){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}

function launch(){ return chromium.launch(); }

module.exports = { suite, state, readDownload, serve, launch, devices, FILE_URL, KEY, ROOT };
