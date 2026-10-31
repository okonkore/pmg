const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PMG_BROWSER_EXECUTABLE?{executablePath:process.env.PMG_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8770/synth-demo/');await page.waitForSelector('.app-ready');
  assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),51);
  assert.equal(await page.locator('#song optgroup:not(#my-song-group)').count(),13);
  await page.click('#nav-library');
  for(const [q,n] of [['',51],['BWV 1006a',7],['Bach',29],['存在しない曲xyz',0]]){
   await page.fill('#library-search',q);assert.equal(await page.locator('.library-song').count(),n,q);
  }
  await page.fill('#library-search','BWV 1006a');await page.locator('.library-song[data-song="menuet1006a"]').click();assert.equal(await page.locator('#song').inputValue(),'menuet1006a');
  await page.click('#nav-instrument');await page.selectOption('#preset','pluck');await page.click('#nav-performance');
  for(const [key,count,end] of [['prelude1006a',1731,417],['loure1006a',658,294],['gavotte1006a',849,402],['gigue1006a',862,194]]){
   await page.selectOption('#song',key);await page.click('#nav-piano-roll');
   const d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.notes.length,count);assert.equal(d.endBeat,end);
   assert.equal(await page.locator('.seq-note').count(),count);
   assert(await page.locator('.seq-note').evaluateAll(nodes=>nodes.every(n=>parseFloat(n.style.left)>=0&&parseFloat(n.style.top)>=0&&parseFloat(n.style.width)>0)));
   assert((await page.locator('#seq-origin').textContent()).includes(d.source.licenseUrl));
   await page.evaluate(()=>{const fn=scoreEditor.transportStart;scoreEditor.transportStart=o=>{window.testTransportEnd=o.endBeat;fn(o)}});
   await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>0);assert.equal(await page.evaluate(()=>window.testTransportEnd),end);await page.click('#seq-stop');
   await page.click('#nav-performance');
  }
  await page.click('#app-menu');await page.click('#copy-song');await page.click('#seq-menu-toggle');await page.click('#editor-menu-dialog [data-panel="song-dialog"]');
  const wait=page.waitForEvent('download');await page.click('#seq-export');const download=await wait;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.song.endBeat,194);assert.equal(exported.song.source.license,'CC BY-SA 3.0');assert(exported.song.source.modifications.includes('A A B B'));
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:'gigue1006a.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  const imported=await page.evaluate(()=>scoreEditor.currentDocument());assert.deepEqual(imported.source,exported.song.source);assert.equal(imported.notes.length,862);
  const hostile={...exported,song:{...exported.song,source:{...exported.song.source,credit:'<img src=x onerror=window.__sourceInjected=true>',url:'javascript:window.__sourceInjected=true'}}};
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:'metadata-safety.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hostile))});
  assert((await page.locator('#seq-origin').textContent()).includes('<img src=x'));assert.equal(await page.locator('#seq-origin img').count(),0);assert.equal(await page.evaluate(()=>window.__sourceInjected),undefined);
  await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));assert(saved.songs.some(s=>s.id===imported.id&&s.endBeat===194&&s.source.licenseUrl===exported.song.source.licenseUrl));
  assert.deepEqual(errors,[]);console.log('PASS: BWV1006a completion, 51 songs/13 groups, bilingual search and empty results, four loads/positions/playback endpoints, downloaded JSON/source/repeat metadata and reload.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
