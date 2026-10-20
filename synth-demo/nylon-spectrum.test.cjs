'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const scope=vm.createContext({});
scope.importScripts=(...files)=>{for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope)};
let reply;scope.self={postMessage:value=>reply=value};
vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const {plain,coupled}=vm.runInContext('({plain:NylonModel,coupled:NylonCoupledModel})',scope);
assert.equal(plain.stringFor(38,{dropD:true}).number,6);
assert.equal(plain.stringFor(38,{dropD:true}).fret,0);
assert.equal(plain.stringFor(50,{dropD:true}).number,4);
assert.equal(plain.stringFor(50,{dropD:true}).fret,0);
assert.equal(plain.stringFor(37,{dropD:true}).number,7);
assert.equal(plain.stringFor(45,{dropD:true}).number,5);
assert.equal(plain.stringFor(38).number,7);
function partials(y,rate,midi){
 const fundamental=440*2**((midi-69)/12),levels=[];
 for(let n=1;n<=8;n++){
  let peak=0;
  for(let delta=-4;delta<=4;delta+=.5){
   const frequency=fundamental*n+delta;let re=0,im=0;
   const first=Math.floor(.05*rate),length=Math.floor(.14*rate);
   for(let i=0;i<length;i++){
    const t=(first+i)/rate,w=.5-.5*Math.cos(2*Math.PI*i/(length-1)),v=y[first+i]*w;
    re+=v*Math.cos(2*Math.PI*frequency*t);im+=v*Math.sin(2*Math.PI*frequency*t);
   }
   peak=Math.max(peak,Math.hypot(re,im));
  }
  levels.push(peak);
 }
 return levels.map(v=>20*Math.log10(v/levels[0]));
}
// Reference attack windows, not a universal target for every instrument/note.
const targets={50:[0,9.2,1.81,1.17,-2.71,-13.12,-2.76,-7.05],66:[0,.2,-16.81,-22.39,-22.9,-24.7,-8.87,-17.44]};
for(const rate of [44100,48000]){
 for(const midi of [50,66]){
  const errors=[];
  for(const harmonics of [0,1]){
   const data=plain.render(rate,midi,{harmonics,dropD:true});
   const values=partials(data,rate,midi);
   errors.push(values.slice(1).reduce((sum,v,i)=>sum+Math.abs(v-targets[midi][i+1]),0)/7);
  }
  assert(errors[1]<errors[0],`Reference partial error must decrease: ${midi}/${rate}/${errors}`);
  console.log(`${rate} Hz / MIDI ${midi}: partial error ${errors[0].toFixed(1)} -> ${errors[1].toFixed(1)} dB`);
 }
}
for(const midi of [21,38,50,55,66,84,108])for(const coupling of [0,1]){
 scope.self.onmessage({data:{id:1,rate:44100,midi,settings:{harmonics:1,dropD:true,coupling,contact:1}}});
 assert(!reply.error,reply.error);const values=reply.values;
 assert(values.every(Number.isFinite));assert(values[values.length-1]===0);
 let peak=0;for(const v of values)peak=Math.max(peak,Math.abs(v));assert(peak<=.80001);
}
const previous=fs.readFileSync(path.join(__dirname,'../analysis-1007/baseline-50.f32'));
assert(previous.equals(Buffer.from(plain.render(12000,50,{harmonics:0,dropD:false}).buffer)),'OFF must preserve the previous baseline exactly');
console.log('Drop-D assignment, worker options, full-range bounds and previous baseline verified');
