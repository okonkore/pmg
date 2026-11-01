const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{let name=new URL(req.url,'http://local').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);try{if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.wasm')?'application/wasm':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?preset=configuredGuitar');await page.waitForFunction(()=>document.querySelector('#configured-setup')?.open);await page.waitForSelector('.app-ready');
 const scale=page.locator('#cg-scale');assert.equal(await scale.getAttribute('step'),'any');assert.equal(await scale.getAttribute('max'),null);
 for(const value of ['0','53']){await scale.fill(value);await page.locator('#configured-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#configured-error').textContent.length>0);assert.equal(await page.locator('#configured-setup').evaluate(e=>e.open),true);assert.match(await page.locator('#configured-error').textContent(),value==='0'?/0より大きい有限/:/3弦.*55/);}
 for(const value of ['-1','']){await scale.fill(value);assert.equal(await scale.evaluate(e=>e.checkValidity()),false);}
 await scale.fill('1000.123456789');assert.equal(await scale.evaluate(e=>e.checkValidity()),true);
 // Bound real app preparation to one note, without replacing its Worker or synthesis.
 await page.evaluate(()=>{keys.splice(0,keys.length,['E4',64,'d',0]);scoreEditor.importDocument({title:'Short scale single note',bpm:120,meter:[4,4],notes:[{id:'one',pitch:64,beat:0,duration:1,velocity:1}]})});
 await page.click('#nav-instrument');await page.click('#configured-reopen');await page.waitForFunction(()=>document.querySelector('#configured-setup').open);await scale.fill('1000.123456789');
 await page.locator('#configured-form button[type=submit]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pmg-configured-guitar-settings-v1'))?.scaleMm===1000.123456789,{},{timeout:60000}).catch(async e=>{console.error(await page.evaluate(()=>({setup:document.querySelector('#configured-setup').open,error:document.querySelector('#configured-error').textContent,stage:document.querySelector('#configured-stage').textContent,count:document.querySelector('#configured-count').textContent,valid:document.querySelector('#configured-form').checkValidity(),draft:localStorage.getItem('pmg-configured-guitar-draft-v1')})));throw e});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#configured-setup')?.open);assert.equal(await scale.inputValue(),'1000.123456789');await scale.fill('60');await page.click('#configured-cancel');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg-configured-guitar-settings-v1')).scaleMm),1000.123456789);
 const result=await page.evaluate(async()=>{
  const {createPreparedGuitar}=await import('/instruments/configured-guitar/bank.js');const config=await(await fetch('/instruments/configured-guitar/default-settings.json')).json();
  const Native=Worker,live=new Set();globalThis.Worker=class extends Native{constructor(...a){super(...a);live.add(this)}terminate(){live.delete(this);super.terminate()}};
  const ctx={sampleRate:48000,destination:null,createBuffer(_n,length,rate){const data=new Float32Array(length);return {length,sampleRate:rate,getChannelData:()=>data}}};const bank=await createPreparedGuitar(ctx);const check=(v,s)=>{if(!v)throw Error(s)};
  try{await bank.prepare({...config,scaleMm:1000.123456789},{midis:[64]});const prior=bank.active;
   const thin={...config,scaleMm:10,strings:config.strings.map(s=>({number:s.number,openMidi:s.openMidi,construction:'plain',diameterMm:.1,youngGPa:.1,densityKgM3:20000,lossAngle:.02}))};let failure='';try{await bank.prepare(thin,{midis:['83@1']})}catch(e){failure=e.message}
   check(/48000 Hz.*弦1.*フレット19/.test(failure),'specific guard failure');check(bank.active===prior,'old bank retained');check(live.size===0,'failed Workers terminated');check(await bank.has(64),'old note retained');check(!await bank.has('83@1'),'failed variant not playable');await bank.prepare({...config,scaleMm:1000.123456789},{midis:[64]});check(bank.lastPreparation.reused===1,'old cache reusable');return {failure,oldBank:true,workerCleanup:true,cacheReuse:true};
  }finally{bank.dispose();globalThis.Worker=Native}
 });assert.deepEqual(errors,[]);console.log(JSON.stringify({mobileEmulation:true,exactPersistence:true,cancelDraft:true,invalidInput:true,actualWorker:true,...result}));
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
