const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 const {settings:s,GuitarCoefficients,base}=await require('./configured_guitar_loader.cjs')(),config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),data=x=>'data:text/javascript;base64,'+Buffer.from(x).toString('base64');
 const oldSource=execFileSync('git',['show','428a0f4f8c40a47a8aae6c086f4e9a98ad9574a6:synth-demo/instruments/configured-guitar/settings.js'],{encoding:'utf8'}),old=await import(data(oldSource));
 for(const scaleMm of [650,500])for(let midi=21;midi<=108;midi++)assert.deepEqual(s.noteConditions({...config,scaleMm},midi),old.noteConditions({...config,scaleMm},midi),'legacy note conditions exactly unchanged');
 for(const scaleMm of [Number.MIN_VALUE,.001,10,53.7,100.123456789,499.999999,750.1,1000,2000,Number.MAX_VALUE])assert.equal(s.validateSettings({...config,scaleMm}).scaleMm,scaleMm);
 for(const scaleMm of [0,-1,NaN,Infinity,-Infinity])assert.throws(()=>s.validateSettings({...config,scaleMm}),/弦長/);
 const boundaries=config.strings.map(x=>s.zeroTensionLengthMm(s.section(x),440*2**((x.openMidi-69)/12))),boundary=Math.max(...boundaries);assert.equal(boundaries.indexOf(boundary),2);
 assert.throws(()=>s.prepareSettings({...config,scaleMm:boundary*(1-1e-7)}),/3弦・MIDI 55.*張力/);assert(s.prepareSettings({...config,scaleMm:boundary*(1+1e-7)}));
 assert.throws(()=>s.prepareSettings({...config,scaleMm:Number.MIN_VALUE}),/1弦.*有限/);
 for(const scaleMm of [Number.MAX_VALUE,1e200])assert.throws(()=>s.prepareSettings({...config,scaleMm}),/有限/);
 assert.throws(()=>s.prepareSettings({...config,scaleMm:1e156}),/合計張力.*有限/);
 for(const scaleMm of [1000,2000]){const ctx=s.prepareSettings({...config,scaleMm});for(const midi of [40,64,83]){const note=ctx.conditions(midi);assert(Number.isFinite(note.tensionN)&&note.tensionN>0);}}
 const thin={...config,scaleMm:10,strings:config.strings.map(x=>({number:x.number,openMidi:x.openMidi,construction:'plain',diameterMm:.1,youngGPa:.1,densityKgM3:20000,lossAngle:.02}))};
 const small=s.noteConditions(thin,83,1),sec=small.section,w=2*Math.PI*small.hz;
 // Independent quadratic stiff-string solution for k², avoiding cancellation.
 const k2=2*sec.mu*w*w/(small.tensionN+Math.sqrt(small.tensionN**2+4*sec.ei*sec.mu*w*w)),exact=Math.PI/Math.sqrt(k2);
 assert(small.lengthM<.01);assert(Math.abs(small.lengthM/exact-1)<1e-12);assert.equal(small.pluckPositionM,small.lengthM*.9);assert(small.positionLimited);
 const lowBoundary=s.zeroTensionLengthMm(s.section(thin.strings[5]),440*2**((21-69)/12));
 assert.throws(()=>s.noteConditions({...thin,scaleMm:lowBoundary*.999},21),/6弦・MIDI 21.*張力/);
 assert.notEqual(s.signature({...config,scaleMm:300}),s.signature({...config,scaleMm:300.000001}));
 const body=JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),wasm=fs.readFileSync(path.join(base,'coefficients.wasm'));
 const previousCpp=execFileSync('git',['show','428a0f4f8c40a47a8aae6c086f4e9a98ad9574a6:synth-demo/instruments/configured-guitar/coefficient-engine.js'],{encoding:'utf8'}).replace(/'\.\/settings\.js(?:\?[^']*)?'/,JSON.stringify(data(oldSource)));
 const {GuitarCoefficients:Previous}=await import(data(previousCpp)),before=await Previous.create(body,wasm),after=await GuitarCoefficients.create(body,wasm);
 for(const [scaleMm,midi,sampleRate]of [[650,64,48000],[500,59,44100]])assert.deepEqual(new Uint8Array(after.build({...config,scaleMm},midi,{sampleRate}).binary),new Uint8Array(before.build({...config,scaleMm},midi,{sampleRate}).binary));
 console.log(JSON.stringify({passed:true,legacyConditions:176,legacyCoefficientCases:2,boundariesMm:boundaries,thin10mmFret19LengthMm:small.lengthM*1000,precision:true,cacheSeparation:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
