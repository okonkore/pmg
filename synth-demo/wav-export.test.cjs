const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),W=require('./wav-format.js');
for(const rate of [44100,48000,96000])for(const frames of [1,128,1234567]){
 const header=W.header(frames,rate),d=new DataView(header);assert.equal(Buffer.from(header).toString('ascii',0,4),'RIFF');assert.equal(d.getUint32(4,true),36+frames*4);assert.equal(d.getUint32(40,true),frames*4);assert.equal(d.getUint16(22,true),2);assert.equal(d.getUint32(24,true),rate);
}
assert.throws(()=>W.plan(10000,48000),/64 MiB/);assert.throws(()=>W.plan(NaN,48000));assert.equal(W.filename('a/b:c'),'a_b_c.wav');
function processor(){let Constructor;const messages=[];const scope=vm.createContext({currentFrame:0,sampleRate:48000,AudioWorkletProcessor:class{constructor(){this.port={postMessage:d=>messages.push(d)}}},registerProcessor:(n,c)=>Constructor=c});vm.runInContext(fs.readFileSync(__dirname+'/wav-capture-worklet.js','utf8'),scope);return {p:new Constructor(),scope,messages}}
let {p,scope,messages}=processor();p.port.onmessage({data:{type:'start',start:13,end:10013}});
for(let at=0;at<10112;at+=128){scope.currentFrame=at;p.process([[Float32Array.from({length:128},()=>.5),Float32Array.from({length:128},()=>-.25)]]);}
const chunks=messages.filter(m=>m.type==='chunk');assert.equal(chunks.reduce((s,m)=>s+m.frames,0),10000);assert.equal(messages.at(-1).type,'done');assert.equal(messages.at(-1).frames,10000);
for(const chunk of chunks){const d=new DataView(chunk.buffer);for(let i=0;i<chunk.frames;i++){assert.equal(d.getInt16(i*4,true),16384);assert.equal(d.getInt16(i*4+2,true),-8192)}}
({p,scope,messages}=processor());scope.currentFrame=128;p.port.onmessage({data:{type:'start',start:0,end:1000}});assert.equal(messages[0].type,'error');
({p,scope,messages}=processor());p.port.onmessage({data:{type:'start',start:0,end:1000}});p.process([[new Float32Array([NaN])]]);assert.equal(messages[0].type,'error');
({p,scope,messages}=processor());p.port.onmessage({data:{type:'cancel'}});assert.equal(p.process([]),false);assert.equal(messages.length,0);
console.log('WAV: exact RIFF lengths/rates, size bounds, PCM16 stereo samples, exact frame cropping, cancellation and late/nonfinite rejection passed.');
