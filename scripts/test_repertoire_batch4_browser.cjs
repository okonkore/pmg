const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PMG_BROWSER_EXECUTABLE?{executablePath:process.env.PMG_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/synth-demo/');
  await page.waitForSelector('.app-ready');
  assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),41);
  // Library uses option title and composer/opus group text for search.
  await page.click('#nav-library');
  for(const [query,count] of [['Sor',17],['ソル',17],['Bach',19],['バッハ',19],['Op.1',3],['ワルツ',2],['6弦F2',1],['BWV 1009',2]]){
   await page.fill('#library-search',query);
   assert.equal(await page.locator('.library-song').count(),count,query);
  }
  await page.fill('#library-search','ワルツ');
  await page.locator('.library-song[data-song="sor1_2"]').click();
  assert.equal(await page.locator('#song').inputValue(),'sor1_2');
  await page.click('#nav-instrument');await page.selectOption('#preset','pluck');await page.click('#nav-performance');
  for(const [key,count,end] of [['sor1_1',221,54],['sor1_2',306,72],['sor1_6',465,160]]){
   await page.selectOption('#song',key);
   await page.click('#nav-piano-roll');
   const doc=await page.evaluate(()=>scoreEditor.currentDocument());
   assert.equal(doc.notes.length,count);assert.equal(doc.endBeat,end);assert.deepEqual(doc.meter,({sor1_1:[3,4],sor1_2:[3,8],sor1_6:[4,4]})[key]);
   assert.equal(await page.locator('.seq-note').count(),count);
   const positions=await page.locator('.seq-note').evaluateAll(nodes=>nodes.map(n=>({left:n.style.left,top:n.style.top,width:n.style.width})));
   assert(positions.every(p=>parseFloat(p.left)>=0&&parseFloat(p.top)>=0&&parseFloat(p.width)>0));
   assert((await page.locator('#seq-origin').textContent()).includes(doc.source.licenseUrl));
   await page.evaluate(()=>{const original=scoreEditor.transportStart;scoreEditor.transportStart=options=>{window.testTransportEnd=options.endBeat;original(options)}});
   await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>0);
   assert.equal(await page.evaluate(()=>window.testTransportEnd),end);
   assert(await page.evaluate(()=>demoEnds>ctx.currentTime));
   await page.click('#seq-stop');
   await page.click('#nav-performance');
  }
  // Download the real JSON from a copy, then import it through the UI and reload storage.
  await page.click('#app-menu');await page.click('#copy-song');
  await page.click('#seq-menu-toggle');await page.click('#editor-menu-dialog [data-panel="song-dialog"]');
  const downloadPromise=page.waitForEvent('download');await page.click('#seq-export');
  const download=await downloadPromise;
  const file=await download.path();const exported=JSON.parse(require('node:fs').readFileSync(file,'utf8'));
  assert.deepEqual(exported.song.source.requiredTuning,{instrument:'guitar',pitchesLowToHigh:[41,45,50,55,59,64],automaticallyApplied:false});
  assert((await page.locator('#seq-origin').textContent()).includes('自動適用されません'));
  assert.equal(exported.song.endBeat,160);assert.equal(exported.song.source.license,'CC BY-SA 3.0');
  assert(exported.song.source.terms.includes('share adaptations'));
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:'sor-copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  const imported=await page.evaluate(()=>scoreEditor.currentDocument());
  assert(exported.song.source.pitch.includes('sixth string F2'));
  assert(exported.song.source.pitch.includes('shifted -12'));
  assert.deepEqual(imported.source,exported.song.source);assert.equal(imported.notes.length,465);
  // Playback extent follows moved notes without rewriting the explicit final-rest marker.
  for(const beat of [180,156]){
   const edited={...exported,song:{...exported.song,notes:[{id:'end-marker-probe',beat,pitch:47,duration:2,velocity:1}]}};
   await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:'end-marker.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(edited))});
   assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().endBeat),160);
   await page.click('#seq-play');
   await page.waitForFunction(expected=>window.testTransportEnd===expected,Math.max(160,beat+2));
   await page.click('#seq-stop');
  }
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));
  assert(saved.songs.some(s=>s.id===imported.id&&s.endBeat===160&&s.source.licenseUrl===exported.song.source.licenseUrl));
  assert.deepEqual(errors,[]);
  console.log('PASS: batch 4, 41-menu integration, three score loads and piano-roll positions, browser playback, attribution, actual JSON download/import and persistence.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
