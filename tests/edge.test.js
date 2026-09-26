const { suite, state, readDownload, serve, launch, devices, FILE_URL } = require('./helpers');
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m))};
const URL=FILE_URL;
(async()=>{
 const b=await launch();
 // 1. Excel paste with S.No column + Mizo diacritics
 let ctx=await b.newContext(); let p=await ctx.newPage(); p.on('dialog',d=>d.accept());
 await p.goto(URL); await p.click('[data-tab=students]');
 await p.fill('#bulk','S.No\tRoll No\tName\n1\t25MA001\tLalṭhanpuii\n2\t25MA002\tVanlalhriatpuii Ralte\n3\t25MA003\tC. Lalrinchhana');
 await p.click('#bulkAdd'); let s=await state(p);
 console.log('3-col parse:', s.students.map(x=>x.roll+'|'+x.name).join(' ; '));
 ok(s.students.length===3 && s.students.every(x=>/^25MA00\d$/.test(x.roll) && /[a-z]/i.test(x.name) && !/^\d/.test(x.name)),'3-column Excel paste (S.No, Roll, Name)');
 ok(s.students.some(x=>x.name==='Lalṭhanpuii'),'Mizo diacritics preserved');
 // 2. edit to duplicate roll
 await p.evaluate(()=>{ window.prompt=(m,d)=> m.startsWith('Roll')?'25MA001':d; });
 await p.click('#stuList .srow:nth-child(2) button[data-act=edit]'); s=await state(p); console.log('after edit:', s.students.map(x=>x.roll).join(','));
 ok(new Set(s.students.map(x=>x.roll.toLowerCase())).size===3,'edit cannot create duplicate roll');
 await ctx.close();

 // 3. two tabs open at once
 ctx=await b.newContext(); const A=await ctx.newPage(); const B=await ctx.newPage(); A.on('dialog',d=>d.accept()); B.on('dialog',d=>d.accept());
 await A.goto(URL); await A.click('#loadSample'); await B.goto(URL);
 await A.click('[data-tab=students]'); await A.fill('#sRoll','25MA099'); await A.fill('#sName','Tab A Student'); await A.click('#sAdd');
 await B.click('[data-tab=subjects]'); await B.fill('#subName','Tab B Subject'); await B.click('#subAdd');
 await B.waitForTimeout(200); s=await state(B);
 ok(s.students.some(x=>x.name==='Tab A Student') && s.subjects.some(x=>x.name==='Tab B Subject'),'two open tabs do not wipe each other\'s changes');
 await ctx.close();

 // 4. timezone: IST just after midnight -> today's date
 ctx=await b.newContext({timezoneId:'Asia/Kolkata'}); p=await ctx.newPage();
 await p.clock.install({time:new Date('2026-10-05T18:40:00Z')}); // 00:10 IST on 6 Oct
 await p.goto(URL); await p.click('#loadSample');
 ok(await p.inputValue('#tDate')==='2026-10-06','IST date correct just after midnight ('+await p.inputValue('#tDate')+')');
 await ctx.close();

 // 5. accuracy: random data vs independent calculation
 ctx=await b.newContext(); p=await ctx.newPage(); await p.goto(URL);
 await p.evaluate(()=>{
  const S={version:1,meta:{inst:'ICFAI University',prog:'MA',batch:'',sem:'',fac:'',threshold:75},students:[],subjects:[],sessions:[]};
  for(let i=0;i<40;i++) S.students.push({id:'s'+i,roll:'25MA'+String(i+1).padStart(3,'0'),name:'Student '+i});
  for(let j=0;j<5;j++) S.subjects.push({id:'j'+j,code:'MA10'+j,name:'Sub '+j});
  let seed=7; const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let d=0;d<60;d++) for(let j=0;j<5;j++) if(r()<0.6){ const m={}; S.students.forEach(st=>{const x=r(); if(x<0.93) m[st.id]=x<0.15?'A':x<0.2?'L':'P';}); S.sessions.push({id:'x'+d+'_'+j,subjectId:'j'+j,date:new Date(Date.UTC(2026,6,1+d)).toISOString().slice(0,10),period:1,marks:m}); }
  localStorage.setItem('icfai-attendance-v1',JSON.stringify(S));
 });
 await p.reload(); await p.click('[data-tab=reports]');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#pCsv')]);
 const csv=require('fs').readFileSync(await dl.path(),'utf8').replace(/^﻿/,'').trim().split('\r\n').map(l=>l.split(','));
 s=await state(p); let bad=0;
 s.students.forEach(st=>{ const row=csv.find(r=>r[0]===st.roll); let TP=0,TA=0;
   s.subjects.forEach((sub,j)=>{ let P=0,A=0; s.sessions.filter(x=>x.subjectId===sub.id).forEach(x=>{ if(x.marks[st.id]==='P')P++; if(x.marks[st.id]==='A')A++; }); TP+=P;TA+=A;
     const exp=P+A?Math.round(P*1000/(P+A))/10:''; if(+row[2+j*3]!==P||+row[3+j*3]!==P+A||String(row[4+j*3])!==String(exp)) bad++; });
   const exp=TP+TA?Math.round(TP*1000/(TP+TA))/10:''; if(String(row[row.length-2])!==String(exp)) bad++;
   if(row[row.length-1]!==(exp<75?'SHORTAGE':'OK')) bad++; });
 ok(bad===0,'report numbers match independent calculation ('+bad+' mismatches)');
 // on-screen report matches CSV overall
 const screen=await p.$$eval('#repTable tbody tr',trs=>trs.map(tr=>[tr.cells[0].textContent,tr.cells[tr.cells.length-1].textContent]));
 ok(screen.every(([roll,pc])=>{const r=csv.find(x=>x[0]===roll); return pc===(r[r.length-2]===''?'–':r[r.length-2]+'%');}),'screen % = CSV %');
 // register CSV matches marks
 await p.click('[data-tab=register]');
 const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#rCsv')]);
 const rc=require('fs').readFileSync(await dl2.path(),'utf8').replace(/^﻿/,'').trim().split('\r\n').map(l=>l.split(','));
 const subSess=s.sessions.filter(x=>x.subjectId==='j0').sort((a,b)=>a.date<b.date?-1:1);
 let bad2=0; s.students.forEach(st=>{const r=rc.find(x=>x[0]===st.roll); subSess.forEach((x,k)=>{ if((x.marks[st.id]||'')!==r[2+k]) bad2++; });});
 ok(bad2===0 && rc[0].length===2+subSess.length+4,'register CSV matches every mark ('+bad2+')');
 await ctx.close();

 // 6. CSV escaping: comma/quote names round trip
 ctx=await b.newContext(); p=await ctx.newPage(); p.on('dialog',d=>d.accept()); await p.goto(URL);
 await p.click('[data-tab=subjects]'); await p.fill('#subName','Lit, "Modern"'); await p.click('#subAdd');
 await p.click('[data-tab=students]'); await p.fill('#sRoll','25MA001'); await p.fill('#sName','Das "Ronnie" Kumar'); await p.click('#sAdd');
 await p.click('[data-tab=reports]'); const [dl3]=await Promise.all([p.waitForEvent('download'),p.click('#pCsv')]);
 const t=require('fs').readFileSync(await dl3.path(),'utf8'); ok(t.includes('"Das ""Ronnie"" Kumar"') && t.includes('"Lit, ""Modern"" Attended"'),'CSV quotes/commas escaped');
 await ctx.close();

 // 7. iPhone emulation layout
 ctx=await b.newContext({...devices['iPhone 13']}); p=await ctx.newPage(); p.on('dialog',d=>d.accept()); await p.goto(URL); await p.click('#loadSample');
 for(const tb of ['take','register','reports','students','subjects','settings']){ await p.click(`[data-tab=${tb}]`); const w=await p.evaluate(()=>document.documentElement.scrollWidth); ok(w<=390,'iPhone no h-scroll '+tb+' '+w); }
 await p.click('[data-tab=settings]'); ok(await p.isVisible('#iosHint'),'iOS install hint shown on iPhone');
 await p.click('[data-tab=take]'); await p.click('#tStart');
 const box=await p.locator('#markList .srow:first-child button[data-mark=A]').boundingBox(); ok(box.width>=40&&box.height>=40,'tap target >= 40px');
 await ctx.close();

 // 8. upgrade: data saved by the old (live) version loads unchanged, then re-saves compactly
 ctx=await b.newContext(); p=await ctx.newPage(); await p.goto(FILE_URL);
 const oldData={version:1,meta:{inst:'ICFAI University',prog:'MA',batch:'X',sem:'Y',fac:'',threshold:80},
  students:[{id:'a',roll:'1',name:'A'},{id:'b',roll:'2',name:'B'},{id:'c',roll:'3',name:'C'}],
  subjects:[{id:'s',code:'M1',name:'Sub'}],
  sessions:[{id:'x',subjectId:'s',date:'2026-08-01',period:1,marks:{a:'P',b:'A',c:'L'}},{id:'y',subjectId:'s',date:'2026-08-02',period:1,marks:{a:'A',b:'P'}}]};
 await p.evaluate(d=>localStorage.setItem('icfai-attendance-v1',JSON.stringify(d)),oldData); await p.reload();
 await p.click('[data-tab=settings]'); await p.fill('#mFac','Dr Test'); // triggers a save
 s=await state(p); const raw=await p.evaluate(()=>JSON.parse(localStorage.getItem('icfai-attendance-v1')));
 ok(raw.version===2 && raw.sessions[0].m==='PAL' && raw.sessions[1].m==='AP.','old data re-saved in compact form ('+raw.sessions.map(x=>x.m)+')');
 ok(JSON.stringify(s.sessions.map(x=>x.marks))===JSON.stringify(oldData.sessions.map(x=>x.marks)) && s.meta.threshold===80,'old data preserved exactly');
 // 9. removing a middle student keeps everyone else's marks
 p.on('dialog',d=>d.accept());
 await p.click('[data-tab=students]'); await p.click('#stuList .srow:nth-child(2) button[data-act=del]'); await p.reload();
 s=await state(p);
 ok(JSON.stringify(s.sessions.map(x=>x.marks))==='[{"a":"P","c":"L"},{"a":"A"}]','marks intact after removing a student ('+JSON.stringify(s.sessions.map(x=>x.marks))+')');
 // backup from this version restores in a fresh browser
 await p.click('[data-tab=settings]'); const [bk]=await Promise.all([p.waitForEvent('download'),p.click('#backup')]);
 const bkPath=require('path').join(require('os').tmpdir(),'att-edge-backup.json'); await bk.saveAs(bkPath); await ctx.close();
 ctx=await b.newContext(); p=await ctx.newPage(); p.on('dialog',d=>d.accept()); await p.goto(FILE_URL); await p.click('[data-tab=settings]');
 await p.setInputFiles('#restoreFile',bkPath); await p.waitForTimeout(300); s=await state(p);
 ok(s.students.length===2 && JSON.stringify(s.sessions.map(x=>x.marks))==='[{"a":"P","c":"L"},{"a":"A"}]','backup restores in another browser');
 await ctx.close();

 // 10. random-use fuzz: 300 random actions, then reload must reproduce the same data
 ctx=await b.newContext(); p=await ctx.newPage(); const ferr=[]; p.on('pageerror',e=>ferr.push(e.message));
 p.on('dialog',d=>d.type()==='prompt'?d.accept(d.defaultValue()):d.accept());
 await p.goto(FILE_URL); await p.click('#loadSample');
 let seed=42; const R=n=>{seed=(seed*16807)%2147483647; return seed%n;};
 const acts=[
  async()=>{await p.click('[data-tab=take]'); await p.selectOption('#tSubject',{index:R(await p.locator('#tSubject option').count()||1)}).catch(()=>{}); await p.fill('#tDate','2026-0'+(7+R(3))+'-'+String(1+R(28)).padStart(2,'0')); await p.dispatchEvent('#tDate','change'); await p.click('#tStart').catch(()=>{});},
  async()=>{const n=await p.locator('#markList .srow').count(); if(n&&await p.isVisible('#markList')) await p.click(`#markList .srow:nth-child(${1+R(n)}) button[data-mark=${'PAL'[R(3)]}]`);},
  async()=>{const n=await p.locator('#markList .srow').count(); if(n&&await p.isVisible('#markList')) await p.click(`#markList .srow:nth-child(${1+R(n)}) .who`);},
  async()=>{await p.click('[data-tab=students]'); await p.fill('#sRoll','F'+R(1000)); await p.fill('#sName','Fuzz '+R(1000)); await p.click('#sAdd');},
  async()=>{await p.click('[data-tab=students]'); const n=await p.locator('#stuList .srow').count(); if(n>3) await p.click(`#stuList .srow:nth-child(${1+R(n)}) button[data-act=del]`);},
  async()=>{await p.click('[data-tab=register]'); const n=await p.locator('#regTable td.c').count(); if(n) await p.locator('#regTable td.c').nth(R(n)).click();},
  async()=>{await p.click('[data-tab=subjects]'); if(R(4)===0){await p.fill('#subName','FuzzSub '+R(99)); await p.click('#subAdd');} else {const n=await p.locator('#subList .srow').count(); if(n>2&&R(3)===0) await p.click(`#subList .srow:nth-child(${1+R(n)}) button[data-act=del]`);}},
  async()=>{await p.click('[data-tab=reports]');},
 ];
 for(let i=0;i<300;i++){ await acts[R(acts.length)](); }
 const mem=await p.evaluate(()=>localStorage.getItem('icfai-attendance-v1'));
 const before=await state(p); await p.reload(); await p.click('[data-tab=settings]'); await p.fill('#mFac','x'); await p.fill('#mFac','');
 const after=await state(p);
 ok(JSON.stringify(before)===JSON.stringify(after),'300 random actions: data identical after reload');
 const ids=new Set(after.students.map(x=>x.id)), sids=new Set(after.subjects.map(x=>x.id));
 ok(after.sessions.every(x=>sids.has(x.subjectId) && Object.keys(x.marks).every(k=>ids.has(k)) && Object.values(x.marks).every(v=>'PAL'.includes(v))),'no orphaned or invalid records');
 ok(ferr.length===0,'no errors during fuzz '+ferr);
 console.log('fuzz end state:',after.students.length,'students,',after.subjects.length,'subjects,',after.sessions.length,'classes');
 await ctx.close();

 // 11. iPhone: exports go through the share sheet (stubbed here), others use normal download
 ctx=await b.newContext({...devices['iPhone 13']}); p=await ctx.newPage(); p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{ navigator.canShare=()=>true; navigator.share=(d)=>{ window.__shared=d.files[0].name+'|'+d.files[0].type; return Promise.resolve(); }; });
 await p.goto(FILE_URL); await p.click('#loadSample'); await p.click('[data-tab=reports]'); await p.click('#pCsv'); await p.waitForTimeout(100);
 const shared=await p.evaluate(()=>window.__shared); ok(/^Attendance_Report_.*\.csv\|text\/csv$/.test(shared||''),'iPhone export uses share sheet ('+shared+')');
 await p.evaluate(()=>{ navigator.share=()=>Promise.reject(Object.assign(new Error('x'),{name:'AbortError'})); });
 const dlSeen=await Promise.race([p.waitForEvent('download').then(()=>true), p.click('#pCsv').then(()=>p.waitForTimeout(500)).then(()=>false)]);
 ok(!dlSeen,'cancelling the share sheet does nothing');
 await ctx.close();

 console.log(`edge: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; await b.close();
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
