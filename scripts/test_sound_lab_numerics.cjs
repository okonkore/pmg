const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true}));try{
 const page=await browser.newPage();await page.goto(process.argv[2]||'http://127.0.0.1:8775/synth-demo/sound-lab/');
 console.log(await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m)},same=(a,b)=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const Native=Worker;let live=0,max=0;window.Worker=class extends Native{constructor(...a){super(...a);live++;max=Math.max(max,live);this.live=true}terminate(){if(this.live){live--;this.live=false}super.terminate()}};
  const {createLabComparison}=await import('/synth-demo/sound-lab/runtime/lab-comparison.js');
  const {FinitePluckEngine}=await import('/synth-demo/sound-lab/runtime/finite-pluck.js');
  const {PhysicalGuitarEngine}=await import('/synth-demo/instruments/physical-guitar/engine.js');
  const {GuitarCoefficients}=await import('/synth-demo/instruments/configured-guitar/coefficient-engine.js');
  const settings=await (await fetch('/synth-demo/instruments/configured-guitar/default-settings.json')).json();
  const body=await (await fetch('/synth-demo/instruments/configured-guitar/body-library-256.json')).json(),kernel=await (await fetch('/synth-demo/instruments/physical-guitar/kernel.wasm')).arrayBuffer();
  const builder=await GuitarCoefficients.create(body),manager=createLabComparison(),request={settings,note:{midi:40,stringNumber:6},seconds:.05,release:{seconds:.000513,shape:'cosine'}},progress=[];
  const pair=await manager.prepare(request,{onProgress:p=>progress.push(p.fraction)});
  check(max===1&&live===0,'One worker at a time and cleanup');check(progress.every((v,i)=>!i||v>=progress[i-1]),'Monotone pair progress');
  const a=pair.a.notes[0],b=pair.b.notes[0],{instantaneousComparison,...plan}=a.integration;
  check(instantaneousComparison===true&&JSON.stringify(plan)===JSON.stringify(b.integration),'Identical integration schedule');
  const model=builder.build(settings,40,{sampleRate:48000,stringNumber:6}),instant=await FinitePluckEngine.create(model,kernel,48000,a.integration),finite=await FinitePluckEngine.create(model,kernel,48000,b.integration);
  check(instant.forceAt(0)===0&&finite.forceAt(0)===model.physics.forceN,'Only B retains force during release');
  // Independent free-engine schedule: block1 to ceil(release*rate), then transfer the complete state to block2.
  const fine=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block:1}),block=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block:2}),cut=Math.ceil(request.release.seconds*48000),reference=new Float32Array(a.frames);
  fine.render(reference.subarray(0,cut));block.z.data.set(fine.z.data);block.age=fine.age;block.render(reference.subarray(cut));
  const published=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block:4,sparseTolerance:.03,linearAfter:12});
  check(same(published.render(new Float32Array(pair.current.notes[0].frames)),pair.current.notes[0].pcm),'Current A equals production Float32 PCM before PCM24');
  check(same(reference,a.pcm),'Matched instantaneous agrees bit-for-bit with independently scheduled free engine');
  check(same(instant.render(new Float32Array(a.frames)),a.pcm),'Matched C direct parity');check(!same(a.pcm,b.pcm),'Release actually changes waveform');
  const controller=new AbortController();try{await manager.prepare({...request,seconds:.051},{signal:controller.signal,onProgress:p=>{if(p.part==='B')controller.abort()}});throw Error('Expected abort')}catch(e){check(e.name==='AbortError','B abort')}
  check(manager.active===pair&&!manager.preparing&&live===0,'B abort retains complete prior pair');
  try{await manager.prepare({...request,seconds:.052},{onProgress:p=>{if(p.part==='B')throw Error('B callback failure')}});throw Error('Expected error')}catch(e){check(e.message==='B callback failure','B failure')}
  check(manager.active===pair&&live===0,'B error retains prior pair');
  const high=await manager.prepare({...request,note:{midi:64,stringNumber:1},release:{seconds:.002,shape:'cosine'}});
  check(high.a.notes[0].integration.postRelease==='fine'&&high.b.notes[0].integration.postRelease==='fine','Long release uses fine fallback');
  const highModel=builder.build(settings,64,{sampleRate:48000,stringNumber:1}),freeHigh=await PhysicalGuitarEngine.create(highModel.binary,kernel,48000,{block:1});
  check(same(freeHigh.render(new Float32Array(high.a.notes[0].frames)),high.a.notes[0].pcm),'Long-release matched A equals independent fine free engine');
  manager.dispose();check(live===0,'Dispose');return 'PASS: actual sequential Workers, matched integration, independent free-engine PCM reference, force distinction, monotone progress, B cancel/failure atomicity.';
 }));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
