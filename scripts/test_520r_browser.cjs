const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/guitar-520r-spruce\/\d+\.wav/.test(r.url()))samples.push(r.url())});
  const target=new URL(process.argv[2]||'http://127.0.0.1:8775/synth-demo/');target.searchParams.set('preset','guitar520r');target.searchParams.set('v','note-off-1');await page.goto(target.href);
  assert.equal(await page.locator('#preset').inputValue(),'guitar520r');
  assert.equal(await page.locator('#guitar-520r-spec tbody tr').count(),6);
  assert.equal(await page.locator('#guitar-520r-spec').isVisible(),true);
  for(const id of ['cutoff','release','space'])assert.equal(await page.locator('#'+id).isDisabled(),true);
  await page.click('#power');
  await page.waitForFunction(()=>typeof guitar520rInstrument!=='undefined',null,{timeout:180000});
  const first=await page.evaluate(async()=>{
   const instrument=guitar520rInstrument;
   const nodes=[];const original=instrument.play.bind(instrument);instrument.play=options=>{const source=original(options);nodes.push({midi:options.midi,rate:source.playbackRate.value});return source};
   play('test-low',21);const lowLabel=$('guitar-520r-note-info').textContent;play('test-middle',55);play('test-high',64);
   const lowNote=instrument.manifest.notes.find(n=>n.midi===21);if(lowNote.string!==6||!lowNote.physics.lowTension)throw Error('A0 must use detuned sixth string');
   const polyphony=allVoices.size;await new Promise(resolve=>setTimeout(resolve,180));
   const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const peak=Math.max(...data.map(Math.abs));
   releaseToken('test-low');await new Promise(resolve=>setTimeout(resolve,100));const afterRelease=allVoices.size;stop();
   const afterStop=allVoices.size;
   await startSong();const songVoices=allVoices.size;await new Promise(resolve=>setTimeout(resolve,180));stop();
   return {polyphony,afterRelease,afterStop,songVoices,peak,nodes,lowLabel,notes:instrument.manifest.notes.length};
  });
  assert.equal(first.notes,68);assert.equal(first.polyphony,3);assert.equal(first.afterRelease,2);assert.equal(first.afterStop,0);assert.ok(first.songVoices>0);assert.ok(first.peak>1e-6);assert.ok(first.nodes.slice(0,3).every(n=>n.rate===1));assert.equal(samples.length,68);
  const gated=await page.evaluate(async()=>{
   stop();const voice=play('scheduled-release',64,ctx.currentTime+.04);voice.release(ctx.currentTime+.30);
   const peak=()=>{const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs))};
   await new Promise(resolve=>setTimeout(resolve,140));const before={voices:allVoices.size,peak:peak()};
   await new Promise(resolve=>setTimeout(resolve,340));const after={voices:allVoices.size,peak:peak()};stop();return {before,after};
  });
  assert.equal(gated.before.voices,1);assert.ok(gated.before.peak>1e-6);assert.equal(gated.after.voices,0);assert.ok(gated.after.peak<1e-7,'scheduled note-off must leave silence');
  assert.match(first.lowLabel,/A0.*6弦.*0\.70 kgf.*650\.0 mm/);
  await page.evaluate(()=>changeOctave(-4));await page.keyboard.down('h');
  await page.waitForFunction(()=>[...allVoices].some(voice=>voice.midi===21));
  assert.match(await page.locator('#guitar-520r-note-info').textContent(),/A0.*低張力/);
  await page.keyboard.up('h');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>allVoices.size),0,'key-up stops the guitar');await page.evaluate(()=>{stop();changeOctave(0)});
  await page.locator('#preset').selectOption('lead');assert.equal(await page.locator('#guitar-520r-spec').isVisible(),false);assert.equal(await page.locator('#cutoff').isDisabled(),false);
  await page.locator('#preset').selectOption('guitar520r');await page.click('#power');assert.equal(samples.length,68,'reuse decoded bank');
  await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>wet.gain.value),0,'previous preset delay must stay off');
  await page.screenshot({path:process.env.PMG_520R_SCREENSHOT||'520r-preview.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: mobile selection, 68 real decodes, audio output, per-note sample rates, polyphony, note-off silence, song playback, stop, bank reuse and preset switching',{...first,gated});
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
