'use strict';
// Preserve the original plain-string baseline; the approved G3 has its own page.
// Writes synthetic notes only. Recordings remain in the ignored local directory.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=path.resolve(__dirname,'../synth-demo'),out=path.resolve(__dirname,'../reference-recordings/treble-comparison-2026-10-21');
fs.mkdirSync(out,{recursive:true});const scope=vm.createContext({});
for(const name of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(src,name),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope);
for(const midi of [55,59,64,66,69]){const y=model.render(48000,midi,{bodyFit:1,referenceTone:1,attack:1,stringTexture:1,highDecay:1,thirdTone:0,dropD:false});fs.writeFileSync(path.join(out,`${midi}.f32`),Buffer.from(y.buffer));}
console.log('Rendered unchanged plain-string notes into local reference directory.');
