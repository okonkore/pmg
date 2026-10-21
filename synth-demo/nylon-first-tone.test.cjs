'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const scope=vm.createContext({});for(const f of ['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope),legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-wound-approved.json'))),third=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-third-approved.json'))),settings={bodyFit:1,referenceTone:1,attack:1,thirdTone:1,stringTexture:1,highDecay:1};
const hash=y=>crypto.createHash('sha256').update(Buffer.from(y.buffer)).digest('hex');
const partial=(y,rate,midi,n)=>{const f=440*2**((midi-69)/12)*n,start=Math.round(rate*.04),length=Math.round(rate*.1);let re=0,im=0;for(let i=0;i<length;i++){const v=y[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),angle=2*Math.PI*f*i/rate;re+=v*Math.cos(angle);im+=v*Math.sin(angle)}return Math.hypot(re,im)};
const rms=(y,rate,a,b)=>{let power=0;for(let i=Math.round(a*rate);i<Math.round(b*rate);i++)power+=y[i]**2;return Math.sqrt(power/Math.round((b-a)*rate))};
for(const rate of [44100,48000]){
 for(const [midi,n,dir,minDb]of[[64,3,-1,3],[66,6,1,8],[69,6,-1,10]]){
  const before={},after={},a=model.render(rate,midi,settings,before),b=model.render(rate,midi,{...settings,firstTone:1},after);
  assert.equal(hash(a),legacy.public[`${rate}:${midi}`],'Existing first-string tone stays available');assert(b.every(Number.isFinite));assert(Math.abs(before.initialEnergy-after.initialEnergy)<1e-10);assert(after.maxEnergy<=after.initialEnergy+1e-10);assert.equal(after.initialBodyEnergy,0);assert(after.radiatedEnergy+after.releaseRemainder<=after.initialEnergy-after.finalEnergy+1e-10);
  const delta=20*Math.log10(partial(b,rate,midi,n)/partial(b,rate,midi,1))-20*Math.log10(partial(a,rate,midi,n)/partial(a,rate,midi,1));assert(delta*dir>minDb,'Measured excess/missing partial is corrected');
  if(midi===66)assert(20*Math.log10(rms(b,rate,1,1.3)/rms(b,rate,.04,.14))> -20,'Do not force recorded F-sharp rapid decay');
 }
 // E4's middle-band evolution must not collapse back to a static initial spectrum.
 const e=model.render(rate,64,{...settings,firstTone:1});
 const envelope=(n,a,b)=>{let best=0;for(let shift=-5;shift<=5;shift+=.5){let re=0,im=0;const start=Math.round(a*rate),length=Math.round((b-a)*rate),f=440*2**((64-69)/12)*n+shift;for(let i=0;i<length;i++){const v=e[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),angle=2*Math.PI*f*i/rate;re+=v*Math.cos(angle);im+=v*Math.sin(angle)}best=Math.max(best,Math.hypot(re,im)/length)}return best};
 assert(20*Math.log10(envelope(3,.5,.8)/envelope(2,.5,.8))>8,'E4 later middle band lets partial 3 overtake partial 2');
 assert(20*Math.log10(envelope(3,.15,.4)/envelope(3,.04,.14))>2,'E4 partial 3 blooms after the initial attack');
 assert.equal(hash(model.render(rate,55,{...settings,firstTone:1})),third.approved[`${rate}:55`],'Accepted third string remains exact');
 for(const midi of [40,45,50])assert.equal(hash(model.render(rate,midi,{...settings,firstTone:1})),legacy.approved[`${rate}:${midi}`],'Accepted wound strings remain exact');
 assert.equal(hash(model.render(rate,59,{...settings,firstTone:1})),legacy.public[`${rate}:59`],'Second string remains exact');
}
for(const midi of [65,67,68,76,88]){const d={},y=model.render(48000,midi,{...settings,firstTone:1},d);assert(y.every(Number.isFinite));assert(d.maxEnergy<=d.initialEnergy+1e-10)}
for(const extra of [{referenceTone:0},{bodyFit:0}])assert.equal(hash(model.render(44100,64,{...settings,...extra})),hash(model.render(44100,64,{...settings,...extra,firstTone:1})),'OFF path retained');
console.log('First-string trial: corrected E/F-sharp/A partials, bounded passive energy, smooth-fret finite output, retained F-sharp sustain and exact accepted third/wound/second strings at both rates.');
