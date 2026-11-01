const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const {settings,GuitarCoefficients,PhysicalGuitarEngine,base,root}=await require('./configured_guitar_loader.cjs')();
const c=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm')),engine=await GuitarCoefficients.create(JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),fs.readFileSync(path.join(base,'coefficients.wasm')));
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),src=fs.readFileSync(path.join(base,'render-note.js'),'utf8').replace("'../physical-guitar/engine.js'",JSON.stringify(data(fs.readFileSync(path.join(root,'physical-guitar/engine.js'))))),{renderNote}=await import(data(src));
const out=[];
for(const [length,midi,stringNumber,rate,thin] of [[300,40,6,44100],[100,64,1,48000],[60,59,2,44100],[60,83,1,48000],[55,55,3,44100],[1000,40,6,44100],[2000,83,1,48000],[10,83,1,48000,true]]){
 const config={...c,scaleMm:length};if(thin)config.strings=c.strings.map(s=>({number:s.number,openMidi:s.openMidi,construction:'plain',diameterMm:.1,youngGPa:.1,densityKgM3:20000,lossAngle:.02}));
 const r={length,midi,stringNumber,rate,thin:!!thin},start=performance.now();
 try{const model=engine.build(config,midi,{stringNumber,sampleRate:rate});r.physics=model.physics;const result=await renderNote(model,kernel,rate);r.integration=result.integration;r.frames=result.count;let peak=0;for(const v of result.samples)peak=Math.max(peak,Math.abs(v));r.peak=peak;r.ok=true}catch(e){r.ok=false;r.error=e.message}
 r.ms=performance.now()-start;out.push(r);console.log(JSON.stringify(r));
}
assert(out.slice(0,7).every(r=>r.ok&&Number.isFinite(r.peak)&&r.peak>0&&r.peak<=2));assert.equal(out[7].ok,false);assert.match(out[7].error,/安全.*48000 Hz.*弦1.*フレット19/);console.log('PASS: seven short/long-scale full preparations and bounded guard rejection at10mm; no altered guard or output clipping.');
})().catch(e=>{console.error(e);process.exitCode=1});
