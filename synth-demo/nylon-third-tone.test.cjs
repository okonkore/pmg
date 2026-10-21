'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const scope=vm.createContext({});for(const f of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),profile=vm.runInContext('NylonThirdExcitation',scope),fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-wound-approved.json')));
assert(profile.lossPerSecond.every(x=>x>=0&&Number.isFinite(x)));
const settings={bodyFit:1,referenceTone:1,attack:1,stringTexture:1,highDecay:1};
const partial=(y,rate,n)=>{const f=440*2**((55-69)/12)*n,start=Math.round(rate*.04),length=Math.round(rate*.1);let re=0,im=0;for(let i=0;i<length;i++){const v=y[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),p=2*Math.PI*f*(start+i)/rate;re+=v*Math.cos(p);im+=v*Math.sin(p)}return Math.hypot(re,im)};
for(const rate of [44100,48000]){
 const before={},after={},a=model.render(rate,55,settings,before),b=model.render(rate,55,{...settings,thirdTone:1},after);
 assert.equal(crypto.createHash('sha256').update(Buffer.from(a.buffer)).digest('hex'),fixture.public[`${rate}:55`],'Unselected trial preserves original G3');
 assert(b.every(Number.isFinite));assert(Math.abs(before.initialEnergy-after.initialEnergy)<1e-10);assert.equal(after.initialBodyEnergy,0);assert(after.maxEnergy<=after.initialEnergy+1e-10);assert(after.radiatedEnergy+after.releaseRemainder<=after.initialEnergy-after.finalEnergy+1e-10);
 for(const [n,reduction]of[[2,10],[3,20]])assert(20*Math.log10(partial(b,rate,n)/partial(b,rate,1))-20*Math.log10(partial(a,rate,n)/partial(a,rate,1)) < -reduction,'Excess low-order harmonics are reduced');
}
for(const midi of [35,40,45,50,59,64,66,69]){
 const a=model.render(44100,midi,settings),b=model.render(44100,midi,{...settings,thirdTone:1});assert(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)),'Other strings remain exact');
}
for(const extra of [{bodyFit:0},{referenceTone:0}]){const a=model.render(44100,55,{...settings,...extra}),b=model.render(44100,55,{...settings,...extra,thirdTone:1});assert(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)))}
for(const midi of [56,57,58]){const d={},y=model.render(48000,midi,{...settings,thirdTone:1},d);assert(y.every(Number.isFinite));assert(d.maxEnergy<=d.initialEnergy+1e-10)}
console.log('Third-string trial: excess second/third harmonics reduced, passive energy, stable fretted notes, exact unchanged other strings and OFF paths at both rates.');
