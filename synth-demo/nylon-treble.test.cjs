'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const shared=['nylon-contact.js','nylon-model.js','nylon-coupled-model.js'].map(name=>fs.readFileSync(path.join(__dirname,name),'utf8')).join('\n');
const before=vm.runInNewContext(shared+'\n'+fs.readFileSync(path.join(__dirname,'../analysis-1007/nylon-bridge-before-treble.js'),'utf8')+'\nNylonBridgeModel');
const after=vm.runInNewContext(shared+'\n'+fs.readFileSync(path.join(__dirname,'nylon-bridge-model.js'),'utf8')+'\nNylonBridgeModel');
function amplitude(y,rate,f,from=.05,to=.19){
 const start=Math.round(rate*from),count=Math.round(rate*(to-from));let re=0,im=0;
 for(let i=0;i<count;i++){const v=y[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(count-1))),phase=2*Math.PI*f*i/rate;re+=v*Math.cos(phase);im+=v*Math.sin(phase)}
 return Math.hypot(re,im);
}
function relative(y,rate,midi,n,from,to){const f=440*2**((midi-69)/12);return 20*Math.log10(amplitude(y,rate,f*n,from,to)/amplitude(y,rate,f,from,to))}
for(const rate of [44100,48000]){
 for(const midi of [38,40,50])for(const dropD of [false,true]){
  const a=before.render(rate,midi,{dropD}),b=after.render(rate,midi,{dropD});
  for(const n of [2,3,4])assert(Math.abs(relative(b,rate,midi,n)-relative(a,rate,midi,n))<1.2,`Low-note partial changed too much: ${rate}/${midi}/${n}`);
 }
 const a=before.render(rate,66,{dropD:true}),b=after.render(rate,66,{dropD:true});
 const fifth=relative(b,rate,66,5)-relative(a,rate,66,5),sixth=relative(b,rate,66,6)-relative(a,rate,66,6);
 assert(fifth<-6&&sixth<-3.5,'Over-emphasized fifth and sixth must decrease');
 assert(Math.abs(relative(b,rate,66,7)-relative(a,rate,66,7))<2,'Keep the useful seventh partial near its previous level');
 const lateBefore=relative(a,rate,66,7,.5,1),lateAfter=relative(b,rate,66,7,.5,1);
 assert(lateAfter<lateBefore-3,'Upper partial should not linger as long');
 console.log(`${rate} Hz: bass partials within 1.2 dB; F#4 fifth ${fifth.toFixed(1)} dB, sixth ${sixth.toFixed(1)} dB; upper tail reduced`);
}
