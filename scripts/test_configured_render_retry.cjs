const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {PhysicalGuitarEngine,GuitarCoefficients,base,root}=await require('./configured_guitar_loader.cjs')();
 const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
 const source=fs.readFileSync(path.join(base,'render-note.js'),'utf8').replace("'../physical-guitar/engine.js'",JSON.stringify(data(fs.readFileSync(path.join(root,'physical-guitar/engine.js')))));
 const {renderNote,RENDER_POLICY}=await import(data(source));
 const model={binary:new ArrayBuffer(8),physics:{string:2,fret:0}},created=[];
 const fake=async(_b,_k,rate,{block})=>{const e={age:0,n:0,gain:1,out:{data:[]},z:{data:[]},render(out){out.fill(block);this.age+=out.length;if(block===4)throw Error('Physical state exceeded safe output range');}};created.push(e);return e;};
 const mock=await renderNote(model,null,100,{createEngine:fake});assert.equal(created.length,2);assert.notEqual(created[0],created[1]);assert(mock.samples.subarray(0,mock.count).every(x=>x===2));assert.equal(mock.integration.block,2);assert.equal(mock.integration.attempts.length,1);
 let calls=0;await assert.rejects(renderNote(model,null,100,{createEngine:async()=>{calls++;return {age:10,render(){throw Error('Physical state exceeded safe output range')}}}}),/100 Hz.*弦2.*フレット0.*4→2→1/);assert.equal(calls,3);
 calls=0;await assert.rejects(renderNote(model,null,100,{createEngine:async()=>{calls++;return {render(){throw Error('unrelated')}}}}),/unrelated/);assert.equal(calls,1);
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json')));config.scaleMm=500;config.pluckPositionMm=100;
 const kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm'));
 const coefficients=await GuitarCoefficients.create(JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),fs.readFileSync(path.join(base,'coefficients.wasm')));
 let m=coefficients.build(config,59,{sampleRate:44100}),start=performance.now();
 const result=await renderNote(m,kernel,44100);assert.equal(result.integration.policy,RENDER_POLICY);assert.equal(result.integration.block,2);assert.equal(result.integration.attempts[0].sample,11840);
 const render=async(rate,block,duration)=>{const engine=await PhysicalGuitarEngine.create(m.binary,kernel,rate,{block,sparseTolerance:.03,linearAfter:12}),out=new Float32Array(Math.round(rate*duration));engine.render(out);return out;};
 const block2=await render(44100,2,15),fine=await render(44100,1,15),half=await render(88200,1,15);
 assert.deepEqual(result.samples.subarray(0,result.count),block2.subarray(0,result.count));
 // flow emits pressure at the start of the sample, so even reference samples align.
 const reference=Float32Array.from(fine,(_,i)=>half[2*i]);
 const metrics=(a,b,start,end)=>{let error=0,power=0,max=0;for(let i=start;i<end;i++){const d=a[i]-b[i];error+=d*d;power+=b[i]*b[i];max=Math.max(max,Math.abs(d));}return {relativeRms:Math.sqrt(error/power),maxAbs:max};};
 const windows=[[0,1],[1,5],[5,12],[12,15]],comparison=windows.map(([a,b])=>({seconds:[a,b],block2:metrics(block2,reference,a*44100,b*44100),block1:metrics(fine,reference,a*44100,b*44100)}));
 console.log(JSON.stringify({integration:result.integration,elapsedMs:performance.now()-start,storedFrames:result.count,whole:metrics(block2,reference,0,reference.length),comparison}));
 for(const w of comparison){assert(w.block1.relativeRms<.35*w.block2.relativeRms,'step refinement must reduce waveform error');}
 // Successful default path must equal the original render loop sample-for-sample.
 m=coefficients.build(JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),64,{sampleRate:48000});
 const baseline=await render(48000,4,15),success=await renderNote(m,kernel,48000);assert.equal(success.integration.block,4);assert.deepEqual(success.samples.subarray(0,success.count),baseline.subarray(0,success.count));
 console.log('PASS: bounded fresh retries, discarded partial output, terminal context, unrelated failure, real B3, full-waveform refinement, successful block4 exactness');
})().catch(e=>{console.error(e);process.exitCode=1});
