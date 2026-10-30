import {PhysicalGuitarEngine} from '../physical-guitar/engine.js';

// This policy is part of the bank cache identity. Never resume a failed state.
export const RENDER_POLICY='guard-retry-4-2-1-v1';
export async function renderNote(model,kernel,rate,{onProgress=()=>{},createEngine=PhysicalGuitarEngine.create.bind(PhysicalGuitarEngine)}={}){
 const attempts=[];
 for(const block of [4,2,1]){
  const engine=await createEngine(model.binary,kernel,rate,{block,sparseTolerance:.03,linearAfter:12});
  const samples=new Float32Array(Math.round(15*rate));let count=samples.length;
  try{
   for(let offset=0;offset<samples.length;offset+=2048){
    const end=Math.min(offset+2048,samples.length);engine.render(samples.subarray(offset,end));
    if(offset%(2048*8)===0){onProgress({stage:block===4?'波形を計算':`細かい刻みで再計算（${block}）`,fraction:offset/samples.length});await new Promise(r=>setTimeout(r,0));}
    if(end>=12*rate){let bound=0;for(let j=0;j<engine.n;j++)bound+=Math.hypot(engine.out.data[2*j],engine.out.data[2*j+1])*Math.hypot(engine.z.data[2*j],engine.z.data[2*j+1]);if(bound*engine.gain<1e-6){count=end;break;}}
   }
   return {samples,count,integration:{policy:RENDER_POLICY,block,attempts}};
  }catch(e){
   if(e.message!=='Physical state exceeded safe output range')throw e;
   attempts.push({block,sample:engine.age,timeS:engine.age/rate,reason:e.message});
   if(block===1)throw Error(`${e.message}（${rate} Hz、弦${model.physics.string}、フレット${model.physics.fret}、刻み4→2→1で再計算失敗、${(engine.age/rate).toFixed(6)}秒）`);
   onProgress({stage:'安全範囲を超えたため初期状態から再計算',fraction:0});
   await new Promise(r=>setTimeout(r,0));
  }
 }
}
