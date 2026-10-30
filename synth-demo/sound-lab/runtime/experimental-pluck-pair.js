import {createExperimentalPluckPreparation} from './experimental-pluck.js?v=standard-v1-guard-1';
import {normalizeExperiment} from './experimental-pluck-contract.js?v=standard-v1-guard-1';
const abortError=()=>new DOMException('比較音の準備を中止しました','AbortError');
/** Sequential A/B generation, one Worker at a time. Only a COMPLETE pair is public. */
export function createPluckComparison(options={}){
 const manager=createExperimentalPluckPreparation(options);let job=null,active=null,disposed=false;
 function cancel(){const old=job;job=null;old?.controller.abort();manager.cancel();}
 async function prepare(input,{signal,onProgress=()=>{}}={}){
  if(disposed)throw Error('Comparison is disposed');
  const request=normalizeExperiment({...input,notes:[input.note]});
  if(request.release.seconds<=0)throw Error('Choose a finite release for B');
  if(typeof onProgress!=='function')throw Error('Progress callback is required');
  if(signal?.aborted)throw abortError();
  cancel();const current={controller:new AbortController()};job=current;const started=performance.now();
  const check=()=>{if(job!==current||current.controller.signal.aborted||disposed)throw abortError()};
  const abort=()=>{if(job===current)cancel()};signal?.addEventListener('abort',abort,{once:true});
  const progress=(part,offset)=>p=>{check();onProgress({...p,part,fraction:(offset+p.fraction)/2});check()};
  try{
   check();
   const a=await manager.prepare({...request,release:{seconds:0,shape:request.release.shape},comparisonRelease:request.release},{signal:current.controller.signal,onProgress:progress('A',0)});
   check();const b=await manager.prepare(request,{signal:current.controller.signal,onProgress:progress('B',1)});check();
   const pair=Object.freeze({request:structuredClone(request),a,b,elapsedMs:performance.now()-started});active=pair;return pair;
  }finally{signal?.removeEventListener('abort',abort);if(job===current)job=null;}
 }
 return {prepare,cancel,get active(){return active},get preparing(){return job!==null},dispose(){cancel();disposed=true;manager.dispose();active=null}};
}
