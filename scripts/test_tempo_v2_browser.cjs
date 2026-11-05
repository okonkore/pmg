// UI composition regression: both presentations must preserve tempo controls and playback.
const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));
 try{for(const ui of ['', '?ui=v2']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.argv[2]||'http://127.0.0.1:8771/synth-demo/')+ui);await page.waitForSelector(ui?'[data-v2-ready=true]':'.app-ready');
  await page.evaluate(()=>scoreEditor.importDocument({title:'Saved tempo regression',bpm:120,meter:[4,4],notes:[{id:'n',beat:0,pitch:60,duration:8,velocity:1}],tempoChanges:[{id:'r',startBeat:0,endBeat:8,targetBpm:60,after:'hold',curve:'bpm'}]}));
  assert.equal(await page.locator('#seq-current-bpm').count(),1);assert.equal(await page.locator('#seq-tempo').count(),1);
  await page.click('#seq-tempo');await page.waitForSelector('#seq-tempo-dialog[open]');assert.equal(await page.locator('#tempo-list button').count(),1);await page.click('#tempo-close');
  const saved=await page.evaluate(()=>localStorage.getItem('pmg.songs.v1'));
  const result=await page.evaluate(async()=>{
   document.getElementById('preset').value='organ';selectPreset();const results=[];
   for(const fromBeat of [0,4]){
    await startSong({fromBeat,loop:fromBeat===4});await new Promise(r=>setTimeout(r,250));
    const wave=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(wave);
    results.push({status:document.getElementById('status').textContent,bpm:parseFloat(document.getElementById('seq-current-bpm').textContent),peak:Math.max(...wave.map(Math.abs)),playDisabled:document.getElementById('seq-play').disabled});stop();
   }
   return results;
  });
  for(const r of result){assert(!/できません|エラー/.test(r.status),r.status);assert(r.peak>1e-6);assert(r.playDisabled)}
  assert(result[0].bpm>110&&result[0].bpm<120);assert(result[1].bpm>80&&result[1].bpm<90);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pmg.songs.v1')),saved);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log(ui||'classic',result);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
