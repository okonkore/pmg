const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {settings,GuitarCoefficients,PhysicalGuitarEngine,base,root}=await require('./configured_guitar_loader.cjs')();
 const source=fs.readFileSync(path.join(base,'string-preset-catalog.js'),'utf8');
 const {createStringPresetCatalog}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json'))),catalog=createStringPresetCatalog(config);
 const contexts=catalog.map(p=>settings.prepareSettings({...config,strings:p.strings}));
 assert.deepEqual(settings.validateSettings(config).strings,catalog[0].strings);
 for(const [i,preset] of catalog.entries()){
  assert.equal(preset.strings.length,6);assert.equal(new Set(preset.strings.map(s=>s.number)).size,6);
  for(let n=21;n<=108;n++){const c=contexts[i].conditions(n);assert(c.tensionN>0&&Number.isFinite(c.tensionN));assert(c.lengthM>0&&c.lengthM<=.65*1.01);}
  for(let j=0;j<6;j++){const c=contexts[i].conditions(preset.strings[j].openMidi,j+1),sec=c.section,k=Math.PI/c.lengthM;assert(Math.abs(Math.sqrt((c.tensionN*k*k+sec.ei*k**4)/sec.mu)/(2*Math.PI)-c.hz)<1e-8);}
 }
 for(let j=0;j<6;j++){
  assert(Math.abs(contexts[2].sections[j].mu/contexts[1].sections[j].mu-.25)<1e-12);
  assert(Math.abs(contexts[4].sections[j].mu/contexts[1].sections[j].mu-7850/1140)<1e-12);
  const a=contexts[1].conditions(config.strings[j].openMidi,j+1),b=contexts[2].conditions(config.strings[j].openMidi,j+1);assert(b.tensionN<a.tensionN);
 }
 assert(contexts[4].totalTensionN>contexts[3].totalTensionN*3);
 const invalid=structuredClone(config);invalid.strings[0].densityKgM3=Infinity;assert.throws(()=>settings.prepareSettings(invalid));
 const stiff={...config,strings:catalog[4].strings.map(s=>({...s,diameterMm:2,densityKgM3:500,youngGPa:250})),scaleMm:500};assert.throws(()=>settings.prepareSettings(stiff).conditions(21),/張力/);
 const body=JSON.parse(fs.readFileSync(path.join(base,'body-library-256.json'))),coeff=await GuitarCoefficients.create(body,fs.readFileSync(path.join(base,'coefficients.wasm'))),kernel=fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm'));
 for(const preset of catalog.slice(1)){
  const input={...config,strings:preset.strings};
  const m=coeff.build(input,40),engine=await PhysicalGuitarEngine.create(m.binary,kernel,48000,{block:4,sparseTolerance:.03,linearAfter:12}),wave=new Float32Array(4800);engine.render(wave);
  assert(wave.every(Number.isFinite));assert(wave.some(x=>Math.abs(x)>1e-8));
  console.log(JSON.stringify({id:preset.id,tensionN:m.physics.totalTensionN,peak:Math.max(...wave.map(Math.abs)),forceLimited:m.physics.forceLimited}));
 }
 console.log('PASS: catalog, SI sections, all 88 conditions, fixed tuning, mass ratios, invalid regimes, C++ preparation and finite synthesis.');
})().catch(e=>{console.error(e.stack?.slice(0,1500));process.exitCode=1});
