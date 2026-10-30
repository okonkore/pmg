import {GuitarCoefficients} from './coefficient-engine.js?v=coeff-cpp-1';
import {renderNote} from './render-note.js';
let coefficients,kernel;
self.onmessage=async({data})=>{const {id}=data;try{
 if(data.type==='init'){const [r,k,c]=await Promise.all([fetch(new URL('./body-library-256.json',import.meta.url)),fetch(new URL('../physical-guitar/kernel.wasm',import.meta.url)),fetch(new URL('./coefficients.wasm?v=coeff-cpp-1',import.meta.url))]);if(!r.ok||!k.ok||!c.ok)throw Error('計算データを取得できません');coefficients=await GuitarCoefficients.create(await r.json(),await c.arrayBuffer());kernel=await k.arrayBuffer();self.postMessage({id,type:'ready'});return;}
 if(data.type!=='render'||!coefficients)throw Error('計算エンジンが未準備です');self.postMessage({id,type:'progress',stage:'弦と胴の係数を計算',fraction:0});
 const model=coefficients.build(data.settings,data.midi,{sampleRate:data.rate});
 const {samples,count,integration}=await renderNote(model,kernel,data.rate,{onProgress:p=>self.postMessage({id,type:'progress',...p})});
 let peak=0;for(let i=0;i<count;i++){const x=samples[i];if(!Number.isFinite(x))throw Error('有限の波形を計算できません');peak=Math.max(peak,Math.abs(x));}const pcmScale=Math.max(1,peak),pcm=new Uint8Array(count*3);
 for(let i=0;i<count;i++){const q=Math.round(samples[i]/pcmScale*8388607);pcm[i*3]=q&255;pcm[i*3+1]=(q>>8)&255;pcm[i*3+2]=(q>>16)&255;}
 self.postMessage({id,type:'rendered',pcm,pcmScale,frames:count,peak,rate:data.rate,physics:model.physics,integration,capped:count===samples.length},[pcm.buffer]);
 }catch(e){self.postMessage({id,type:'error',message:(['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][data.midi%12]+(Math.floor(data.midi/12)-1)+'：'+e.message)});}};
