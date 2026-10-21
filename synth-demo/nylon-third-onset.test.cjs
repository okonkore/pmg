'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});for(const f of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),profile=vm.runInContext('NylonThirdExcitation',scope),settings={bodyFit:1,referenceTone:1,attack:1,thirdTone:1};
const rms=(y,rate,a,b)=>{let sum=0;for(let i=Math.round(a*rate);i<Math.round(b*rate);i++)sum+=y[i]**2;return Math.sqrt(sum/Math.round((b-a)*rate))};
for(const rate of [44100,48000]){
 const rise=profile.onsetRiseSeconds,before={},after={};profile.onsetRiseSeconds=0;const a=model.render(rate,55,settings,before);profile.onsetRiseSeconds=rise;const b=model.render(rate,55,settings,after);
 for(const key of ['initialEnergy','finalEnergy','releaseEnergy','releaseRemainder','radiatedEnergy','contactEnergy'])assert.equal(after[key],before[key],'Only acoustic onset changes, not the physical trajectory');
 const gain=after.rawPeak/before.rawPeak;
 assert(20*Math.log10(rms(b,rate,0,.005)*gain/rms(a,rate,0,.005))< -15,'First 5ms is softer');
 assert(Math.abs(20*Math.log10(rms(b,rate,.08,.2)*gain/rms(a,rate,.08,.2)))<.01,'Later level is preserved');
 let maxError=0;for(let i=Math.round(rate*.1);i<a.length;i++)maxError=Math.max(maxError,Math.abs(b[i]*gain-a[i]));assert(maxError<1e-6,'Later waveform and timbre remain unchanged');assert(b.every(Number.isFinite));
}
console.log('Third-string onset: softer first 5ms, same later waveform and level, identical mechanical trajectory at 44.1/48kHz.');
