const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));try{
 for(const ui of ['', '?ui=v2']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.argv[2]||'http://127.0.0.1:8779/synth-demo/')+ui);await page.waitForSelector(ui?'[data-v2-ready=true]':'.app-ready');
  await page.evaluate(()=>{scoreEditor.importDocument({title:'Stop rewind test',bpm:300,meter:[4,4],notes:[{id:'a',beat:0,pitch:60,duration:4,velocity:1}],tempoChanges:[]});document.getElementById('preset').value='organ';selectPreset()});
  const button=page.locator('#seq-stop');const action=async expected=>{assert.equal(await button.getAttribute('data-action'),expected);assert.equal(await button.getAttribute('aria-label'),expected==='stop'?'再生を停止':'先頭に戻る')};
  const cursor=()=>page.evaluate(()=>scoreEditor.selectionTools.state().cursor);
  const saved=await page.evaluate(()=>localStorage.getItem('pmg.songs.v1'));
  await action('rewind');await button.tap();assert.equal(await cursor(),0);assert.equal(await page.evaluate(()=>demoEnds),0);
  await page.evaluate(()=>startSong({fromBeat:1}));await page.waitForTimeout(180);await action('stop');const box=await button.boundingBox();
  await button.tap();await action('rewind');const paused=await cursor();assert(paused>1&&paused<4);await page.waitForTimeout(150);assert.equal(await cursor(),paused);
  const after=await button.boundingBox();assert(Math.abs(after.x-box.x)<1&&Math.abs(after.y-box.y)<1,'Same button position: '+JSON.stringify({box,after}));
  await button.tap();assert.equal(await cursor(),0);assert.equal(await page.evaluate(()=>demoEnds),0);assert.equal(await page.evaluate(()=>allVoices.size),0);
  // Natural completion must offer rewind without starting another song.
  await page.evaluate(()=>startSong());await page.waitForFunction(()=>demoEnds===0);await action('rewind');assert.equal(await cursor(),4);await button.tap();assert.equal(await cursor(),0);assert.equal(await page.evaluate(()=>demoEnds),0);
  // Loop stays in stop mode across the end, then stops at the current position.
  await page.evaluate(()=>startSong({fromBeat:1,loop:true}));await page.waitForTimeout(900);await action('stop');assert.equal(await page.evaluate(()=>demoEnds),Infinity);
  await button.tap();await action('rewind');await button.tap();assert.equal(await cursor(),0);
  // Other stop paths use the same state update.
  await page.evaluate(()=>startSong());await page.evaluate(()=>stop());await action('rewind');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pmg.songs.v1')),saved);assert.deepEqual(errors,[]);
  console.log((ui||'classic')+': touch stop/rewind, stationary button, seek, natural end, loop, external stop, labels and saved data passed.');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
