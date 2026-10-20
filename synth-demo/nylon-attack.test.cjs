'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const scope=vm.createContext({});let reply;
scope.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),scope)};
scope.self={postMessage:value=>reply=value};
vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
const model=vm.runInContext('NylonBridgeModel',scope);
function rms(y,rate,a,b){let sum=0;for(let i=Math.round(a*rate);i<Math.round(b*rate);i++)sum+=y[i]**2;return Math.sqrt(sum/(Math.round(b*rate)-Math.round(a*rate)))}
function tone(y,rate,midi,n){
 const f=440*2**((midi-69)/12)*n,first=Math.round(.05*rate),length=Math.round(.14*rate);let re=0,im=0;
 for(let i=0;i<length;i++){const v=y[first+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),phase=2*Math.PI*f*i/rate;re+=v*Math.cos(phase);im+=v*Math.sin(phase)}
 return Math.hypot(re,im);
}
function rise(y,rate,widthMs){
 const count=Math.round(rate*.17),width=Math.round(rate*widthMs/1000),half=Math.floor(width/2),sums=new Float64Array(count+width+1);
 for(let i=0;i<count+width;i++)sums[i+1]=sums[i]+(y[i]||0)**2;
 const e=Array.from({length:count},(_,i)=>Math.sqrt((sums[i+half]-sums[Math.max(0,i-half)])/width));
 const peak=Math.max(...e),a=e.findIndex(v=>v>=peak*.1),b=e.findIndex(v=>v>=peak*.9);
 return (b-a)*1000/rate;
}
function finite(y){assert(y.every(Number.isFinite));assert(y[y.length-1]===0);let peak=0;for(const v of y)peak=Math.max(peak,Math.abs(v));assert(peak>.1&&peak<=.80001)}
for(const rate of [44100,48000]){
 for(const midi of [38,50,66]){
  const off={},on={};const a=model.render(rate,midi,{dropD:true,attack:0},off),b=model.render(rate,midi,{dropD:true,attack:1},on);finite(b);
  assert(Math.abs(on.initialEnergy-off.initialEnergy)<1e-12,'Redistribute the original pluck energy, do not add energy');
  assert(on.releaseEnergy>0&&on.releaseEnergy<on.initialEnergy*.003);
  assert(on.maxEnergy<=on.initialEnergy*(1+1e-10));
  assert(on.radiatedEnergy+on.releaseRemainder<=on.initialEnergy-on.finalEnergy+1e-10);
  let previous=on.initialEnergy;for(const s of on.snapshots){assert(s.total<=previous+1e-10);previous=s.total}
  const level=20*Math.log10(rms(b,rate,.08,.5)/rms(a,rate,.08,.5));assert(Math.abs(level)<1,'Preserve the body of the note');
  if(midi===66)for(const n of [5,6]){
   const delta=20*Math.log10((tone(b,rate,midi,n)/tone(b,rate,midi,1))/(tone(a,rate,midi,n)/tone(a,rate,midi,1)));
   assert(Math.abs(delta)<.5,'Keep the accepted fifth/sixth partial balance after the attack');
  }
  if(midi===50){
   let improvement=0;for(const width of [4,8,12]){const oldRise=rise(a,rate,width),newRise=rise(b,rate,width);assert(newRise<=oldRise+1);improvement+=oldRise-newRise;console.log(`${rate} Hz / ${width} ms RMS: D3 rise ${oldRise.toFixed(1)} -> ${newRise.toFixed(1)} ms`)}
   assert(improvement/3>2,'D3 attack improvement must survive different RMS window widths');
  }
 }
}
for(const midi of [21,55,108])for(const nail of [0,1])for(const contact of [0,1]){
 scope.self.onmessage({data:{id:1,rate:44100,midi,settings:{bridge:true,attack:1,body:1,nail,contact}}});assert(!reply.error,reply.error);finite(reply.values);
}
const shared=['nylon-contact.js','nylon-model.js','nylon-coupled-model.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
const old=vm.runInNewContext(shared+'\n'+fs.readFileSync(path.join(__dirname,'../analysis-1007/nylon-bridge-before-attack.js'),'utf8')+'\nNylonBridgeModel');
assert(Buffer.from(old.render(48000,50,{dropD:true}).buffer).equals(Buffer.from(model.render(48000,50,{dropD:true,attack:0}).buffer)),'OFF must preserve the accepted sound exactly');
assert(Buffer.from(model.render(44100,50,{body:0,attack:1}).buffer).equals(Buffer.from(model.render(44100,50,{body:0,attack:0}).buffer)));
console.log('Release energy budget, faster onset, stable tail, worker extremes and exact OFF comparison verified');
