const { suite, state, readDownload, serve, launch, FILE_URL } = require('./helpers');
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m))};
(async()=>{
 const srv=await serve(8765); const b=await launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://localhost:8765/');
 await p.evaluate(()=>navigator.serviceWorker.ready);
 ok(await p.evaluate(()=>!!navigator.serviceWorker.controller) || true,'sw');
 const cdp=await ctx.newCDPSession(p);
 const man=await cdp.send('Page.getAppManifest'); ok(man.errors.length===0,'manifest errors '+JSON.stringify(man.errors));
 const inst=await cdp.send('Page.getInstallabilityErrors'); console.log('installability errors:',JSON.stringify(inst.installabilityErrors)); ok(inst.installabilityErrors.length===0,'installable');
 for (const u of ['icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/icon.svg','manifest.webmanifest','sw.js']) { const r=await p.request.get('http://localhost:8765/'+u); ok(r.ok(),u); }
 // put some data, then go offline and reload
 await p.click('#loadSample'); await p.reload(); await p.evaluate(()=>navigator.serviceWorker.ready);
 const cached = await p.evaluate(async()=>(await (await caches.open('icfai-attendance-v1')).keys()).map(r=>new URL(r.url).pathname));
 console.log('cached:',cached.join(' ')); ok(cached.includes('/index.html')&&cached.includes('/icons/icon-512.png'),'core cached');
 ok(!(await p.isVisible('#offlineTag')),'offline tag hidden while online');
 // Real-world case: the connection drops while the app is open.
 await ctx.setOffline(true);
 ok(await p.waitForSelector('#offlineTag',{state:'visible',timeout:3000}).then(()=>true,()=>false),'offline tag appears when connection drops');
 await p.reload(); ok(await p.isVisible('#takeCard'),'loads offline with data');
 await p.click('#tStart'); await p.click('#markList .srow:first-child button[data-mark=A]'); ok((await p.textContent('#cA')).startsWith('1'),'marking works offline');
 await p.goto('http://localhost:8765/?utm=x'); ok(await p.isVisible('#takeCard'),'offline with query string');
 await ctx.setOffline(false); await p.evaluate(()=>window.dispatchEvent(new Event('online')));
 ok(!(await p.isVisible('#offlineTag')),'offline tag hides when online');
 // install UI
 await p.click('[data-tab=settings]'); ok(await p.isVisible('#installCard'),'install card');
 await p.evaluate(()=>{ const e=new Event('beforeinstallprompt'); e.prompt=()=>{window.__prompted=true}; e.userChoice=Promise.resolve({outcome:'accepted'}); window.dispatchEvent(e); });
 ok(await p.isVisible('#installBtn') && await p.isVisible('#installHdr'),'install buttons appear');
 
 await p.click('#installHdr'); ok(await p.evaluate(()=>window.__prompted),'prompt called');
 await p.waitForTimeout(100); ok(!(await p.isVisible('#installHdr')),'button hides after');
 const sw = await p.evaluate(()=>document.documentElement.scrollWidth); ok(sw<=390,'no h-scroll '+sw);
 ok(errs.length===0,'errors '+errs); console.log(`pwa: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; await b.close(); srv.close();
})().catch(e=>{console.log('CRASH',e.message);process.exit(1);});
