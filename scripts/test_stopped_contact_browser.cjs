const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));try{if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.wasm')?'application/wasm':name.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.app-ready');
  await page.evaluate(()=>scoreEditor.importDocument({title:'20F contact',bpm:120,meter:[4,4],notes:[{id:'c6',pitch:84,beat:0,duration:1,velocity:1,stringNumber:1}]}));
  await page.click('#nav-piano-roll');await page.locator('.seq-note').first().click();await page.evaluate(()=>AppShell.openPanel('note-dialog'));assert.equal(await page.locator('#seq-string').inputValue(),'1');assert.match(await page.locator('#seq-string option:checked').textContent(),/20/);
  const result=await page.evaluate(async()=>{
   const {createPreparedGuitar}=await import('/instruments/configured-guitar/bank.js'),{signature}=await import('/instruments/configured-guitar/settings.js');
   const config=await(await fetch('/instruments/configured-guitar/default-settings.json')).json(),context={sampleRate:48000,destination:null,createBuffer(_n,n,rate){const data=new Float32Array(n);return {length:n,sampleRate:rate,getChannelData:()=>data}}};
   const bank=await createPreparedGuitar(context),db=await new Promise(r=>{const q=indexedDB.open('pmg-physical-guitar-prepared-v1');q.onsuccess=()=>r(q.result)}),oldKey='full-pressure-m256-refinement-retry-4-2-1-v1:'+signature(config)+':48000:79@2';
   const get=k=>new Promise(r=>{const q=db.transaction('notes').objectStore('notes').get(k);q.onsuccess=()=>r(q.result)});
   await new Promise(r=>{const tx=db.transaction('notes','readwrite');tx.objectStore('notes').put({sentinel:'legacy-kept'},oldKey);tx.oncomplete=r});
   try{
    await bank.prepare(config,{midis:['79@2']});const generated=bank.lastPreparation.generated,key=bank.active.configKey+':48000:79@2',record=await get(key),old=await get(oldKey);await bank.prepare(config,{midis:['79@2']});
    return {generated,reused:bank.lastPreparation.reused,old,physics:record.physics,integration:record.integration,peak:record.peak,key};
   }finally{bank.dispose();db.close()}
  });
  assert.equal(result.generated,1);assert.equal(result.reused,1);assert.equal(result.old.sentinel,'legacy-kept');assert.equal(result.physics.contactDampingNms,8e-7);assert.equal(result.physics.fret,20);assert.equal(result.physics.contactAssignment,'stopped');assert([1,2].includes(result.integration.block));assert(result.peak<1);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ui20F:true,cacheMigrationPreservesOld:true,...result}));
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
