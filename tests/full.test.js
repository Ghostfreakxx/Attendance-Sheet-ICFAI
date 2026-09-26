const { suite, state, readDownload, serve, launch, FILE_URL } = require('./helpers');
const fs = require('fs'); const os = require('os'); const path = require('path');
const T = n => path.join(os.tmpdir(), 'att-test-' + n);
let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++;} else {fail++; console.log('FAIL:',m);} };
(async()=>{
 const b = await launch();
 const ctx = await b.newContext({acceptDownloads:true, viewport:{width:390,height:844}});
 const p = await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 p.on('dialog',d=>d.dialog? d.accept(): (d.type()==='prompt'? d.accept(d.defaultValue()+'X') : d.accept()));
 await p.goto(FILE_URL);
 ok(await p.isVisible('#welcome'),'welcome shown on empty');
 ok(!(await p.isVisible('#takeCard')),'take hidden when empty');

 // subjects
 await p.click('[data-tab=subjects]');
 await p.fill('#subCode','MA101'); await p.fill('#subName','Research Methodology'); await p.press('#subName','Enter');
 await p.fill('#subName','<b>Theory</b>'); await p.click('#subAdd');
 await p.click('#subAdd'); // empty
 ok(await p.locator('#subList .srow').count()===2,'2 subjects');
 ok((await p.innerHTML('#subList')).includes('&lt;b&gt;'),'subject name escaped');

 // students bulk
 await p.click('[data-tab=students]');
 await p.fill('#bulk','Roll No\tName\n25MA001\tLalremruata\n25MA002, Priya Sharma\nRohan Das, 25MA003\n25MA001, Dup\n\n"25MA004","O\'Brien <script>x</script>"\nOnly Name');
 await p.click('#bulkAdd');
 ok(await p.locator('#stuList .srow').count()===5,'5 students after bulk (got '+await p.locator('#stuList .srow').count()+')');
 const firstTxt = await p.textContent('#stuList .srow:first-child');
 ok(firstTxt.includes('25MA001'),'sorted by roll');
 // single add + duplicate
 await p.fill('#sRoll','25MA010'); await p.fill('#sName','Zo'); await p.press('#sName','Enter');
 await p.fill('#sRoll','25ma010'); await p.fill('#sName','Dup2'); await p.click('#sAdd');
 ok(await p.locator('#stuList .srow').count()===6,'dup roll rejected case-insensitive');
 // csv import
 fs.writeFileSync(T('imp.csv'),'Roll,Name\n25MA020,Csv Person\n');
 await p.setInputFiles('#csvFile',T('imp.csv'));
 await p.waitForTimeout(200);
 ok(await p.locator('#stuList .srow').count()===7,'csv import');

 // take attendance
 await p.click('[data-tab=take]');
 ok(await p.isVisible('#takeCard') && !(await p.isVisible('#welcome')),'take shown when ready');
 await p.selectOption('#tSubject',{index:0}); await p.fill('#tDate','2026-09-01');
 await p.click('#tStart');
 ok((await p.textContent('#cP'))==='7 P','all start present');
 await p.click('#markList .srow:nth-child(1) button[data-mark=A]');
 await p.click('#markList .srow:nth-child(2) .who'); // toggle -> A
 await p.click('#markList .srow:nth-child(3) button[data-mark=L]');
 ok((await p.textContent('#cA'))==='2 A' && (await p.textContent('#cL'))==='1 L','counts after marking');
 await p.fill('#tFilter','priya'); ok(await p.locator('#markList .srow').count()===1,'filter');
 await p.fill('#tFilter','');
 // persists after reload
 await p.reload();
 await p.click('[data-tab=take]');
 await p.selectOption('#tSubject',{index:0}); await p.fill('#tDate','2026-09-01');
 ok((await p.textContent('#tStart')).includes('Open'),'button says Open for existing');
 await p.click('#tStart');
 ok((await p.textContent('#cA'))==='2 A','persisted after reload');
 // lecture 2 same day
 await p.selectOption('#tPeriod','2'); ok((await p.textContent('#tStart'))==='Start','lecture 2 is new');
 await p.click('#tStart'); await p.click('#allA'); ok((await p.textContent('#cA'))==='7 A','all absent');
 await p.click('#allP'); ok((await p.textContent('#cP'))==='7 P','all present');
 await p.click('#delSess'); ok(!(await p.isVisible('#sessionArea')),'session deleted');
 // second date, subject 1
 await p.selectOption('#tPeriod','1'); await p.fill('#tDate','2026-09-02'); await p.click('#tStart');
 await p.click('#markList .srow:nth-child(1) button[data-mark=A]');

 // late student bug check
 await p.click('[data-tab=students]'); await p.fill('#sRoll','25MA030'); await p.fill('#sName','Late Joiner'); await p.click('#sAdd');
 await p.click('[data-tab=take]'); await p.fill('#tDate','2026-09-01'); await p.dispatchEvent('#tDate','change'); await p.click('#tStart');
 const lateRow = p.locator('#markList .srow', {hasText:'Late Joiner'});
 const lateOn = await lateRow.locator('button.on-P').count();
 const cp = await p.textContent('#cP');
 console.log('late joiner shows P:', lateOn, 'counts', cp, await p.textContent('#cA'), await p.textContent('#cL'));
 ok(lateOn===0,'late joiner should not appear Present on an old class');

 // register
 await p.click('[data-tab=register]');
 const cells = await p.locator('#regTable td.c').count();
 ok(cells===16,'register cells 8 students x 2 dates (got '+cells+')');
 const c0 = p.locator('#regTable tbody tr:first-child td.c').first();
 const before = await c0.textContent(); await c0.click();
 const after = await p.locator('#regTable tbody tr:first-child td.c').first().textContent();
 ok(before==='A' && after==='L','register click cycles A->L ('+before+'->'+after+')');
 await p.fill('#rFrom','2026-09-02'); await p.dispatchEvent('#rFrom','change');
 ok(await p.locator('#regTable thead th').count()===5,'date filter');
 let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#rCsv')]);
 const regCsv = fs.readFileSync(await dl.path(),'utf8'); console.log('register csv name', dl.suggestedFilename()); console.log(regCsv.split('\r\n').slice(0,3).join(' | '));
 ok(regCsv.startsWith('﻿Roll No,Name'),'register csv header');
 // subject with no data
 await p.selectOption('#rSubject',{index:1}); ok((await p.textContent('#regTable')).includes('No classes'),'empty register msg');

 // reports
 await p.click('[data-tab=reports]');
 const rep = await p.textContent('#repTable'); ok(rep.includes('%'),'report renders');
 await p.check('#pLowOnly'); const lowRows = await p.locator('#repTable tbody tr').count(); console.log('low rows',lowRows);
 [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pCsv')]);
 const repCsv = fs.readFileSync(await dl.path(),'utf8'); console.log(repCsv.split('\r\n').slice(0,3).join(' | '));
 ok(repCsv.includes('SHORTAGE'),'report csv has shortage');
 ok(repCsv.includes('"O\'Brien <script>x</script>"') || repCsv.includes("O'Brien <script>x</script>"),'raw name in csv');

 // settings
 await p.click('[data-tab=settings]');
 await p.fill('#mBatch','2025-27'); await p.fill('#mSem','Sem I'); await p.fill('#mThr','150');
 ok((await p.textContent('#hdrSub')).includes('2025-27'),'header updates');
 const thr = (await state(p)).meta.threshold; ok(thr===100,'threshold clamped ('+thr+')');
 await p.fill('#mThr','75');
 [dl] = await Promise.all([p.waitForEvent('download'), p.click('#backup')]);
 const bpath = T('backup.json'); fs.copyFileSync(await dl.path(), bpath);
 const bk = JSON.parse(fs.readFileSync(bpath,'utf8')); ok(bk.students.length===8 && bk.sessions.length===2,'backup contents');
 // new semester
 await p.click('#newSem');
 let st = await state(p);
 ok(st.students.length===8 && st.subjects.length===0 && st.sessions.length===0,'new semester');
 // restore
 await p.setInputFiles('#restoreFile', bpath); await p.waitForTimeout(300);
 st = await state(p);
 ok(st.sessions.length===2 && st.subjects.length===2,'restore');
 // bad restore
 fs.writeFileSync(T('bad.json'),'{"x":1}'); await p.setInputFiles('#restoreFile',T('bad.json')); await p.waitForTimeout(200);
 ok((await p.textContent('#toast')).includes('not a valid'),'bad backup rejected');
 await p.click('[data-tab=settings]'); await p.click('#newBatch');
 st = await state(p);
 ok(st.students.length===0 && st.subjects.length===2 && st.sessions.length===0,'new batch');
 // remove subject / student with records
 await p.setInputFiles('#restoreFile', bpath); await p.waitForTimeout(300);
 await p.click('[data-tab=students]'); await p.click('#stuList .srow:first-child button[data-act=del]');
 st = await state(p);
 ok(st.students.length===7 && Object.keys(st.sessions[0].marks).length<=7,'student removal cleans marks');
 await p.click('#stuList .srow:first-child button[data-act=edit]');
 ok((await p.textContent('#stuList .srow:first-child')).includes('X'),'edit student');
 await p.click('[data-tab=subjects]'); await p.click('#subList .srow:first-child button[data-act=del]');
 st = await state(p);
 ok(st.subjects.length===1 && st.sessions.length===0,'subject removal cleans sessions');
 // theme
 await p.click('[data-tab=settings]'); await p.selectOption('#theme','dark');
 ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='dark','dark theme');
 await p.reload(); ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='dark','theme persisted');
 ok(await p.evaluate(()=>!document.querySelector('#tab-settings').classList.contains('hidden')),'tab remembered on reload');
 // erase + sample
 await p.click('#resetAll'); ok(await p.isVisible('#welcome'),'erase all');
 await p.click('#loadSample'); ok(await p.isVisible('#takeCard'),'sample loads');
 // widths
 for (const w of [320,390,768,1280]) { await p.setViewportSize({width:w,height:800});
   for (const t of ['take','register','reports','students','subjects','settings']) { await p.click(`[data-tab=${t}]`);
     const sw = await p.evaluate(()=>document.documentElement.scrollWidth); ok(sw<=w,`no h-scroll ${t}@${w} (${sw})`); } }
 await p.setViewportSize({width:390,height:844}); await p.click('[data-tab=take]'); await p.click('#tStart'); 
 // print
 await p.click('[data-tab=reports]'); await p.emulateMedia({media:'print'}); 
 ok(!(await p.isVisible('nav')),'nav hidden in print');
 // storage blocked
 const p2 = await ctx.newPage(); const e2=[]; p2.on('pageerror',e=>e2.push(e.message));
 await p2.addInitScript(()=>{ Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}); Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}}); });
 await p2.goto(FILE_URL); ok(await p2.isVisible('#welcome') && e2.length===0,'works with storage blocked '+e2);
 console.log('errors:',errs);
 ok(errs.length===0,'no console errors');
 console.log(`full: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0;
 await b.close();
})().catch(e=>{console.log('CRASH',e.message);process.exit(1);});
