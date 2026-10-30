/** Separate, memory-only experimental bank. Never imports or modifies the default bank.
 * prepare(request,{signal,onProgress}) atomically replaces only this manager's active.
 * Returned Float32 PCM is caller-owned; no EQ, normalization, retuning or tail fade.
 */
import {EXPERIMENT_VERSION,LIMITS,normalizeExperiment,integrationFor,experimentKey} from './experimental-pluck-contract.js?v=standard-v1-guard-1';
export {EXPERIMENT_VERSION,LIMITS} from './experimental-pluck-contract.js?v=standard-v1-guard-1';
const aborted=()=>new DOMException('Experimental preparation cancelled','AbortError');
export function createExperimentalPluckPreparation({timeoutMs=120000}={}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<20||timeoutMs>600000)throw Error('Invalid worker timeout');
 let current=null,active=null,disposed=false,serial=0,cacheBytes=0;const cache=new Map();
 function stop(job,error){
  if(!job||job.stopped)return;job.stopped=true;job.worker?.terminate();
  for(const pending of job.pending.values()){clearTimeout(pending.timer);pending.reject(error||aborted());}job.pending.clear();
  job.detach?.();if(current===job)current=null;
 }
 function cancel(){stop(current,aborted());}
 function check(job){if(disposed||job.stopped||current!==job)throw aborted();}
 function emit(job,progress){check(job);job.onProgress(structuredClone(progress));check(job);}
 function ask(job,type,params={}){
  check(job);const id=++serial;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>stop(job,Error('Experimental worker timed out')),timeoutMs);
   job.pending.set(id,{resolve,reject,timer});
   try{job.worker.postMessage({id,type,...params});}catch(error){stop(job,error);}
  });
 }
 function publish(records,request,stats){
  // Cache and caller buffers never alias. A caller may edit audition PCM safely.
  const notes=records.map(r=>Object.freeze({...r,physics:structuredClone(r.physics),integration:{...r.integration},pcm:r.pcm.slice()}));
  const bank={version:EXPERIMENT_VERSION,experimental:true,request:structuredClone(request),notes:Object.freeze(notes),stats:Object.freeze(stats),
   toAudioBuffer(context,id){const note=notes.find(n=>n.id===id);if(!note)throw Error('Note is not in this experimental bank');const buffer=context.createBuffer(1,note.frames,note.rate);buffer.copyToChannel(note.pcm,0);return buffer;}};
  return Object.freeze(bank);
 }
 async function prepare(input,{signal,onProgress=()=>{}}={}){
  if(disposed)throw Error('Experimental preparation manager is disposed');
  const request=normalizeExperiment(input);if(typeof onProgress!=='function')throw Error('onProgress must be a function');if(signal?.aborted)throw aborted();
  cancel();const job={pending:new Map(),worker:null,stopped:false,onProgress};current=job;const started=performance.now();
  const records=[],staged=new Map();let reused=0;
  try{
   if(signal){const abort=()=>stop(job,aborted());signal.addEventListener('abort',abort,{once:true});job.detach=()=>signal.removeEventListener('abort',abort);if(signal.aborted)throw aborted();}
   job.worker=new Worker(new URL('./experimental-pluck-worker.js?v=standard-v1-guard-1',import.meta.url),{type:'module'});
   job.worker.onerror=event=>stop(job,Error(event.message||'Experimental worker failed'));
   job.worker.onmessageerror=()=>stop(job,Error('Experimental worker result could not be decoded'));
   job.worker.onmessage=({data})=>{
    if(job.stopped||current!==job)return;const pending=job.pending.get(data.id);if(!pending)return;
    if(data.type==='progress'){try{emit(job,{stage:data.stage,fraction:(records.length+data.fraction)/request.notes.length,note:request.notes[records.length],done:records.length,total:request.notes.length});}catch(error){stop(job,error);}return;}
    clearTimeout(pending.timer);job.pending.delete(data.id);data.type==='error'?pending.reject(Error(data.message)):pending.resolve(data);
   };
   emit(job,{stage:'initializing',fraction:0,done:0,total:request.notes.length});
   const ready=await ask(job,'init');check(job);if(ready.version!==EXPERIMENT_VERSION)throw Error('Experimental worker version mismatch');
   for(const note of request.notes){
    check(job);const integration=integrationFor(request,note,ready.defaults,ready.assets),key=experimentKey(request,note,integration,ready.assets);let record=cache.get(key);
    if(record){reused++;}else{
     const result=await ask(job,'render',{request:{...request,notes:[note]}});check(job);
     if(result.type!=='rendered'||!(result.pcm instanceof Float32Array)||result.frames!==request.frames||result.pcm.length!==request.frames||result.rate!==request.rate||!result.pcm.every(Number.isFinite)||JSON.stringify(result.integration)!==JSON.stringify(integration))throw Error('Invalid experimental audio result');
     record={...note,key,pcm:result.pcm,frames:result.frames,rate:result.rate,peak:result.peak,physics:result.physics,integration,elapsedMs:result.elapsedMs};staged.set(key,record);
    }
    records.push(record);emit(job,{stage:reused&&cache.has(key)?'cached':'note',fraction:records.length/request.notes.length,note,done:records.length,total:request.notes.length});
   }
   check(job);const next=publish(records,request,{elapsedMs:performance.now()-started,reused,generated:staged.size,total:records.length});
   // Single synchronous commit: failed/cancelled jobs cannot publish partial banks.
   for(const [key,record] of staged){while(cache.size>=LIMITS.cacheEntries||cacheBytes+record.pcm.byteLength>LIMITS.cacheBytes){const [old,value]=cache.entries().next().value;cache.delete(old);cacheBytes-=value.pcm.byteLength;}cache.set(key,record);cacheBytes+=record.pcm.byteLength;}
   active=next;return next;
  }finally{stop(job);}
 }
 return {prepare,cancel,get active(){return active;},get preparing(){return !!current;},get cacheSize(){return cache.size;},dispose(){cancel();disposed=true;active=null;cache.clear();cacheBytes=0;}};
}
