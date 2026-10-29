'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const shared=['nylon-contact.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n');
const previous=vm.runInNewContext(shared+'\n'+fs.readFileSync(path.join(__dirname,'../analysis-1007/nylon-bridge-before-brightness.js'),'utf8')+'\nNylonBridgeModel');
const current=vm.runInNewContext(shared+'\n'+fs.readFileSync(path.join(__dirname,'nylon-bridge-model.js'),'utf8')+'\nNylonBridgeModel');
function partial(y,rate,midi,n){
 const frequency=440*2**((midi-69)/12)*n,first=Math.round(rate*.05),length=Math.round(rate*.14);let re=0,im=0;
 for(let i=0;i<length;i++){const value=y[first+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),phase=2*Math.PI*frequency*i/rate;re+=value*Math.cos(phase);im+=value*Math.sin(phase)}
 return Math.hypot(re,im);
}
function relative(y,rate,midi,n){return 20*Math.log10(partial(y,rate,midi,n)/partial(y,rate,midi,1))}
for(const rate of [44100,48000]){
 for(const midi of [38,40,50,66]){
  const a=previous.render(rate,midi,{dropD:true}),b=current.render(rate,midi,{dropD:true});
  if(midi===50){const gain=relative(b,rate,midi,8)-relative(a,rate,midi,8);assert(gain>15&&gain<26,'Fill the missing eighth partial without excessive boost');console.log(`${rate} Hz: D3 eighth partial ${gain.toFixed(1)} dB stronger`)}
  if(midi<60)for(const n of [2,3,4])assert(Math.abs(relative(b,rate,midi,n)-relative(a,rate,midi,n))<1.2,'Keep low-note core partials');
  if(midi===66){for(const n of [5,6])assert(relative(b,rate,midi,n)-relative(a,rate,midi,n)<1,'Do not bring back F#4 fifth/sixth excess');assert(Math.abs(relative(b,rate,midi,7)-relative(a,rate,midi,7))<2)}
 }
}
console.log('Brightness increase and preservation of bass/F#4 balance verified');
