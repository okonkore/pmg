const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8775/synth-demo/sound-lab/');
  await page.evaluate(async()=>{
   const Native=Worker;window.workerTrace={started:0,terminated:0,live:new Set()};window.Worker=class extends Native{constructor(...a){super(...a);workerTrace.started++;workerTrace.live.add(this)}terminate(){if(workerTrace.live.delete(this))workerTrace.terminated++;return super.terminate()}};
   window.check=(x,m)=>{if(!x)throw Error(m)};window.same=(a,b)=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
   window.api=await import('/synth-demo/sound-lab/runtime/experimental-pluck.js');
   window.contract=await import('/synth-demo/sound-lab/runtime/experimental-pluck-contract.js');
   window.config=await (await fetch('/synth-demo/instruments/configured-guitar/default-settings.json')).json();
   window.request={settings:config,notes:[{midi:40},{midi:64}],seconds:.05,release:{seconds:.000513,shape:'cosine'}};
   window.manager=api.createExperimentalPluckPreparation();window.progress=[];
   // Seed and prepare the REAL default bank through its existing cache path.
   const {signature}=await import('/synth-demo/instruments/configured-guitar/settings.js');
   window.audioContext=new AudioContext({sampleRate:48000});const {createPreparedGuitar}=await import('/synth-demo/instruments/configured-guitar/bank.js');
   window.defaultBank=await createPreparedGuitar(audioContext);
   window.defaultKey='full-pressure-m256-r1:'+signature(config)+':48000:40';
   window.defaultSentinel={pcm:new Uint8Array([1,2,3,4,5,6]),pcmScale:1,rate:48000,frames:2,physics:{sentinel:true},peak:.03};
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pmg-physical-guitar-prepared-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('notes','readwrite');tx.objectStore('notes').put(defaultSentinel,defaultKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
   await defaultBank.prepare(config,{midis:[40]});window.defaultActive=defaultBank.active;window.defaultDecoded=await defaultBank.ensure(40);
   window.verifyDefault=async()=>{
    check(defaultBank.active===defaultActive,'Default active bank changed');check(await defaultBank.ensure(40)===defaultDecoded,'Default decoded buffer changed');
    const db=await new Promise(resolve=>{const r=indexedDB.open('pmg-physical-guitar-prepared-v1',1);r.onsuccess=()=>resolve(r.result)});
    const value=await new Promise(resolve=>{const r=db.transaction('notes').objectStore('notes').get(defaultKey);r.onsuccess=()=>resolve(r.result)});db.close();check(same(value.pcm,defaultSentinel.pcm)&&value.physics.sentinel,'Default persistent cache changed');
   };
  });
  const first=await page.evaluate(async()=>{
   window.bank=await manager.prepare(request,{onProgress:p=>{progress.push(p.fraction);if(p.note){p.note.midi=108;p.note.stringNumber=2;p.note.id='corrupted'}}});
   check(bank.notes[0].midi===40&&bank.notes[0].id==='6:40'&&bank.request.notes[0].midi===40,'Progress callback mutated canonical identity');
   check(bank.notes.every(n=>n.integration.postRelease==='block'&&n.integration.block===2),'Validated auto gate');
   check(progress.every((n,i)=>i===0||n>=progress[i-1]),'Monotone progress');
   check(workerTrace.live.size===0&&!manager.preparing,'Successful worker leaked');await verifyDefault();
   return bank.stats;
  });
  assert.equal(first.generated,2);
  await page.evaluate(async()=>{
   const {GuitarCoefficients}=await import('/synth-demo/instruments/configured-guitar/coefficient-engine.js?v=coeff-cpp-1');
   const {FinitePluckEngine}=await import('/synth-demo/sound-lab/runtime/finite-pluck.js');
   const {PhysicalGuitarEngine}=await import('/synth-demo/instruments/physical-guitar/engine.js');
   const body=await (await fetch('/synth-demo/instruments/configured-guitar/body-library-256.json')).json();window.kernel=await (await fetch('/synth-demo/instruments/physical-guitar/kernel.wasm')).arrayBuffer();window.coefficients=await GuitarCoefficients.create(body);
   for(const note of bank.notes){const model=coefficients.build(config,note.midi,{sampleRate:48000,stringNumber:note.stringNumber}),engine=await FinitePluckEngine.create(model,kernel,48000,note.integration);check(same(engine.render(new Float32Array(note.frames)),note.pcm),'Actual Worker/direct finite-engine PCM mismatch');}
   const saved=bank.notes[0].pcm.slice();bank.notes[0].pcm.fill(123);bank.notes[0].physics.forceN=999;
   const cached=await manager.prepare(request);check(cached.stats.reused===2&&cached.stats.generated===0,'Cache reuse');check(same(saved,cached.notes[0].pcm)&&cached.notes[0].physics.forceN!==999,'Caller poisoned cache');
   const audio=cached.toAudioBuffer(audioContext,'6:40');check(audio.length===2400&&audio.sampleRate===48000&&same(audio.getChannelData(0),saved),'AudioBuffer transfer');
   window.stable=manager.active;
   const instant=await manager.prepare({...request,notes:[{midi:40}],release:{seconds:0,shape:'cosine'}});const model=coefficients.build(config,40,{sampleRate:48000,stringNumber:6});
   const defaultEngine=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block:4,sparseTolerance:.03,linearAfter:12});check(same(defaultEngine.render(new Float32Array(2400)),instant.notes[0].pcm),'Published default synthesis instantaneous parity');
   window.stable=manager.active;await verifyDefault();
  });
  await page.evaluate(async()=>{
   const {normalizeExperiment,integrationFor,experimentKey,VALIDATED_ASSETS}=contract;
   const r=normalizeExperiment(request),note=r.notes[0],i=integrationFor(r,note,config,VALIDATED_ASSETS),key=experimentKey(r,note,i,VALIDATED_ASSETS);
   check(i.block===2,'Pinned model optimized');
   for(const changed of [{...VALIDATED_ASSETS,body:'changed'},{...VALIDATED_ASSETS,kernel:'changed'},{...VALIDATED_ASSETS,coefficients:'changed'},{...VALIDATED_ASSETS,defaults:'changed'}]){const fallback=integrationFor(r,note,config,changed);check(fallback.postRelease==='fine','Unvalidated assets optimized');check(experimentKey(r,note,fallback,changed)!==key,'Asset identity collision')}
   const variants=[{...request,seconds:.06},{...request,mode:'fine'},{...request,release:{seconds:.002,shape:'cosine'}},{...request,release:{seconds:.000513,shape:'linear'}},{...request,settings:{...config,scaleMm:700}},{...request,notes:[{midi:40,stringNumber:5}]}];
   for(const v of variants){const q=normalizeExperiment(v),n=q.notes[0];check(experimentKey(q,n,integrationFor(q,n,config,VALIDATED_ASSETS),VALIDATED_ASSETS)!==key,'Option identity collision')}
   check(integrationFor(normalizeExperiment({...request,settings:{...config,forceN:.5}}),note,config,VALIDATED_ASSETS).postRelease==='fine','Unvalidated force optimized');
   check(integrationFor(normalizeExperiment({...request,seconds:.6}),note,config,VALIDATED_ASSETS).postRelease==='fine','Unvalidated duration optimized');
   for(const v of [{...request,notes:[]},{...request,notes:Array(7).fill({midi:40})},{...request,seconds:2},{...request,rate:44100}]){let failed=false;try{await manager.prepare(v)}catch{failed=true}check(failed,'Bounds not enforced');check(manager.active===stable,'Validation error replaced active')}
   const pre=new AbortController();pre.abort();try{await manager.prepare(request,{signal:pre.signal});throw Error('Expected abort')}catch(e){check(e.name==='AbortError','Preabort rejection')}
   check(manager.active===stable&&workerTrace.live.size===0,'Preabort touched active');
   const ctrl=new AbortController(),cacheBefore=manager.cacheSize;
   try{await manager.prepare({...request,notes:[{midi:50}]},{signal:ctrl.signal,onProgress:p=>{if(p.stage==='render'&&p.fraction>0)ctrl.abort()}});throw Error('Expected abort')}catch(e){check(e.name==='AbortError','Render cancellation')}
   check(manager.active===stable&&manager.cacheSize===cacheBefore&&workerTrace.live.size===0,'Abort committed/leaked');
   try{await manager.prepare({...request,seconds:.051,notes:[{midi:40}]},{onProgress:p=>{if(p.stage==='note')manager.cancel()}});throw Error('Expected final abort')}catch(e){check(e.name==='AbortError','Final-note cancel')}
   check(manager.active===stable&&manager.cacheSize===cacheBefore,'Final callback committed partial cache');
   try{await manager.prepare(request,{onProgress:p=>{if(p.stage==='cached')throw Error('callback failure')}});throw Error('Expected callback error')}catch(e){check(e.message==='callback failure','Callback error propagation')}
   check(manager.active===stable&&workerTrace.live.size===0,'Callback exception replaced bank/leaked');
   let next;
   try{await manager.prepare({...request,notes:[{midi:50}]},{onProgress:p=>{if(p.stage==='render'&&!next)next=manager.prepare(request)}});throw Error('Expected superseded abort')}catch(e){check(e.name==='AbortError','Supersede rejects old promise')}
   const newest=await next;check(manager.active===newest&&newest.stats.reused===2&&workerTrace.live.size===0,'Stale job published or killed replacement');window.stable=newest;
   for(let k=0;k<4;k++){const promise=manager.prepare(request);manager.cancel();try{await promise}catch(e){check(e.name==='AbortError','Repeated cancel')}check(workerTrace.live.size===0,'Repeated worker leak')}
   await verifyDefault();
  });
  await page.evaluate(async()=>{
   const {FinitePluckEngine}=await import('/synth-demo/sound-lab/runtime/finite-pluck.js');
   const a=api.createExperimentalPluckPreparation(),b=api.createExperimentalPluckPreparation();
   const [left,right]=await Promise.all([a.prepare({...request,notes:[{midi:40}]}),b.prepare({...request,settings:{...config,scaleMm:700},notes:[{midi:40}]})]);
   check(left.notes[0].physics.lengthM!==right.notes[0].physics.lengthM,'Separate settings collapsed');
   for(const bank of [left,right]){const note=bank.notes[0],model=coefficients.build(bank.request.settings,40,{sampleRate:48000,stringNumber:6}),e=await FinitePluckEngine.create(model,kernel,48000,note.integration);check(same(note.pcm,e.render(new Float32Array(note.frames))),'Concurrent manager native-state contamination')}
   a.dispose();b.dispose();check(workerTrace.live.size===0,'Concurrent worker leak');await verifyDefault();
  });
  // Real Worker, injected coefficient failure AFTER first new note has completed.
  const coefficientPath=path.join(process.cwd(),'synth-demo/instruments/configured-guitar/coefficient-engine.js');
  const source=fs.readFileSync(coefficientPath,'utf8').replace("build(input,midi,{sampleRate=48000,stringNumber}={}){","build(input,midi,{sampleRate=48000,stringNumber}={}){if(midi===50)throw Error('injected coefficient failure');");
  await context.route('**/coefficient-engine.js*',route=>route.fulfill({contentType:'text/javascript',headers:{'Cache-Control':'no-store'},body:source}));
  await page.evaluate(async()=>{const size=manager.cacheSize;let completed=0;try{await manager.prepare({...request,seconds:.052,notes:[{midi:40},{midi:50}]},{onProgress:p=>{if(p.stage==='note')completed++}});throw Error('Expected failure')}catch(e){check(e.message==='injected coefficient failure','Worker error propagation')}check(completed===1&&manager.cacheSize===size&&manager.active===stable&&workerTrace.live.size===0,'Partial result committed or failed worker leaked');await verifyDefault()});
  await context.unroute('**/coefficient-engine.js*');
  await context.route('**/experimental-pluck-worker.js*',route=>route.fulfill({contentType:'text/javascript',body:'self.onmessage=()=>{}'}));
  await page.evaluate(async()=>{const timeout=api.createExperimentalPluckPreparation({timeoutMs:100});try{await timeout.prepare(request);throw Error('Expected timeout')}catch(e){check(e.message==='Experimental worker timed out','Worker timeout')}check(workerTrace.live.size===0,'Timed-out worker leaked');timeout.dispose();await verifyDefault()});
  await context.unroute('**/experimental-pluck-worker.js*');
  const result=await page.evaluate(async()=>{const p=manager.prepare(request);manager.dispose();try{await p}catch(e){check(e.name==='AbortError','Dispose abort')}check(workerTrace.live.size===0&&!manager.preparing&&manager.active===null,'Dispose cleanup');await verifyDefault();defaultBank.dispose();await audioContext.close();return {started:workerTrace.started,terminated:workerTrace.terminated,defaultPreserved:true}});
  assert.equal(result.started,result.terminated);assert.deepEqual(errors,[]);
  console.log('PASS actual module Workers: finite/default parity, optimized gating, bounded inputs, cache isolation, AudioBuffer, cancellation at render/commit, callback mutation/error, supersession, partial failure, timeout, dispose and default bank preservation',result);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
