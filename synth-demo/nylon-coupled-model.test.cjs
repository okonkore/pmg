'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const model=vm.runInNewContext(['nylon-model.js','nylon-coupled-model.js'].map(name=>fs.readFileSync(path.join(__dirname,name),'utf8')).join('\n')+';NylonCoupledModel');
function energy(...arrays){let sum=0;for(const array of arrays)for(const value of array)sum+=value*value;return sum}
const sr=new Float64Array([.3,-.6,.1]),si=new Float64Array([.2,.8,.7]),sw=new Float64Array([1/Math.sqrt(3),1/Math.sqrt(3),1/Math.sqrt(3)]);
const br=new Float64Array([.4,.6]),bi=new Float64Array([-.2,.1]),bw=new Float64Array([.6,.8]);
const original=[sr,si,br,bi].map(array=>Array.from(array)),before=energy(sr,si,br,bi),angle=.37;
model.exchange(sr,si,sw,br,bi,bw,-2*Math.sin(angle/2)**2,Math.sin(angle));
assert(Math.abs(energy(sr,si,br,bi)-before)<1e-12,'Bridge exchange must conserve modal energy');
model.exchange(sr,si,sw,br,bi,bw,-2*Math.sin(angle/2)**2,-Math.sin(angle));
[sr,si,br,bi].forEach((array,i)=>array.forEach((value,k)=>assert(Math.abs(value-original[i][k])<1e-12,'Exchange must be reversible')));
const emptyString=new Float64Array([0]),emptyImag=new Float64Array([0]),excitedBody=new Float64Array([1]);
model.exchange(emptyString,emptyImag,new Float64Array([1]),excitedBody,new Float64Array([0]),new Float64Array([1]),-2*Math.sin(.1/2)**2,Math.sin(.1));
assert(Math.abs(emptyString[0])>.09,'Body vibration must feed back into the string');
let nearRatio,farRatio;
for(const [rate,midi,body] of [[44100,55,1],[48000,40,.48],[48000,55,.48],[48000,64,.48]]){
 const on={},off={};const samples=model.render(rate,midi,{body,coupling:1},on);
 model.render(rate,midi,{body,coupling:0},off);
 assert(on.maxEnergy<=on.initialEnergy*(1+1e-10),'No energy may be created');
 assert(on.finalEnergy<on.initialEnergy,'Free vibration must decay');
 assert(on.maxBodyEnergy>0,'String must excite the body');assert.equal(off.maxBodyEnergy,0,'Decoupled body must stay at rest');
 let previous=on.initialEnergy;
 for(const snapshot of on.snapshots){assert(snapshot.total<=previous+1e-10,'Total energy must never grow');previous=snapshot.total}
 assert(samples.every(Number.isFinite));assert(samples[samples.length-1]===0);
 const ratio=on.snapshots[6].string/off.snapshots[6].string;
 if(rate===48000&&midi===55)nearRatio=ratio;
 if(rate===48000&&midi===64)farRatio=ratio;
 console.log(`${rate} Hz / MIDI ${midi} / body ${body}: passive; energy transferred to body`);
}
assert(nearRatio<.8,'Near-resonance string decay must respond to body loading');
assert(nearRatio<farRatio-.1,'Body loading must depend on frequency');
console.log('Energy conservation, reciprocal coupling and frequency-dependent decay: OK');
