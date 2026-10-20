'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});
for(const name of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),scope);
const {contact,model}=vm.runInContext('({contact:NylonContact,model:NylonCoupledModel})',scope);
function rms(data,rate,start,end){let sum=0;for(let i=Math.floor(rate*start);i<rate*end;i++)sum+=data[i]**2;return Math.sqrt(sum/(rate*(end-start)))}
function upperBand(data,rate){let x=0,y=0,total=0,high=0;const pole=Math.exp(-2*Math.PI*1500/rate);for(let i=0;i<rate*.03;i++){const next=data[i]-x+pole*y;x=data[i];y=next;total+=data[i]**2;high+=next*next}return Math.sqrt(high/total)}
for(const rate of [44100,48000]){
 for(const nail of [0,.38,1]){
  const shape=contact.create(rate,nail);
  assert(Math.abs(shape.force.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert(shape.force.every(value=>Number.isFinite(value)&&value>=0));
  for(const frequency of [0,82.407,196,1000,4000,rate*.45])assert(contact.response(shape,frequency).gain<=1+1e-12);
  const notes=[54,55,56].map(midi=>model.render(rate,midi,{contact:1,nail}));
  const attack=notes.map(data=>rms(data,rate,0,.015)),ratio=attack[1]/((attack[0]+attack[2])/2);
  assert(ratio>.75&&ratio<1.3,`G3 contact onset balance: ${rate}/${nail}/${ratio}`);
  for(const data of notes){assert(data.every(Number.isFinite));assert(data[data.length-1]===0);let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));assert(peak<=.80001)}
 }
 const soft=model.render(rate,60,{contact:1,nail:0}),hard=model.render(rate,60,{contact:1,nail:1});
 assert(upperBand(hard,rate)>upperBand(soft,rate)*1.15,'Nail hardness must change attack spectrum');
 console.log(`${rate} Hz: finite contact force, bounded spectrum, G3 balance and soft/hard attack verified`);
}
let reply;scope.self={postMessage:value=>{reply=value}};scope.importScripts=()=>{};
vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
for(const coupling of [0,1])for(const enabled of [0,1]){
 scope.self.onmessage({data:{id:1,rate:48000,midi:60,settings:{coupling,contact:enabled}}});assert(!reply.error);assert(reply.values.every(Number.isFinite));
 if(!coupling&&!enabled){const baseline=vm.runInContext('NylonModel.render(48000,60,{coupling:0,contact:0})',scope);assert(Buffer.from(reply.values.buffer).equals(Buffer.from(baseline.buffer)))}
}
console.log('All four coupling/contact combinations work; both OFF preserves the previous sound');
