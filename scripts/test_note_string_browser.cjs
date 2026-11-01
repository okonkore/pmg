const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));try{if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const Native=Worker;window.workers=new Set();window.renderRequests=[];window.Worker=class extends Native{constructor(...a){super(...a);workers.add(this)}postMessage(d,...a){if(d.type==='render')renderRequests.push({midi:d.midi,stringNumber:d.stringNumber});return super.postMessage(d,...a)}terminate(){workers.delete(this);super.terminate()}}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForSelector('.app-ready');
  const songId=await page.evaluate(()=>{return scoreEditor.importDocument({title:'String variants',bpm:120,meter:[4,4],endBeat:2,notes:[{id:'first',pitch:64,beat:0,duration:.4,velocity:.8},{id:'second',pitch:64,beat:.5,duration:.4,velocity:.8,stringNumber:2}]});});
  await page.click('#nav-piano-roll');await page.locator('.seq-note').first().click();await page.evaluate(()=>AppShell.openPanel('note-dialog'));await page.selectOption('#seq-string','3');
  assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].pitch),64);assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].stringNumber),3);
  await page.locator('#note-dialog [data-dismiss]').click();await page.click('#seq-undo');assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].stringNumber),undefined);await page.click('#seq-redo');await page.evaluate(()=>AppShell.openPanel('note-dialog'));assert.equal(await page.locator('#seq-string').inputValue(),'3');
  await page.locator('#seq-pitch').fill('C2');await page.locator('#seq-pitch').dispatchEvent('change');assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[0].pitch),64);
  await page.selectOption('#seq-string','');await page.evaluate(()=>scoreEditor.save());assert(await page.locator('#seq-string').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
  await page.locator('#note-dialog [data-dismiss]').click();await page.reload();await page.waitForSelector('.app-ready');await page.evaluate(id=>{$('song').value=id;$('song').onchange()},songId);await page.click('#nav-piano-roll');assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes[1].stringNumber),2);
  await page.evaluate(()=>AppShell.openPanel('tab-dialog'));assert.match(await page.locator('#tab-document').textContent(),/指定弦/);await page.locator('#tab-dialog [data-dismiss]').click();
  // Normal configured guitar setup: only the selected song variants and one keyboard pitch.
  await page.evaluate(()=>{keys.splice(0,keys.length,['E4',64,'a',0]);});await page.click('#nav-instrument');
  await page.evaluate(()=>{$('preset').value='configuredGuitar';$('preset').onchange()});await page.waitForSelector('#configured-setup[open]');
  await page.locator('#configured-form button[type=submit]').click();await page.waitForSelector('#configured-progress[open]');await page.waitForFunction(()=>!document.querySelector('#configured-progress').open,{},{timeout:180000});
  assert.deepEqual(await page.evaluate(()=>renderRequests),[{midi:64,stringNumber:undefined},{midi:64,stringNumber:2}]);assert.equal(await page.evaluate(()=>workers.size),0);
  const records=await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('pmg-physical-guitar-prepared-v1');q.onsuccess=()=>r(q.result)});const all=await new Promise(r=>{const q=db.transaction('notes').objectStore('notes').getAll();q.onsuccess=()=>r(q.result)});db.close();return Promise.all(all.map(async x=>({string:x.physics.string,fret:x.physics.fret,rate:x.rate,peak:x.peak,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',x.pcm))).map(b=>b.toString(16).padStart(2,'0')).join(''),frames:x.frames})));});
  assert.deepEqual(records.map(x=>x.string).sort(),[1,2]);assert(records.every(x=>x.peak>0&&x.peak<=2&&x.frames>0));assert.notEqual(records[0].hash,records[1].hash);
  await page.evaluate(()=>{const original=play;window.played=[];play=(...args)=>{played.push({pitch:args[1],string:args[4]});return original(...args)}});
  await page.click('#nav-piano-roll');await page.locator('#seq-loop').check();await page.click('#seq-rewind');await page.click('#seq-play');await page.waitForFunction(()=>played.length>=4);await page.click('#seq-stop');
  assert.deepEqual(await page.evaluate(()=>played.slice(0,4).map(x=>x.string)),[undefined,2,undefined,2]);assert.equal(await page.evaluate(()=>renderRequests.length),2,'repeat reuses cache');
  await page.evaluate(()=>{played=[];return startSong({fromBeat:.5})});await page.waitForFunction(()=>played.length>0);assert.equal(await page.evaluate(()=>played[0].string),2);await page.evaluate(()=>stop());
  // Add a missing third-string variant, then cancel preparation via Stop.
  await page.evaluate(()=>{const d=scoreEditor.currentDocument();d.notes[0].stringNumber=3;scoreEditor.importDocument(d);window.cancelledStart=startSong();});
  await page.waitForSelector('#configured-progress[open]');await page.click('#configured-abort');await page.evaluate(()=>window.cancelledStart);assert.equal(await page.evaluate(()=>workers.size),0);
  await page.evaluate(()=>{window.retryStart=startSong()});await page.waitForFunction(()=>demoEnds>0,{},{timeout:180000});await page.evaluate(()=>stop());assert.equal(await page.evaluate(()=>workers.size),0);
  assert.equal(await page.evaluate(()=>renderRequests.filter(x=>x.stringNumber===2).length),1,'already prepared alternate string reused');assert(await page.evaluate(()=>renderRequests.some(x=>x.stringNumber===3)),'third-string waveform generated');
  const requestCount=await page.evaluate(()=>renderRequests.length);await page.click('#nav-instrument');await page.evaluate(()=>{$('preset').value='harpsichord';$('preset').onchange();return startSong()});await page.waitForFunction(()=>demoEnds>0);await page.evaluate(()=>stop());assert.equal(await page.evaluate(()=>renderRequests.length),requestCount,'harpsichord never prepares guitar variants');
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(JSON.stringify({ui:true,persistence:true,undo:true,invalidPitchRejected:true,tab:true,actualWaveforms:records,loopSeek:true,cancelRetry:true,defaultKeyboard:true,chromiumMobileOnly:true}));
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
