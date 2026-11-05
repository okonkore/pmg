const assert=require('node:assert/strict');const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));try{
 const base=process.argv[2]||'http://127.0.0.1:8783/synth-demo/';
 for(const ui of ['', '?ui=v2']){
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+ui);await p.waitForSelector(ui?'[data-v2-ready=true]':'.app-ready');
  const id=await p.evaluate(()=>scoreEditor.importDocument({title:'Strength',bpm:120,meter:[4,4],notes:[{id:'a',pitch:64,beat:0,duration:1,velocity:1,stringNumber:1},{id:'b',pitch:64,beat:2,duration:1,velocity:.5,stringNumber:1}]}));
  await p.locator('[data-note="a"]').tap();await p.click('#seq-note-settings');await p.fill('#seq-velocity-number','32');await p.locator('#seq-velocity-number').blur();
  assert.equal((await p.evaluate(()=>scoreEditor.currentDocument())).notes[0].velocity,32/127);
  for(const invalid of ['0','128','1.5','']){await p.fill('#seq-velocity-number',invalid);await p.locator('#seq-velocity-number').blur();assert.equal((await p.evaluate(()=>scoreEditor.currentDocument())).notes[0].velocity,32/127)}
  await p.fill('#seq-velocity-number','32');await p.locator('#seq-velocity-number').blur();await p.locator('#note-dialog [data-dismiss]').click();
  await p.click('#seq-undo');assert.equal((await p.evaluate(()=>scoreEditor.currentDocument())).notes[0].velocity,1);await p.locator('#seq-redo').evaluate(e=>e.click());
  await p.locator('#seq-scroll').focus();await p.keyboard.press('Control+a');await p.click('#seq-note-settings');assert.match(await p.locator('#seq-velocity-out').textContent(),/混在/);assert.equal(await p.inputValue('#seq-velocity-number'),'');
  await p.fill('#seq-velocity-number','64');await p.locator('#seq-velocity-number').blur();assert((await p.evaluate(()=>scoreEditor.currentDocument())).notes.every(n=>n.velocity===64/127));await p.locator('#note-dialog [data-dismiss]').click();await p.click('#seq-undo');
  await p.evaluate(()=>{scoreEditor.selectionTools.copy();scoreEditor.selectionTools.paste(4)});let d=await p.evaluate(()=>scoreEditor.currentDocument());assert.deepEqual(d.notes.map(n=>n.velocity),[32/127,.5,32/127,.5]);
  const roundtrip=await p.evaluate(()=>{const lib=new SequencerModel.Library({},null);return lib.import(lib.export(scoreEditor.currentDocument())).notes.map(n=>n.velocity)});assert.deepEqual(roundtrip,d.notes.map(n=>n.velocity));
  await p.reload();await p.waitForSelector(ui?'[data-v2-ready=true]':'.app-ready');await p.evaluate(id=>{$('song').value=id;$('song').dispatchEvent(new Event('change'))},id);assert.deepEqual((await p.evaluate(()=>scoreEditor.currentDocument())).notes,d.notes);
  const played=await p.evaluate(async()=>{document.getElementById('preset').value='organ';selectPreset();const original=play,values=[];play=(...a)=>{values.push(a[3]);return original(...a)};try{await startSong({fromBeat:2});await new Promise(r=>setTimeout(r,120));stop();return values}finally{play=original}});assert.equal(played[0],.5);
  assert.deepEqual(errors,[]);console.log(ui||'classic','strength UI, validation, mixed selection, copy, undo, JSON, reload, scheduler passed');await p.close();
 }
 // Render one real configured-guitar note, then measure the existing per-note gain path.
 const p=await browser.newPage();await p.goto(base);await p.waitForSelector('.app-ready');
 const audio=await p.evaluate(async()=>{
  const {createPreparedGuitar}=await import('./instruments/configured-guitar/bank.js');const config=await (await fetch('./instruments/configured-guitar/default-settings.json')).json();
  const c=new OfflineAudioContext(1,96000,48000),bank=await createPreparedGuitar(c);await bank.prepare(config,{midis:['64@1']});
  const strong=bank.play({midi:64,stringNumber:1,when:0,gain:1}),soft=bank.play({midi:64,stringNumber:1,when:1,gain:32/127});await Promise.all([strong.ready,soft.ready]);strong.release(.4);soft.release(1.4);
  const pcm=(await c.startRendering()).getChannelData(0);const rms=offset=>Math.sqrt(pcm.slice(offset,offset+16800).reduce((s,v)=>s+v*v,0)/16800);return {strong:rms(0),soft:rms(48000),ratio:rms(48000)/rms(0)};
 });assert(audio.strong>0);assert(Math.abs(audio.ratio-32/127)<1e-5);console.log('Actual configured-guitar offline PCM gain ratio:',audio);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
