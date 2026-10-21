'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});for(const f of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),profile=vm.runInContext('NylonThirdExcitation',scope),settings={bodyFit:1,referenceTone:1,attack:1,thirdTone:1};
function power(y,rate,a,b){const start=Math.round(rate*a),length=Math.round(rate*(b-a));let sum=0;for(let hz=5100;hz<=9900;hz+=100){let re=0,im=0;for(let i=0;i<length;i++){const x=y[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),angle=2*Math.PI*hz*i/rate;re+=x*Math.cos(angle);im+=x*Math.sin(angle)}sum+=(re*re+im*im)/(length*length)}return sum}
const outputs=[];
for(const rate of [44100,48000]){
 const fraction=profile.contactEnergyFraction,off={},on={};profile.contactEnergyFraction=0;const a=model.render(rate,55,settings,off);profile.contactEnergyFraction=fraction;const b=model.render(rate,55,settings,on);outputs.push(b);
 assert(on.contactEnergy>0&&on.contactEnergy<on.initialEnergy*1e-4);assert(Math.abs(on.initialEnergy-off.initialEnergy)<1e-10);assert(on.maxEnergy<=on.initialEnergy+1e-10);assert(on.radiatedEnergy+on.releaseRemainder<=on.initialEnergy-on.finalEnergy+1e-10);assert(b.every(Number.isFinite));
 assert(10*Math.log10(power(b,rate,0,.04)/power(a,rate,0,.04))>15,'Missing upper attack is restored');
 assert(10*Math.log10(power(b,rate,.15,.2)/power(b,rate,0,.04))< -25,'Upper contact sound is brief');
}
(async()=>{for(const [index,rate] of [44100,48000].entries()){let clock=0,pauses=0;const y=await model.renderAsync(rate,55,settings,undefined,{now:()=>clock+=8,pause:async()=>{pauses++}});assert(pauses>10);assert(Buffer.from(y.buffer).equals(Buffer.from(outputs[index].buffer)),'Seeded finite contact is deterministic across scheduling')}console.log('Third-string contact: finite reserved energy, passive budgets, brief restored upper attack at both rates, deterministic asynchronous output.');})().catch(e=>{console.error(e);process.exitCode=1});
