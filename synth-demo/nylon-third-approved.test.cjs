'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-third-approved.json'))),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-wound-approved.json'))),scope=vm.createContext({});let reply;
scope.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope));scope.self={postMessage:value=>reply=value};vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),hash=y=>crypto.createHash('sha256').update(Buffer.from(y.buffer)).digest('hex');
for(const rate of [44100,48000]){
 scope.self.onmessage({data:{id:1,rate,midi:55,settings:{...fixture.settings,bridge:true}}});assert(!reply.error,reply.error);assert.equal(hash(reply.values),fixture.approved[`${rate}:55`],'Worker plays the user-approved G3');
 for(const midi of [59,64,66,69])assert.equal(hash(model.render(rate,midi,fixture.settings)),baseline.public[`${rate}:${midi}`],'Strings 1/2 remain unchanged');
 for(const midi of [40,45,50])assert.equal(hash(model.render(rate,midi,fixture.settings)),baseline.approved[`${rate}:${midi}`],'Approved wound strings remain unchanged');
}
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert(page.includes("thirdTone:Number($('guitar-reference-tone').checked)"));assert(page.includes('guitar-test-59'));assert(page.includes('plain-approved-2026-10-21'));
console.log('Approved third-string release: exact accepted G3 through worker, unchanged strings 1/2/4/5/6 at both rates, UI adoption and B3 preview.');
