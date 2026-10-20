'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const model=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'nylon-model.js'),'utf8')+fs.readFileSync(path.join(__dirname,'nylon-coupled-model.js'),'utf8')+';NylonCoupledModel;');
// Verify all string changes, including the two piano-range extensions.
for(const [midi,number,openMidi,fret,wound] of [
 [21,7,35,0,true],[34,7,35,0,true],[35,7,35,0,true],[39,7,35,4,true],
 [40,6,40,0,true],[44,6,40,4,true],[45,5,45,0,true],[49,5,45,4,true],
 [50,4,50,0,true],[54,4,50,4,true],[55,3,55,0,false],[58,3,55,3,false],
 [59,2,59,0,false],[63,2,59,4,false],[64,1,64,0,false],[69,1,64,5,false],[108,1,64,44,false]
]){
 const actual=model.stringFor(midi);
 assert.equal(actual.number,number);assert.equal(actual.openMidi,openMidi);
 assert.equal(actual.fret,fret);assert.equal(actual.wound,wound);
}
function rms(data,rate,from,to){let sum=0;const first=Math.floor(rate*from),last=Math.floor(rate*to);for(let i=first;i<last;i++)sum+=data[i]*data[i];return Math.sqrt(sum/(last-first))}
for(const rate of [44100,48000]){
 for(const body of [0,.48,1]){
  const notes=[54,55,56].map(midi=>model.render(rate,midi,{nail:.4,position:.22,body}));
  const attack=notes.map(data=>rms(data,rate,0,.015));
  const ratio=attack[1]/((attack[0]+attack[2])/2);
  assert(ratio>.75&&ratio<1.3,`G3 onset out of balance at ${rate} Hz, body=${body}: ${ratio}`);
  for(const data of notes){
   assert.equal(data.length,Math.ceil(rate*3.6));assert(data.every(Number.isFinite));assert(data[data.length-1]===0);
   let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));assert(peak<=.80001);
  }
  console.log(`${rate} Hz / body ${body}: G3 onset ${ (20*Math.log10(ratio)).toFixed(1)} dB versus neighbours`);
 }
}

for(const midi of [21,34,35,39,40]){
 const data=model.render(48000,midi);
 assert(data.every(Number.isFinite));assert(data[data.length-1]===0);
 let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));assert(peak<=.80001);
}
console.log('Seven-string boundaries and extended low range: OK');
