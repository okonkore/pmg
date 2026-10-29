const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {buildModel,PhysicalGuitarEngine,root,base}=await require('./configured_guitar_loader.cjs')();
 const size=Number(process.argv[2]||256),key=process.argv[3]||'e2',midi=key==='e2'?40:50;
 const body=JSON.parse(fs.readFileSync(path.join(base,process.argv[4]||`body-library-${size}.json`)));
 const config=JSON.parse(fs.readFileSync(path.join(base,'default-settings.json')));
 const out=path.join(process.cwd(),'experiments/string-v2/results/configured-body');let start=performance.now();
 const result=buildModel(config,midi,body,{debug:true,stringNumber:key==='sixth-fret10'?6:undefined});
 console.log('PREPARED',size,key,performance.now()-start,result.physics);
 fs.writeFileSync(`${out}/${size}-${key}.bin`,Buffer.from(result.binary));
 fs.writeFileSync(`${out}/${size}-${key}.json`,JSON.stringify({physics:result.physics,debug:result.debug}));
 const engine=await PhysicalGuitarEngine.create(result.binary,fs.readFileSync(path.join(root,'physical-guitar/kernel.wasm')),48000,{block:4,sparseTolerance:.03,linearAfter:12});
 const samples=new Float32Array(3*48000),states=[];states.push(...engine.z.data);
 for(let i=0;i<6;i++){engine.render(samples.subarray(i*24000,(i+1)*24000));states.push(...engine.z.data);}
 fs.writeFileSync(`${out}/${size}-${key}.f32`,Buffer.from(samples.buffer));
 fs.writeFileSync(`${out}/${size}-${key}-states.f64`,Buffer.from(new Float64Array(states).buffer));
 console.log('DONE',performance.now()-start);
})().catch(e=>{console.error(String(e));process.exitCode=1;});
