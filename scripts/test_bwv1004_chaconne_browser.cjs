const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PMG_BROWSER_EXECUTABLE?{executablePath:process.env.PMG_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8774/synth-demo/');await page.waitForSelector('.app-ready');
  assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),51);assert.equal(await page.locator('#song optgroup:not(#my-song-group)').count(),13);
  await page.click('#nav-library');
  for(const [q,n] of [['',51],['BWV 1004',1],['Chaconne',1],['シャコンヌ',1],['Bach',29],['存在しない曲xyz',0]]){await page.fill('#library-search',q);assert.equal(await page.locator('.library-song').count(),n,q)}
  await page.fill('#library-search','シャコンヌ');await page.locator('.library-song[data-song="chaconne1004"]').click();assert.equal(await page.locator('#song').inputValue(),'chaconne1004');
  await page.click('#nav-instrument');await page.selectOption('#preset','pluck');await page.click('#nav-piano-roll');
  const d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.notes.length,3123);assert.equal(d.endBeat,770);
  assert.equal(await page.locator('.seq-note').count(),3123);assert(await page.locator('.seq-note').evaluateAll(nodes=>nodes.every(n=>parseFloat(n.style.left)>=0&&parseFloat(n.style.top)>=0&&parseFloat(n.style.width)>0)));
  assert.equal(d.notes.filter(n=>n.beat===767&&n.pitch===50&&n.duration===3).length,2);assert(d.source.modifications.includes('NOT realized'));assert(d.source.pitch.includes('NOT guitar notation correction'));
  assert((await page.locator('#seq-origin').textContent()).includes(d.source.licenseUrl));assert((await page.locator('#song-info').textContent()).includes('770秒'));
  await page.evaluate(()=>{const fn=scoreEditor.transportStart;scoreEditor.transportStart=o=>{window.testTransportEnd=o.endBeat;fn(o)}});
  await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>0);assert.equal(await page.evaluate(()=>window.testTransportEnd),770);await page.click('#seq-stop');
  await page.click('#app-menu');await page.click('#editor-menu-dialog [data-panel="song-dialog"]');await page.click('#seq-copy');
  await page.click('#app-menu');await page.click('#editor-menu-dialog [data-panel="song-dialog"]');
  const wait=page.waitForEvent('download');await page.click('#seq-export');const download=await wait;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.song.notes.length,3123);assert.equal(exported.song.endBeat,770);assert.equal(exported.song.source.license,'CC BY-SA 3.0');assert(exported.song.source.modifications.includes('arpeggio'));
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:'chaconne.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  const imported=await page.evaluate(()=>scoreEditor.currentDocument());assert.deepEqual(imported.source,exported.song.source);assert.equal(imported.notes.length,3123);
  await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));assert(saved.songs.some(s=>s.id===imported.id&&s.endBeat===770&&s.source.modifications===exported.song.source.modifications));
  assert.deepEqual(errors,[]);console.log('PASS: 51 songs/13 groups, Chaconne search, all3123 note positions/final unison, end770, current shared menu, actual JSON download/import/reload incl. license/arpeggio/transposition limitations.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
