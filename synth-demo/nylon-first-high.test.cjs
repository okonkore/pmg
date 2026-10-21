'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});for(const file of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-first-middle-approved.json'))),settings={bodyFit:1,referenceTone:1,attack:1,firstTone:1,thirdTone:1,stringTexture:1,highDecay:1};
const level=(y,rate,f,a,b)=>{const start=Math.round(a*rate),len=Math.round((b-a)*rate);let peak=0;for(let delta=-2;delta<=2;delta++){let re=0,im=0;for(let i=0;i<len;i++){const q=y[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(len-1))),t=2*Math.PI*(f+delta)*i/rate;re+=q*Math.cos(t);im+=q*Math.sin(t)}peak=Math.max(peak,Math.hypot(re,im)/len)}return peak};
let largestMiddleChange=0;
for(const rate of [44100,48000])for(const midi of [64,66,69]){
 const d={},y=model.render(rate,midi,settings,d),basis=level(y,rate,440*2**((midi-69)/12),.04,.14);
 for(const row of fixture.rows.filter(r=>r.rate===rate&&r.midi===midi)){const actual=20*Math.log10(level(y,rate,row.frequency,row.a,row.b)/basis),delta=Math.abs(actual-row.db);largestMiddleChange=Math.max(largestMiddleChange,delta);assert(delta<.2,`Retain approved middle: ${rate}/${midi}/h${row.n}/${row.a}: ${delta}dB`)}
 if(midi===66){const f0=440*2**((midi-69)/12);assert(20*Math.log10(level(y,rate,f0*7,.005,.04)/level(y,rate,f0*7,.04,.14))< -8,'High partial must emerge after the initial contact, not start with a strong pitched ping')}
 assert(d.contactEnergy>0&&d.contactEnergy<d.initialEnergy*.0001,'Contact uses a small finite part of the original pluck budget');assert(d.maxEnergy<=d.initialEnergy+1e-10);assert(d.radiatedEnergy+d.releaseRemainder<=d.initialEnergy-d.finalEnergy+1e-10);assert(y.every(Number.isFinite));
}
console.log(`First-string high trial: accepted middle-band envelopes retained within ${largestMiddleChange.toFixed(3)}dB at both sample rates; finite contact reservoir and passive energy verified.`);
