'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
(async()=>{
 let pauses=0,clock=0;const scope=vm.createContext({performance:{now:()=>clock+=10},setTimeout:fn=>{pauses++;return setTimeout(fn,0)}}),replies=[];let finish;
 const finished=new Promise(resolve=>finish=resolve);
 scope.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),scope));scope.self={postMessage:value=>{replies.push(value);if(replies.length===3)finish()}};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'nylon-worker.js'),'utf8'),scope);
 const model=vm.runInContext('NylonBridgeModel',scope),original=model.renderAsync.bind(model);let active=0,maxActive=0;
 model.renderAsync=async(...args)=>{active++;maxActive=Math.max(maxActive,active);try{return await original(...args)}finally{active--}};
 const settings={bridge:true,bodyFit:1,referenceTone:1,attack:1,dropD:false,stringTexture:1,highDecay:1};
 for(const [id,midi,rate] of [[1,40,44100],[2,50,48000],[3,64,44100]])scope.self.onmessage({data:{id,midi,rate,settings}});
 assert.equal(replies.length,0,'Rendering yields before posting results');
 await finished;assert.deepEqual(replies.map(r=>r.id),[1,2,3]);assert.equal(maxActive,1,'One synthesis job at a time');assert(pauses>20,'Worker gives CPU time back during notes');
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'nylon-wound-approved.json'))),hash=y=>crypto.createHash('sha256').update(Buffer.from(y.buffer)).digest('hex');
 for(const reply of replies){assert(!reply.error,reply.error);const rate=reply.id===2?48000:44100,expected=reply.midi===64?fixture.public:fixture.approved;assert.equal(hash(reply.values),expected[`${rate}:${reply.midi}`],'Yielding preserves exact released samples');}
 console.log('Responsive worker: asynchronous rendering yields repeatedly, runs one job at a time in FIFO order and preserves approved output at both sample rates');
})().catch(e=>{console.error(e);process.exitCode=1});
