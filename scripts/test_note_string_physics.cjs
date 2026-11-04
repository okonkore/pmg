const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {settings,GuitarCoefficients,PhysicalGuitarEngine,base,root}=await require('./configured_guitar_loader.cjs')();
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm'));
 const coefficients=await GuitarCoefficients.create(JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),fs.readFileSync(path.join(base,'coefficients.wasm')));
 const automatic=coefficients.build(config,64),first=coefficients.build(config,64,{stringNumber:1});assert.deepEqual(new Uint8Array(automatic.binary),new Uint8Array(first.binary),'explicit open first string equals original auto coefficients');
 const signals=[],physics=[];
 for(const stringNumber of [1,2,3]){
  const model=stringNumber===1?first:coefficients.build(config,64,{stringNumber});physics.push(model.physics);
  const open=settings.noteConditions(config,config.strings[stringNumber-1].openMidi,stringNumber);assert.equal(model.physics.tensionN,open.tensionN);assert.equal(model.physics.fret,[0,5,9][stringNumber-1]);assert.equal(model.physics.hz,automatic.physics.hz);assert.equal(model.physics.totalTensionN,automatic.physics.totalTensionN);
  const engine=await PhysicalGuitarEngine.create(model.binary,kernel,48000,{block:4,sparseTolerance:.03,linearAfter:12}),out=new Float32Array(24000);engine.render(out);assert(out.every(Number.isFinite));assert(out.some(x=>Math.abs(x)>1e-4));signals.push(out);
 }
 assert(physics[0].lengthM>physics[1].lengthM&&physics[1].lengthM>physics[2].lengthM);assert.notDeepEqual(signals[0],signals[1]);assert.notDeepEqual(signals[1],signals[2]);
 for(const [midi,stringNumber] of [[58,2],[85,1],[64,0],[64,7],[64,2.5]])assert.throws(()=>coefficients.build(config,midi,{stringNumber}));
 assert.equal(settings.noteConditions(config,84,1).fret,20);assert.equal(settings.noteConditions(config,21).string,6,'legacy virtual bass Auto remains supported');
 console.log(JSON.stringify({passed:true,autoFirstBitExact:true,physics:physics.map(x=>({midi:x.midi,string:x.string,fret:x.fret,lengthM:x.lengthM,tensionN:x.tensionN})),finiteHalfSecond:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
