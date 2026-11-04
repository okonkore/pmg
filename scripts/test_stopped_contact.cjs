const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {settings,buildModel,GuitarCoefficients,PhysicalGuitarEngine,base,root}=await require('./configured_guitar_loader.cjs')();
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),body=JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm'));
 const coefficients=await GuitarCoefficients.create(body,fs.readFileSync(path.join(base,'coefficients.wasm')));
 assert.equal(coefficients.wasm.prepare_coefficients(0,13),0,'stale ABI must fail before reading params');assert.match(coefficients.error(),/ABI mismatch/);
 assert.throws(()=>new GuitarCoefficients(body,{}),/版が一致/);
 const render=async (model,block)=>{const e=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block,sparseTolerance:.03,linearAfter:12}),x=new Float32Array(96000);e.render(x);assert(x.every(Number.isFinite));assert(Math.max(...x.map(Math.abs))<1);return x;};
 const error=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)/b.reduce((sum,v)=>sum+v*v,0));
 for(let sn=1;sn<=6;sn++){
  const open=config.strings[sn-1].openMidi;
  assert.equal(settings.noteConditions(config,open,sn).contactDampingNms,0);
  assert.equal(settings.noteConditions(config,open+20,sn).contactDampingNms,8e-7);
  assert.equal(settings.noteConditions(config,open+20).contactDampingNms,0);
  assert.equal(settings.noteConditions(config,open+20).contactAssignment,'unspecified');
  assert.throws(()=>settings.noteConditions(config,open+21,sn));
  assert.deepEqual(new Uint8Array(coefficients.build(config,open,{stringNumber:sn}).binary),new Uint8Array(coefficients.build(config,open).binary));
 }
 const reports=[];
 for(const [sn,fret] of [[1,20],[2,20],[3,20],[4,20],[5,20],[6,20],[6,5],[6,12]])for(const loss of [.02,.14]){
  const c=structuredClone(config);c.strings[sn-1].lossAngle=loss;const midi=c.strings[sn-1].openMidi+fret;
  const actual=coefficients.build(c,midi,{stringNumber:sn}),reference=buildModel(c,midi,body,{stringNumber:sn});
  assert.equal(actual.physics.contactDampingNms,8e-7);assert.equal(actual.physics.forceLimited,false);
  const poles=new Float64Array(actual.binary,8,2*new DataView(actual.binary).getInt32(0,true));let maxPole=-Infinity;for(let j=0;j<poles.length;j+=2)maxPole=Math.max(maxPole,poles[j]);assert(maxPole<0);
  const a=await render(actual,2),b=await render(reference,2),fine=await render(actual,1),backendError=error(a,b),stepError=error(a,fine);
  assert(backendError<.003,'JS/WASM mismatch '+backendError);assert(stepError<.005,'step error '+stepError);
  const row={sn,fret,loss,backendError,stepError,maxPole,peak:Math.max(...a.map(Math.abs))};reports.push(row);console.log(JSON.stringify(row));
 }
 console.log('PASS: explicit stopped-only application, 0/20/21F boundaries, legacy pitch-only, bit-exact open/auto, 8 notes x 2 losses JS/WASM and step convergence; stable finite unclipped.');
})().catch(e=>{console.error(e);process.exitCode=1});
