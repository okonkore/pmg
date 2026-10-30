import {createExperimentalPluckPreparation} from './experimental-pluck.js?v=standard-v1-guard-1';
import {createPluckComparison} from './experimental-pluck-pair.js';
import {normalizeExperiment} from './experimental-pluck-contract.js?v=standard-v1-guard-1';
const aborted=()=>new DOMException('試聴準備を中止しました','AbortError');
// A: published instantaneous integration; C/B: matched numerical schedule.
// Publish only a complete triplet. Both managers are private RAM-only caches.
export function createLabComparison(options={}){
 const current=createExperimentalPluckPreparation(options),matched=createPluckComparison(options);
 let job=null,active=null,disposed=false;
 function cancel(){const old=job;job=null;old?.controller.abort();current.cancel();matched.cancel()}
 async function prepare(input,{signal,onProgress=()=>{}}={}){
  if(disposed)throw Error('Lab comparison disposed');
  const request=normalizeExperiment({...input,notes:[input.note]});
  if(request.release.seconds<=0||request.comparisonRelease)throw Error('Choose a finite candidate release');
  if(typeof onProgress!=='function')throw Error('Invalid progress callback');
  if(signal?.aborted)throw aborted();
  cancel();const task={controller:new AbortController()};job=task;
  const check=()=>{if(job!==task||disposed||task.controller.signal.aborted)throw aborted()};
  const abort=()=>{if(job===task)cancel()};signal?.addEventListener('abort',abort,{once:true});
  const emit=p=>{check();onProgress(p);check()};
  try{
   const baseline=await current.prepare({...request,release:{seconds:0,shape:request.release.shape}},{signal:task.controller.signal,onProgress:p=>emit({...p,part:'A',fraction:p.fraction/3})});check();
   const pair=await matched.prepare({...request,note:request.notes[0]},{signal:task.controller.signal,onProgress:p=>emit({...p,part:p.part==='A'?'C':'B',fraction:1/3+p.fraction*2/3})});check();
   active=Object.freeze({...pair,current:baseline});return active;
  }finally{signal?.removeEventListener('abort',abort);if(job===task)job=null}
 }
 return {prepare,cancel,get active(){return active},get preparing(){return job!==null},dispose(){cancel();disposed=true;current.dispose();matched.dispose();active=null}};
}
