'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const workers=[],scope=vm.createContext({clearTimeout:()=>{},Worker:class{constructor(){workers.push(this);this.terminated=false}postMessage(data){this.request=data}terminate(){this.terminated=true}}});
 vm.runInContext('let guitarWorker,guitarJobId=0,guitarPrepareTimer,guitarGeneration=0;const guitarJobs=new Map(),guitarPending=new Map(),ctx={sampleRate:48000};',scope);
 const source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');vm.runInContext(source.slice(source.indexOf('function renderGuitar('),source.indexOf('function trimGuitarCache(')),scope);
 const oldPromise=vm.runInContext('renderGuitar(40,{})',scope),old=workers[0];vm.runInContext('cancelGuitarWork()',scope);assert.equal(await oldPromise,null);assert(old.terminated);
 let prevented=0;const event={preventDefault(){prevented++}};old.onerror(event);assert.equal(vm.runInContext('guitarWorker',scope),undefined,'Late canceled errors are ignored');
 const nextPromise=vm.runInContext('renderGuitar(50,{})',scope),next=workers[1];old.onerror(event);assert(!next.terminated);assert.equal(vm.runInContext('guitarJobs.size',scope),1,'Stale worker cannot reject replacement jobs');
 const values=new Float32Array([.1,.2]);next.onmessage({data:{id:next.request.id,values}});assert.equal(await nextPromise,values);
 const failure=vm.runInContext('renderGuitar(64,{})',scope);const rejected=assert.rejects(failure,/ギター音色の準備に失敗/);next.onerror(event);await rejected;assert(next.terminated);assert.equal(vm.runInContext('guitarJobs.size',scope),0);assert.equal(vm.runInContext('guitarWorker',scope),undefined);assert.equal(prevented,3);
 console.log('Preparation cancellation: pending jobs finish on stop, stale worker errors are ignored, replacement jobs survive and genuine errors clean up correctly');
})().catch(e=>{console.error(e);process.exitCode=1});
