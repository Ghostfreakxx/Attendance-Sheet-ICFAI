const { suite, state, readDownload, serve, launch, FILE_URL } = require('./helpers');
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m))};
(async()=>{
 const b=await launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(FILE_URL);
 // Worst case: 150 students, 8 subjects, 5 months, 2 lectures some days
 await p.evaluate(()=>{
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const S={version:1,meta:{inst:'ICFAI University',prog:'MA',batch:'2025-27',sem:'Sem I',fac:'',threshold:75},students:[],subjects:[],sessions:[]};
  for(let i=0;i<150;i++) S.students.push({id:uid()+i,roll:'25MA'+String(i+1).padStart(3,'0'),name:'Student Name '+i});
  for(let j=0;j<8;j++) S.subjects.push({id:uid()+j,code:'MA10'+j,name:'Subject '+j});
  for(let d=0;d<150;d++){ const date=new Date(Date.UTC(2026,6,1+d)); if(date.getUTCDay()===0) continue;
   S.subjects.forEach((sub,j)=>{ if((d+j)%2) return; for(let per=1;per<=((d+j)%7===0?2:1);per++){ const m={}; S.students.forEach(st=>m[st.id]=Math.random()<0.15?'A':'P'); S.sessions.push({id:uid(),subjectId:sub.id,date:date.toISOString().slice(0,10),period:per,marks:m}); } }); }
  localStorage.setItem('icfai-attendance-v1',JSON.stringify(S));
 });
 const t=async(label,fn,limit)=>{const s=Date.now(); await fn(); const ms=Date.now()-s; console.log(label,ms+'ms'); ok(ms<limit,label+' under '+limit+'ms ('+ms+')');};
 await t('reload',()=>p.reload(),3000);
 await t('take: start',()=>p.click('#tStart'),1500);
 await t('take: mark',async()=>{ for(let i=1;i<=20;i++) await p.click(`#markList .srow:nth-child(${i}) button[data-mark=A]`); },4000);
 const st=await p.evaluate(()=>{const r=localStorage.getItem('icfai-attendance-v1'); const S=JSON.parse(r); return {kb:Math.round(r.length*2/1024), sessions:S.sessions.length};});
 console.log('worst-case data (as saved by app):',st.sessions,'classes,',st.kb,'KB (browser limit ~5000 KB of chars => '+Math.round(st.kb/2)+'K chars)');
 ok(st.kb/2 < 4000,'fits comfortably in storage');
 await t('register open',()=>p.click('[data-tab=register]'),2000);
 await t('register cell click',()=>p.locator('#regTable td.c').first().click(),1500);
 await t('reports open',()=>p.click('[data-tab=reports]'),2000);
 await t('report CSV',()=>Promise.all([p.waitForEvent('download'),p.click('#pCsv')]),3000);
 await t('backup',()=>Promise.all([p.waitForEvent('download'),p.click('[data-tab=settings]').then(()=>p.click('#backup'))]),3000);
 ok(errs.length===0,'no errors '+errs);
 console.log(`scale: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; await b.close();
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
