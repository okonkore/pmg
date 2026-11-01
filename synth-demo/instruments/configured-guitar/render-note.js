import {PhysicalGuitarEngine} from '../physical-guitar/engine.js';

// This policy is part of the bank cache identity. Never resume a failed state.
export const RENDER_POLICY='refinement-retry-4-2-1-v1';
const REFINEMENT_ERROR='Integration step failed local refinement check';
// Compare 128 pressure samples from identical state, not a spectral filter.
// Reuse the same WASM memory; all persistent state and propagators are restored.
export function createRefinementProbe(engine){
 const z=new Float64Array(engine.z.data.length),e=new Float64Array(engine.ehalf.data.length),c=new Float64Array(engine.chalf.data.length),reference=new Float32Array(128);
 return ()=>{
  if(engine.block===1||engine.age/engine.rate>=engine.linearAfter)return null;
  if(engine.phase!==0||engine.reference)throw Error('Refinement requires a block boundary');
  z.set(engine.z.data);e.set(engine.ehalf.data);c.set(engine.chalf.data);
  const {age,phase,block,failed,lastDeltaT}=engine;
  try{engine.block=block/2;engine.coef(engine.block*engine.dt/2,engine.ehalf.data,engine.chalf.data);engine.render(reference);return reference;}
  finally{engine.z.data.set(z);engine.ehalf.data.set(e);engine.chalf.data.set(c);Object.assign(engine,{age,phase,block,failed,lastDeltaT});}
 };
}

export async function renderNote(model,kernel,rate,{onProgress=()=>{},createEngine=PhysicalGuitarEngine.create.bind(PhysicalGuitarEngine),createProbe=createRefinementProbe}={}){
 const attempts=[];
 for(const block of [4,2,1]){
  const engine=await createEngine(model.binary,kernel,rate,{block,sparseTolerance:.03,linearAfter:12});
  const probe=createProbe(engine);
  const samples=new Float32Array(Math.round(15*rate));let count=samples.length;
  try{
   for(let offset=0;offset<samples.length;offset+=2048){
    const reference=probe(),end=Math.min(offset+2048,samples.length);engine.render(samples.subarray(offset,end));
    if(reference){let error=0,power=0;const n=Math.min(reference.length,end-offset);for(let i=0;i<n;i++){error+=(samples[offset+i]-reference[i])**2;power+=reference[i]**2;}
     // A 1% local RMS accuracy budget, with the existing 1e-6 tail floor.
     if(error>power*1e-4&&error>n*1e-12)throw Error(REFINEMENT_ERROR);
    }
    if(offset%(2048*8)===0){onProgress({stage:block===4?'波形を計算':`細かい刻みで再計算（${block}）`,fraction:offset/samples.length});await new Promise(r=>setTimeout(r,0));}
    if(end>=12*rate){let bound=0;for(let j=0;j<engine.n;j++)bound+=Math.hypot(engine.out.data[2*j],engine.out.data[2*j+1])*Math.hypot(engine.z.data[2*j],engine.z.data[2*j+1]);if(bound*engine.gain<1e-6){count=end;break;}}
   }
   return {samples,count,integration:{policy:RENDER_POLICY,block,attempts}};
  }catch(e){
   if(e.message!=='Physical state exceeded safe output range'&&e.message!==REFINEMENT_ERROR)throw e;
   attempts.push({block,sample:engine.age,timeS:engine.age/rate,reason:e.message});
   if(block===1)throw Error(`数値計算が安全な出力範囲を超えました：${e.message}（${rate} Hz、弦${model.physics.string}、フレット${model.physics.fret}、刻み4→2→1で再計算失敗、${(engine.age/rate).toFixed(6)}秒）`);
   onProgress({stage:e.message===REFINEMENT_ERROR?'計算刻みの精度不足のため初期状態から再計算':'安全範囲を超えたため初期状態から再計算',fraction:0});
   await new Promise(r=>setTimeout(r,0));
  }
 }
}
