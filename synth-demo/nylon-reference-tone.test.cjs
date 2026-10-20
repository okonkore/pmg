'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const scope=vm.createContext({});let reply;
scope.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(__dirname,n),'utf8'),scope));
scope.self={postMessage:value=>reply=value};vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const {model,previous,current}=vm.runInContext('({model:NylonBridgeModel,previous:NylonBodyFit,current:NylonReferenceFit})',scope);
const hashes={"40": "c4664f7985f155c7da93292085b690f655f585bbf60c5d30127f05bdf495003e", "50": "a8ebd0ef4b3e1813fd1327c403315e4f6e12345eb70307523d467e41d2c839ba", "55": "efa8dd85971e91675ffc79b9bf11c373a55d1595a0fea8edb3a467191a812b88", "64": "40d66052b8dc26798c1f9ee97e12e12b8561582a0845f3e244c9450cdb0b95ea", "66": "07b52fcc631ea33d88befaee22bd52a89c4c867b69edc7a5c20521886bdb84e8", "69": "e62508e9d70db337d3c876a2cd08a6098bfb8370f972e4b75a5848b88bb4c151"};
assert.equal(current.pluckScale,previous.pluckScale);assert.equal(JSON.stringify(current.radiationPhases),JSON.stringify(previous.radiationPhases));
assert(current.radiativeFractions.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
for(const [midi,hash] of Object.entries(hashes)){
 const settings={bodyFit:1,attack:1,dropD:false},before={},after={};
 const off=model.render(48000,+midi,{...settings,referenceTone:0},before),on=model.render(48000,+midi,{...settings,referenceTone:1},after);
 assert.equal(crypto.createHash('sha256').update(Buffer.from(off.buffer)).digest('hex'),hash,'OFF preserves the exact accepted sound');
 assert.notEqual(Buffer.compare(Buffer.from(off.buffer),Buffer.from(on.buffer)),0);
 if(+midi>=55)for(const key of ['initialEnergy','finalEnergy','releaseEnergy','releaseRemainder','maxEnergy','maxBodyEnergy'])assert.equal(after[key],before[key],'Plain-string mechanics retained: '+key);
 else assert(Math.abs(after.initialEnergy-before.initialEnergy)<1e-12,'Wound adjustment redistributes the same initial energy');
 const rms=(y,a,b)=>{let power=0;for(let i=Math.round(a*48000);i<Math.round(b*48000);i++)power+=y[i]**2;return Math.sqrt(power/Math.round((b-a)*48000))};
 if(+midi===66){const tail=y=>20*Math.log10(rms(y,1,1.3)/rms(y,.04,.14));assert(tail(on)>tail(off)-3,'Do not copy the reference F#4 rapid damping')}
}
for(const rate of [44100,48000])for(const midi of [21,38,40,50,55,64,66,69,84,108]){
 const d={},y=model.render(rate,midi,{bodyFit:1,referenceTone:1,attack:1},d);
 assert(y.every(Number.isFinite));assert(y[y.length-1]===0);let peak=0;for(const v of y)peak=Math.max(peak,Math.abs(v));assert(peak>.1&&peak<=.80001);
 assert(d.maxEnergy<=d.initialEnergy+1e-10);assert(d.radiatedEnergy+d.releaseRemainder<=d.initialEnergy-d.finalEnergy+1e-10);
}
for(const body of [0,1])for(const contact of [0,1])for(const dropD of [false,true]){
 scope.self.onmessage({data:{id:1,rate:44100,midi:66,settings:{bridge:true,bodyFit:1,referenceTone:1,attack:1,body,contact,dropD,nail:body,position:body?.45:.08}}});
 assert(!reply.error,reply.error);assert(reply.values.every(Number.isFinite));
}
const a=model.render(48000,50,{bodyFit:0,referenceTone:0}),b=model.render(48000,50,{bodyFit:0,referenceTone:1});assert(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)));
console.log('Reference tone: exact previous-sound switch, fixed pluck energy and unchanged plain-string mechanics, no forced F#4 damping, 44.1/48kHz full range and worker controls passed');
