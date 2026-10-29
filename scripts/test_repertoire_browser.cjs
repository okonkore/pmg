const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PMG_BROWSER_EXECUTABLE?{executablePath:process.env.PMG_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/synth-demo/');
  assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),22);
  await page.selectOption('#preset','pluck');
  for(const [key,count,end] of [['menuet1007',134,72],['menuet2_1007',126,72],['sor35_22',416,144]]){
   await page.selectOption('#song',key);
   await page.click('#open-editor');
   const doc=await page.evaluate(()=>scoreEditor.currentDocument());
   assert.equal(doc.notes.length,count);assert.equal(doc.endBeat,end);assert.deepEqual(doc.meter,[3,4]);
   assert.equal(await page.locator('.seq-note').count(),count);
   const positions=await page.locator('.seq-note').evaluateAll(nodes=>nodes.map(n=>({left:n.style.left,top:n.style.top,width:n.style.width})));
   assert(positions.every(p=>parseFloat(p.left)>=0&&parseFloat(p.top)>=0&&parseFloat(p.width)>0));
   assert((await page.locator('#seq-origin').textContent()).includes(doc.source.licenseUrl));
   await page.evaluate(()=>{const original=scoreEditor.transportStart;scoreEditor.transportStart=options=>{window.testTransportEnd=options.endBeat;original(options)}});
   await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>0);
   assert.equal(await page.evaluate(()=>window.testTransportEnd),end);
   assert(await page.evaluate(()=>demoEnds>ctx.currentTime));
   await page.click('#seq-stop');
   await page.click('#back-performance');
  }
  // Download the real JSON from a copy, then import it through the UI and reload storage.
  await page.click('#copy-song');
  if(await page.locator('#seq-menu-toggle').getAttribute('aria-expanded')==='false')await page.locator('#seq-menu-toggle').click();
  const downloadPromise=page.waitForEvent('download');await page.click('#seq-export');
  const download=await downloadPromise;
  const file=await download.path();const exported=JSON.parse(require('node:fs').readFileSync(file,'utf8'));
  assert.equal(exported.song.endBeat,144);assert.equal(exported.song.source.license,'CC BY-SA 3.0');
  assert(exported.song.source.terms.includes('share adaptations'));
  await page.locator('#seq-file').setInputFiles({name:'sor-copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  const imported=await page.evaluate(()=>scoreEditor.currentDocument());
  assert.deepEqual(imported.source,exported.song.source);assert.equal(imported.notes.length,416);
  // Playback extent follows moved notes without rewriting the explicit final-rest marker.
  for(const beat of [200,141]){
   const edited={...exported,song:{...exported.song,notes:[{id:'end-marker-probe',beat,pitch:47,duration:2,velocity:1}]}};
   await page.locator('#seq-file').setInputFiles({name:'end-marker.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(edited))});
   assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().endBeat),144);
   await page.click('#seq-play');
   await page.waitForFunction(expected=>window.testTransportEnd===expected,Math.max(144,beat+2));
   await page.click('#seq-stop');
  }
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));
  assert(saved.songs.some(s=>s.id===imported.id&&s.endBeat===144&&s.source.licenseUrl===exported.song.source.licenseUrl));
  assert.deepEqual(errors,[]);
  console.log('PASS: 22-menu integration, three score loads and piano-roll positions, browser playback, attribution, actual JSON download/import and persistence.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
