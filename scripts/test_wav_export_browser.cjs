const assert=require('node:assert/strict'),fs=require('node:fs');const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));try{
 for(const ui of ['', '?ui=v2']){
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.argv[2]||'http://127.0.0.1:8787/synth-demo/')+ui);await p.waitForFunction(()=>!!window.PMGWavExport);
  await p.evaluate(()=>{scoreEditor.importDocument({title:'WAV test',bpm:120,meter:[4,4],notes:[{id:'a',pitch:64,beat:0,duration:1,velocity:1},{id:'b',pitch:64,beat:1,duration:1,velocity:.25}],tempoChanges:[{id:'r',startBeat:0,endBeat:2,targetBpm:60,after:'hold',curve:'bpm'}]});$('preset').value='organ';selectPreset();$('reverb').value='.5';$('reverb').dispatchEvent(new Event('input'));$('space').value='0';$('space').dispatchEvent(new Event('input'));});
  const saved=await p.evaluate(()=>localStorage.getItem('pmg.songs.v1'));
  await p.evaluate(()=>AppShell.openPanel('song-dialog'));await p.click('#song-export-wav');await p.click('#wav-start');await p.waitForFunction(()=>document.getElementById('wav-progress').value>0);await p.click('#wav-cancel');assert.equal(await p.locator('#wav-result').isVisible(),false);assert.equal(await p.evaluate(()=>PMGWavExport.active),false);
  await p.click('#wav-start');await p.waitForSelector('#wav-result:not([hidden])',{timeout:30000});
  const record=await p.evaluate(async()=>{const bytes=await (await fetch($('wav-download').href)).arrayBuffer(),d=new DataView(bytes),rate=d.getUint32(24,true),frames=d.getUint32(40,true)/4;const rms=(a,b)=>{let sum=0;for(let f=Math.floor(a*rate);f<Math.min(frames,Math.floor(b*rate));f++){const x=d.getInt16(44+f*4,true)/32768;sum+=x*x}return Math.sqrt(sum/((b-a)*rate))};return {size:bytes.byteLength,rate,frames,seconds:frames/rate,strong:rms(.1,.3),soft:rms(.8,1),tail:rms(1.6,2),last:rms(frames/rate-.2,frames/rate),channels:d.getUint16(22,true),bits:d.getUint16(34,true),riff:d.getUint32(4,true)}});
  assert.equal(record.channels,2);assert.equal(record.bits,16);assert.equal(record.size,record.riff+8);assert(Math.abs(record.seconds-(2*Math.log(2)+12))<1/record.rate);assert(record.strong>record.soft);assert(record.tail>0);assert(record.last<record.strong*.001);
  const download=p.waitForEvent('download');await p.click('#wav-download');const dl=await download;assert.equal(dl.suggestedFilename(),'WAV test.wav');const downloaded=fs.readFileSync(await dl.path());assert.equal(downloaded.length,record.size);
  assert.equal(await p.evaluate(()=>localStorage.getItem('pmg.songs.v1')),saved);assert.equal(await p.evaluate(()=>demoEnds),0);assert.equal(await p.evaluate(()=>PMGWavExport.active),false);
  await p.click('#wav-close');assert.equal(await p.locator('#wav-download').getAttribute('href'),null);
  // A canceled or too-large export must leave no file and no playback running.
  await p.evaluate(()=>{const d=scoreEditor.currentDocument();d.endBeat=4096;scoreEditor.importDocument(d);PMGWavExport.open()});await p.click('#wav-start');await p.waitForFunction(()=>!PMGWavExport.active);assert.match(await p.locator('#wav-status').textContent(),/64 MiB/);assert.equal(await p.locator('#wav-result').isVisible(),false);
  assert.deepEqual(errors,[]);console.log(ui||'classic',record,'download, restart/cancel, limits, data preservation passed');await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
