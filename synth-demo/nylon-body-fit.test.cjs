'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const scope=vm.createContext({});let reply;
scope.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(__dirname,n),'utf8'),scope));
scope.self={postMessage:r=>reply=r};vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope);
const old=vm.runInNewContext(['nylon-contact.js','nylon-model.js','nylon-coupled-model.js'].map(n=>fs.readFileSync(path.join(__dirname,n),'utf8')).join('\n')+'\n'+fs.readFileSync(path.join(__dirname,'../analysis-1007/multinote-fit/bridge-before-fit.js'),'utf8')+'\nNylonBridgeModel');
for(const rate of [44100,48000])for(const midi of [21,38,50,66,69,108]){
 const settings={dropD:true,attack:1},d={},on=model.render(rate,midi,{...settings,bodyFit:1},d),off=model.render(rate,midi,{...settings,bodyFit:0});
 assert(on.every(Number.isFinite));assert(on[on.length-1]===0);let peak=0;for(const v of on)peak=Math.max(peak,Math.abs(v));assert(peak>.1&&peak<=.80001);
 assert(d.maxEnergy<=d.initialEnergy+1e-10);assert(d.radiatedEnergy+d.releaseRemainder<=d.initialEnergy-d.finalEnergy+1e-10);
 assert(Buffer.from(off.buffer).equals(Buffer.from(old.render(rate,midi,settings).buffer)),'OFF retains previous sound exactly');
 assert(!Buffer.from(on.buffer).equals(Buffer.from(off.buffer)));
}
for(const nail of [0,1])for(const position of [.08,.45])for(const body of [0,1])for(const contact of [0,1]){
 scope.self.onmessage({data:{id:1,rate:44100,midi:66,settings:{bridge:true,bodyFit:1,attack:1,nail,position,body,contact}}});
 assert(!reply.error,reply.error);assert(reply.values.every(Number.isFinite));
}
console.log('Body fit: exact OFF preservation, passive energy budgets, full-range finite output and worker control extremes passed');
