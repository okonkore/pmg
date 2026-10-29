'use strict';
const history=require('./nylon-history-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-third-approved.json'))),scope=vm.createContext({});let reply;
scope.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope));scope.self={postMessage:value=>reply=value};vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope);
for(const rate of [44100,48000]){
 scope.self.onmessage({data:{id:1,rate,midi:55,settings:{...fixture.settings,bridge:true}}});assert(!reply.error,reply.error);history.equal(reply.values,'third',rate,55,fixture.settings,'Worker plays the released G3');
 for(const midi of [59,64,66,69])history.equal(model.render(rate,midi,fixture.settings),'wound',rate,midi,fixture.settings,'Strings 1/2 remain unchanged');
 for(const midi of [40,45,50])history.equal(model.render(rate,midi,fixture.settings),'wound',rate,midi,fixture.settings,'Released wound strings remain unchanged');
}
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert(page.includes("thirdTone:1"));assert(!page.includes('guitar-test-'));assert(page.includes('plain-approved-2026-10-21'));
console.log('Approved third-string release: exact released G3 through worker, unchanged strings 1/2/4/5/6 at both rates, UI adoption.');
