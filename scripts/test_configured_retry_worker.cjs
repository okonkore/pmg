const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;if(name==='/'){res.end('<!doctype html><title>Retry lifecycle</title>');return;}const file=path.resolve(root,'.'+name);try{if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.wasm')?'application/wasm':'application/json');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch(launchOptions({headless:true}));const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const {createPreparedGuitar}=await import('/instruments/configured-guitar/bank.js'),{signature}=await import('/instruments/configured-guitar/settings.js');
  const config=await(await fetch('/instruments/configured-guitar/default-settings.json')).json();config.scaleMm=500;config.pluckPositionMm=100;
  const check=(v,s)=>{if(!v)throw Error(s);},Native=Worker,live=new Set();let cancelOnRetry=false,seenRetry=false,bank,replacement=null,replaceOnRetry=false;
  globalThis.Worker=class extends Native{constructor(...args){super(...args);live.add(this)}postMessage(data,...args){this.lastRequest=data;return super.postMessage(data,...args)}terminate(){live.delete(this);super.terminate();const id=this.lastRequest?.id;queueMicrotask(()=>this.onmessage?.({data:{id,type:'rendered',pcm:new Uint8Array(3),frames:1,physics:{},rate:44100}}))}};
  const context={sampleRate:44100,destination:null,createBuffer(_n,length,rate){const data=new Float32Array(length);return {length,sampleRate:rate,getChannelData:()=>data}}};
  bank=await createPreparedGuitar(context,{onProgress:p=>{if(p.running?.some(x=>/再計算/.test(x.stage))){seenRetry=true;if(replaceOnRetry){replaceOnRetry=false;replacement=bank.prepare({...config,scaleMm:650},{midis:[]});}else if(cancelOnRetry)bank.cancel();}}});
  try{
   // Empty bank gives a committed prior setting without synthesizing unrelated notes.
   await bank.prepare({...config,scaleMm:650},{midis:[]});const prior=bank.active;
   const db=await new Promise(resolve=>{const r=indexedDB.open('pmg-physical-guitar-prepared-v1');r.onsuccess=()=>resolve(r.result)});
   const oldKey='full-pressure-m256-r1:'+signature(config)+':44100:59';
   await new Promise(resolve=>{const tx=db.transaction('notes','readwrite');tx.objectStore('notes').put({sentinel:true},oldKey);tx.oncomplete=resolve});
   cancelOnRetry=true;let cancelled=false;try{await bank.prepare(config,{midis:[59]})}catch(e){cancelled=e.name==='AbortError'}
   check(cancelled&&seenRetry,'real retry is cancellable');check(bank.active===prior,'cancel retains old bank');check(live.size===0,'cancel terminates Worker');check(!(await bank.has(59)),'failed partial not playable');
   cancelOnRetry=false;replaceOnRetry=true;let superseded=false;try{await bank.prepare(config,{midis:[59]})}catch(e){superseded=e.name==='AbortError'}await replacement;check(superseded&&bank.active.config.scaleMm===650,'setting change supersedes retry');check(live.size===0,'late old reply cannot retain Worker');
   seenRetry=false;await bank.prepare(config,{midis:[59]});check(seenRetry,'legacy cache cannot hide real retry');check(live.size===0,'success releases Worker');check(bank.lastPreparation.generated===1,'new cache policy generates');
   const key=bank.active.configKey+':44100:59',record=await new Promise(resolve=>{const r=db.transaction('notes').objectStore('notes').get(key);r.onsuccess=()=>resolve(r.result)});
   check(record.integration.block===2&&record.integration.attempts.length===1,'persist retry provenance');check(record.integration.attempts[0].sample===11840,'Chromium reproduces same failure');
   const loaded=await bank.ensure(59);check(loaded.buffer.length===record.frames,'complete cached PCM loads');
   await bank.prepare(config,{midis:[59]});check(bank.lastPreparation.reused===1,'retry result reusable');check(live.size===0,'reuse no Workers');
   db.close();return {realWorker:true,cancelRetry:true,settingChange:true,staleReplyIgnored:true,previousBank:true,legacyCacheSeparated:true,provenance:record.integration,frames:record.frames,peak:record.peak,cacheReuse:true};
  }finally{bank.dispose();globalThis.Worker=Native}
 });assert.equal(result.realWorker,true);console.log(JSON.stringify(result));
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
