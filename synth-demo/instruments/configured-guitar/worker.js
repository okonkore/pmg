import {buildModel} from './prepare.js';
import {PhysicalGuitarEngine} from '../physical-guitar/engine.js';
let body,kernel;
self.onmessage=async({data})=>{const {id}=data;try{
 if(data.type==='init'){const [r,k]=await Promise.all([fetch(new URL('./body-library-256.json',import.meta.url)),fetch(new URL('../physical-guitar/kernel.wasm',import.meta.url))]);if(!r.ok||!k.ok)throw Error('計算データを取得できません');body=await r.json();kernel=await k.arrayBuffer();self.postMessage({id,type:'ready'});return;}
 if(data.type!=='render'||!body)throw Error('計算エンジンが未準備です');self.postMessage({id,type:'progress',stage:'弦と胴の係数を計算',fraction:0});
 const model=buildModel(data.settings,data.midi,body,{sampleRate:data.rate}),engine=await PhysicalGuitarEngine.create(model.binary,kernel,data.rate,{block:4,sparseTolerance:.03,linearAfter:12}),samples=new Float32Array(Math.round(50*data.rate));let count=samples.length;
 for(let offset=0;offset<samples.length;offset+=2048){const end=Math.min(offset+2048,samples.length);engine.render(samples.subarray(offset,end));if(offset%(2048*8)===0){self.postMessage({id,type:'progress',stage:'波形を計算',fraction:offset/samples.length});await new Promise(r=>setTimeout(r,0));}
  if(end>=12*data.rate){let bound=0;for(let j=0;j<engine.n;j++)bound+=Math.hypot(engine.out.data[2*j],engine.out.data[2*j+1])*Math.hypot(engine.z.data[2*j],engine.z.data[2*j+1]);if(bound*engine.gain<1e-6){count=end;break;}}
 }
 let peak=0;for(let i=0;i<count;i++){const x=samples[i];if(!Number.isFinite(x))throw Error('有限の波形を計算できません');peak=Math.max(peak,Math.abs(x));}const pcmScale=Math.max(1,peak),pcm=new Uint8Array(count*3);
 for(let i=0;i<count;i++){const q=Math.round(samples[i]/pcmScale*8388607);pcm[i*3]=q&255;pcm[i*3+1]=(q>>8)&255;pcm[i*3+2]=(q>>16)&255;}
 self.postMessage({id,type:'rendered',pcm,pcmScale,frames:count,peak,rate:data.rate,physics:model.physics,capped:count===samples.length},[pcm.buffer]);
 }catch(e){self.postMessage({id,type:'error',message:(['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][data.midi%12]+(Math.floor(data.midi/12)-1)+'：'+e.message)});}};
