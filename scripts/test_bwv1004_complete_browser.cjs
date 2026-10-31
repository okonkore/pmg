const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PMG_BROWSER_EXECUTABLE||'/usr/bin/chromium'});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.argv[2]||'http://127.0.0.1:8776/synth-demo/');await page.waitForSelector('.app-ready');
 assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),55);
 await page.click('#nav-library');await page.fill('#library-search','BWV 1004');assert.equal(await page.locator('.library-song').count(),5);
 for(const [key,count,end] of [['allemande1004',1094,257],['courante1004',858,325],['sarabanda1004',534,156],['giga1004',1816,480]]){
  await page.click('#nav-library');await page.fill('#library-search','BWV 1004');await page.locator(`.library-song[data-song="${key}"]`).click();await page.click('#nav-instrument');await page.selectOption('#preset','pluck');await page.click('#nav-piano-roll');
  const d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.notes.length,count);assert.equal(d.endBeat,end);assert.equal(await page.locator('.seq-note').count(),count);
  assert(await page.locator('.seq-note').evaluateAll(nodes=>nodes.every(n=>parseFloat(n.style.left)>=0&&parseFloat(n.style.top)>=0&&parseFloat(n.style.width)>0)));
  assert((await page.locator('#seq-origin').textContent()).includes(d.source.licenseUrl));
  await page.evaluate(()=>{const fn=scoreEditor.transportStart;scoreEditor.transportStart=o=>{window.testTransportEnd=o.endBeat;fn(o)}});await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>0);assert.equal(await page.evaluate(()=>window.testTransportEnd),end);await page.click('#seq-stop');
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.click('#seq-copy');await page.evaluate(()=>AppShell.openPanel('song-dialog'));
  const wait=page.waitForEvent('download');await page.click('#seq-export');const exported=JSON.parse(fs.readFileSync(await (await wait).path(),'utf8'));assert.equal(exported.song.notes.length,count);assert.deepEqual(exported.song.source,d.source);assert.equal(exported.song.endBeat,end);
  await page.evaluate(()=>AppShell.openPanel('song-dialog'));await page.locator('#seq-file').setInputFiles({name:key+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  const imported=await page.evaluate(()=>scoreEditor.currentDocument());assert.deepEqual(imported.notes,exported.song.notes);assert.deepEqual(imported.source,d.source);
  await page.reload();await page.waitForSelector('.app-ready');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));assert(saved.songs.some(s=>s.id===imported.id&&s.endBeat===end&&s.notes.length===count));
 }
 assert.deepEqual(errors,[]);console.log('PASS:55 songs, all four full piano rolls, transport ends, source links, JSON download/import/reload.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
