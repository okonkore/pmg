'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const scope=vm.createContext({});
scope.importScripts=(...names)=>{for(const name of names)vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),scope)};
let reply;scope.self={postMessage:value=>reply=value};
vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope);
function checkSamples(y){assert(y.every(Number.isFinite));assert(y[y.length-1]===0);let peak=0;for(const v of y)peak=Math.max(peak,Math.abs(v));assert(peak<=.80001);assert(peak>.1)}
function partialAmplitude(y,rate,frequency){
 const first=Math.round(.05*rate),length=Math.round(.14*rate);let re=0,im=0;
 for(let i=0;i<length;i++){const v=y[first+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),angle=2*Math.PI*frequency*i/rate;re+=v*Math.cos(angle);im+=v*Math.sin(angle)}
 return Math.hypot(re,im);
}
for(const rate of [44100,48000]){
 for(const midi of [38,50,66]){
  const d={};const y=model.render(rate,midi,{dropD:true},d);checkSamples(y);
  assert(d.maxEnergy<=d.initialEnergy*(1+1e-10));assert(d.maxBodyEnergy>0);
  assert(d.radiatedEnergy>0&&d.radiatedEnergy<d.initialEnergy-d.finalEnergy+1e-10);
  let previous=d.initialEnergy;for(const s of d.snapshots){assert(s.total<=previous+1e-10);previous=s.total}
 }
 const dry={};model.render(rate,50,{body:0,dropD:true},dry);assert.equal(dry.maxBodyEnergy,0);assert.equal(dry.radiatedEnergy,0);
 const near={},far={},original=model.bodyModes.map(row=>Array.from(row));
 const a=model.render(rate,50,{dropD:true},near);
 try{
  model.bodyModes[2][0]=350;
  const b=model.render(rate,50,{dropD:true},far);
  // Same pluck energy; one body resonance moved, with no separate partial gain/decay edit.
  assert.equal(near.initialEnergy,far.initialEnergy);
  const index=Math.round(rate*.5/4096),energyA=near.snapshots[index].partials[1],energyB=far.snapshots[index].partials[1];
  assert(energyA<energyB*.8,'Near-resonance second partial must lose energy faster');
  const ratioA=partialAmplitude(a,rate,293.66)/partialAmplitude(a,rate,146.83);
  const ratioB=partialAmplitude(b,rate,293.66)/partialAmplitude(b,rate,146.83);
  assert(Math.abs(20*Math.log10(ratioA/ratioB))>1,'Same body edit must also change emitted spectrum');
  console.log(`${rate} Hz: passive energy, acoustic loss budget, body-dependent spectrum and partial decay verified`);
 }finally{model.bodyModes=original}
}
for(const midi of [21,35,38,50,55,66,84,108])for(const body of [0,1]){
 scope.self.onmessage({data:{id:7,rate:44100,midi,settings:{bridge:true,body,dropD:true,contact:1,nail:body,position:body?.45:.08}}});
 assert(!reply.error,reply.error);checkSamples(reply.values);
}
const before=model.render(44100,50,{dropD:true});
const ignored=model.render(44100,50,{dropD:true,harmonics:1,coupling:0});
assert(Buffer.from(before.buffer).equals(Buffer.from(ignored.buffer)),'New model must not use the old EQ/coupling switches');
console.log('Worker routing, contact/slider extremes, piano range and independent physical mode verified');
