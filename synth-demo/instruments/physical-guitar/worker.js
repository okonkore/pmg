import {PhysicalGuitarEngine} from './engine.js';
let model,kernel,job=0;
self.onmessage=async({data})=>{
 if(data.type==='cancel'){job++;return;}
 const token=++job;
 try {
  if(data.type==='init'){model=data.bytes;kernel=data.kernel;self.postMessage({id:data.id,type:'ready'});return;}
  if(!model||!kernel)throw Error('Model is not initialized');
  const e=await PhysicalGuitarEngine.create(model,kernel,data.rate,{block:4,sparseTolerance:.03,linearAfter:12,scale:data.scale??1});
  if(token!==job)return;
  if(data.type==='benchmark'){
   const scratch=new Float32Array(128),times=[];e.render(scratch);
   for(let i=0;i<60;i++){const start=performance.now();e.render(scratch);times.push(performance.now()-start);}
   times.sort((a,b)=>a-b);const budget=128/data.rate*1000,p95=times[Math.floor(times.length*.95)];self.postMessage({id:data.id,type:'benchmark',p95Ms:p95,budgetMs:budget,canRealtime:p95<budget*.65});return;
  }
  if(data.type!=='render')throw Error('Unknown command');
  if(!Number.isFinite(data.seconds)||data.seconds<.01||data.seconds>50)throw Error('Invalid render duration');
  const count=Math.round(data.seconds*data.rate),out=new Float32Array(count),size=512;let maximumMs=0;
  for(let offset=0;offset<count;offset+=size){if(token!==job)return;const start=performance.now();e.render(out.subarray(offset,Math.min(count,offset+size)));maximumMs=Math.max(maximumMs,performance.now()-start);
   if(offset%(size*8)===0){self.postMessage({id:data.id,type:'progress',done:offset,total:count});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  if(token===job)self.postMessage({id:data.id,type:'rendered',samples:out,rate:data.rate,maximumChunkMs:maximumMs},[out.buffer]);
 }catch(error){self.postMessage({id:data.id,type:'error',message:error.message});}
};
