const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 const {settings,buildModel,GuitarCoefficients,PhysicalGuitarEngine,base,root}=await require('./configured_guitar_loader.cjs')();
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),body=JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),wasm=fs.readFileSync(path.join(base,'coefficients.wasm')),kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm'));
 const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
 const baseline='ffa847989198917828302974b3df6c74c4b62a3f';
 const oldSettings=data(execFileSync('git',['show',baseline+':synth-demo/instruments/configured-guitar/settings.js']));
 const oldSource=fs.readFileSync(path.join(base,'coefficient-engine.js'),'utf8').replace(/'\.\/settings\.js(?:\?[^']*)?'/,JSON.stringify(oldSettings));
 const Old=(await import(data(oldSource))).GuitarCoefficients;
 const oldBuild=(await require('./configured_guitar_loader.cjs')({settingsSource:execFileSync('git',['show',baseline+':synth-demo/instruments/configured-guitar/settings.js'])})).buildModel;
 const current=await GuitarCoefficients.create(body,wasm),old=await Old.create(body,wasm);
 const render=async(m,block,rate=48000)=>{const e=await PhysicalGuitarEngine.create(m.binary,kernel,rate,{block,sparseTolerance:.03,linearAfter:12}),x=new Float32Array(rate*2);e.render(x);assert(x.every(Number.isFinite));assert(x.every(v=>Math.abs(v)<1));return x};
 const error=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/b.reduce((s,v)=>s+v*v,0));
 for(let sn=1;sn<=6;sn++){
  const midi=config.strings[sn-1].openMidi;
  assert.equal(settings.noteConditions(config,midi).contactDampingNms,2e-7);
  for(const [pitch,opts] of [[midi+1,{stringNumber:sn}],[midi+20,{stringNumber:sn}],[midi+1,{}],[21,{}]]){
   assert.deepEqual(Buffer.from(current.build(config,pitch,opts).binary),Buffer.from(old.build(config,pitch,opts).binary),'unaffected note differs');
  }
 }
 for(const scaleMm of (process.env.NUT_TEST_SHORT_ONLY?[100]:[650,100]))for(let sn=1;sn<=6;sn++){
  const c={...config,scaleMm},midi=c.strings[sn-1].openMidi,m=current.build(c,midi,{stringNumber:sn}),ref=buildModel(c,midi,body,{stringNumber:sn});
  const poles=new Float64Array(m.binary,8,2*new DataView(m.binary).getInt32(0,true));let maxPole=-Infinity;for(let i=0;i<poles.length;i+=2)maxPole=Math.max(maxPole,poles[i]);assert(maxPole<0);
  const block=scaleMm<650?1:2;
  const x=await render(m,block),half=await render(m,1,block===1?96000:48000),fine=block===1?Float32Array.from(x,(_,i)=>half[2*i]):half,js=await render(ref,block),before=await render(old.build(c,midi,{stringNumber:sn}),block);
  const backendError=error(x,js),stepError=error(x,fine);console.log(JSON.stringify({scaleMm,sn,block,backendError,stepError}));if(scaleMm===650){assert(backendError<.003);assert(stepError<.005);}else{
   const oldRef=await render(oldBuild(c,midi,body,{stringNumber:sn}),block),oldHalf=await render(old.build(c,midi,{stringNumber:sn}),1,96000),oldFine=Float32Array.from(before,(_,i)=>oldHalf[2*i]);
   console.log(JSON.stringify({scaleMm,sn,baselineBackendError:error(before,oldRef),baselineStepError:error(before,oldFine),accuracyBudgetExceeded:backendError>=.003||stepError>=.005}));
  }assert(error(x,before)>1e-5);
  console.log(JSON.stringify({scaleMm,sn,maxPole,backendError,stepError,peak:x.reduce((m,v)=>Math.max(m,Math.abs(v)),0)}));
 }
 console.log('PASS assignment/baseline-binary and finite/unclipped/stable-pole checks for requested cases. 650mm enforces accuracy budgets; 100mm only reports accuracy diagnostics and is NOT an accuracy pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
