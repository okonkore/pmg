'use strict';
const history=require('./nylon-history-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});let reply;
scope.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(__dirname,n),'utf8'),scope));scope.self={postMessage:v=>reply=v};vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),settings={bodyFit:1,referenceTone:1,attack:1,dropD:false,stringTexture:1,highDecay:1};
for(const rate of [44100,48000]){
 for(const midi of [40,45,50])history.equal(model.render(rate,midi,settings),'wound',rate,midi,settings,'Same sound as released implementation');
 assert.notEqual(Buffer.compare(history.bytes(model.render(rate,35,settings)),history.bytes(history.model('wound').render(rate,35,{...settings,stringTexture:0,highDecay:0}))),0,"Seventh string now uses wound release");
 for(const midi of [55,59,64,66,69])history.equal(model.render(rate,midi,settings),'wound',rate,midi,settings,'Legacy plain path retained when thirdTone is disabled');
 for(const midi of [35,38,40,45,50]){
  const off={},on={},a=model.render(rate,midi,{...settings,highDecay:0},off),b=model.render(rate,midi,settings,on);
  assert(b.every(Number.isFinite));assert.equal(on.initialEnergy,off.initialEnergy);assert.equal(on.initialBodyEnergy,0);
  for(let i=0;i<Math.floor(.025*rate);i++)assert(Math.abs(a[i]*off.rawPeak-b[i]*on.rawPeak)<1e-6*Math.max(1,off.rawPeak),'First 25ms raw attack preserved');
  assert(on.maxEnergy<=on.initialEnergy+1e-10);assert(on.radiatedEnergy+on.releaseRemainder<=on.initialEnergy-on.finalEnergy+1e-10);
 }
}
for(const body of [0,1])for(const contact of [0,1])for(const dropD of [false,true]){
 scope.self.onmessage({data:{id:1,rate:44100,midi:40,settings:{...settings,bridge:true,body,contact,dropD,nail:body,position:body/2}}});assert(!reply.error,reply.error);assert(reply.values.every(Number.isFinite));
}
for(const extra of [{referenceTone:0},{bodyFit:0}]){
 const a=model.render(44100,40,{...settings,...extra}),b=model.render(44100,40,{...settings,...extra,stringTexture:0,highDecay:0});assert(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)),'Existing OFF paths preserved');
}
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert(page.includes("stringTexture:1"));assert(page.includes("highDecay:1"));assert(page.includes('plain-approved-2026-10-21:'));
assert(page.includes('dropD:false'),'Standard tuning is fixed');
assert(!page.includes('guitar-test-'),'No isolated preview controls in the instrument');
console.log('Wound release: exact released source on strings 4/5/6 at both rates, unchanged legacy plain path, seventh string wound release, preserved attack, passive energy, worker extremes and UI settings passed');
