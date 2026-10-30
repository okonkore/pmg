// Chromium mobile emulation, not an iPhone Safari test.
// Serve the repository, then run: PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_touch_fields.cjs
const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PMG_BROWSER_EXECUTABLE?{executablePath:process.env.PMG_BROWSER_EXECUTABLE}:{}),args:['--mute-audio']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/synth-demo/');await page.waitForSelector('.app-ready');
  const panel=async id=>{await page.evaluate(id=>AppShell.openPanel(id),id)};
  const close=async id=>{await page.click('#'+id+' [data-dismiss]');await page.waitForFunction(()=>!history.state?.pmgPanel)};
  const cdp=await page.context().newCDPSession(page);
  const send=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  async function point(selector,edge=false){
   const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();const r=await el.boundingBox();
   return {x:r.x+(edge?r.width-3:Math.min(15,r.width/2)),y:r.y+r.height/2,id:1};
  }
  async function fields(selector){
   const sizes=await page.locator(selector).evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({id:e.id||e.dataset.field,size:parseFloat(getComputedStyle(e).fontSize),selection:getComputedStyle(e).userSelect})));
   assert(sizes.length);for(const f of sizes){assert(f.size>=16,`${f.id}: ${f.size}px invites focus zoom`);assert.notEqual(f.selection,'none',`${f.id} must allow editing/selection`)}
  }
  async function width(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page horizontal overflow')}
  assert(!/maximum-scale|user-scalable/.test(await page.locator('meta[name=viewport]').getAttribute('content')),'Native browser zoom remains available');
  await page.click('#nav-instrument');await fields('#instrument-screen select');
  const key=await point('.key.white');
  for(const end of ['touchEnd','touchCancel','touchEnd']){
   await send('touchStart',[key]);await page.waitForTimeout(550);await send(end);
   assert.equal(await page.evaluate(()=>held.size),0,'Release/cancel clears held instrument keys');
   assert.equal(await page.evaluate(()=>getSelection().toString()),'','Long press must not select key labels');
   assert.equal(await page.locator('.key.active').count(),0);
  }
  await page.click('#nav-piano-roll');await panel('song-dialog');await page.click('#seq-new');await page.click('#seq-draw');
  await panel('song-dialog');await fields('#seq-title,#seq-bpm,#seq-meter');await close('song-dialog');
  await page.locator('#seq-scroll').scrollIntoViewIfNeeded();
  await page.locator('#seq-scroll').evaluate(e=>{e.scrollLeft=0;e.scrollTop=(108-60)*20-120});
  const grid=await page.locator('#seq-grid').boundingBox();const blank={x:grid.x+61,y:grid.y+48*20+8,id:1};
  await send('touchStart',[blank]);await send('touchEnd');
  assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.length),1);
  await panel('note-dialog');await fields('.seq-inspector input:not([type=range])');await close('note-dialog');
  const snapshot=await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument()));
  // Long press and canceled drag must not delete, commit a draft, or leave a stuck gesture.
  let note=await point('.seq-note');await send('touchStart',[note]);await page.waitForTimeout(600);await send('touchEnd');
  assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),snapshot);
  note=await point('.seq-note');await send('touchStart',[note]);await send('touchMove',[{...note,x:note.x+56}]);await send('touchCancel');
  assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),snapshot,'Cancel discards moved note');
  note=await point('.seq-note');await send('touchStart',[note]);await send('touchMove',[{...note,x:note.x+56}]);await send('touchEnd');
  assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].beat),2,'Move after cancel works');
  note=await point('.seq-note',true);await send('touchStart',[note]);await send('touchMove',[{...note,x:note.x+56}]);await send('touchEnd');
  assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].duration),2,'Resize works');
  await page.click('#seq-undo');await page.click('#seq-undo');
  assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),snapshot,'Undo restores original song');
  await panel('song-dialog');await page.locator('#seq-title').fill('Touch field selection');
  await page.locator('#seq-title').evaluate(e=>{e.focus();e.setSelectionRange(0,5)});
  assert.deepEqual(await page.locator('#seq-title').evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,5]);
  await page.locator('#seq-title').blur();await page.locator('#seq-bpm').fill('123');await page.locator('#seq-bpm').blur();
  assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().bpm),123);
  await width();await close('song-dialog');await page.click('#nav-performance');await page.click('#nav-piano-roll');
  assert.equal(await page.locator('#seq-title').inputValue(),'Touch field selection');
  await page.click('#nav-instrument');await page.selectOption('#preset','configuredGuitar');
  await fields('#configured-setup input,#configured-setup select');
  await page.locator('#cg-scale').fill('700');await page.locator('#cg-scale').blur();
  await page.click('#cg-manage');await fields('#configured-string-sets input,#configured-string-sets select');
  await page.click('#string-sets-copy');await page.locator('#string-sets-name').fill('Selection stays editable');
  await page.locator('#string-sets-name').evaluate(e=>{e.focus();e.setSelectionRange(0,9)});
  assert.equal(await page.locator('#string-sets-name').evaluate(e=>e.selectionEnd-e.selectionStart),9);
  await width();page.on('dialog',d=>d.accept());await page.click('#string-sets-close');await page.click('#configured-cancel');
  assert.equal(await page.locator('#configured-setup').evaluate(e=>e.open),false);
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  const desktop=await browser.newPage({viewport:{width:1280,height:900}});
  await desktop.goto(process.argv[2]||'http://127.0.0.1:8766/synth-demo/');
  await desktop.waitForSelector('.app-ready');await desktop.click('#nav-piano-roll');await desktop.evaluate(()=>AppShell.openPanel('song-dialog'));await desktop.click('#seq-new');
  assert.equal(await desktop.locator('#seq-bpm').evaluate(e=>getComputedStyle(e).fontSize),'16px','Dialog input stays readable on desktop too');
  await desktop.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: 16px touch fields, editable selection, long presses, instrument release/cancel/repeat, note creation/move/resize/cancel/undo, song preservation, modal cancel, mobile width (Chromium emulation only).');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
