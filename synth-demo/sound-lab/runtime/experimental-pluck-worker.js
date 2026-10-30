import {GuitarCoefficients} from '../../instruments/configured-guitar/coefficient-engine.js?v=coeff-cpp-1';
import {FinitePluckEngine} from './finite-pluck.js';
import {EXPERIMENT_VERSION,normalizeExperiment,integrationFor} from './experimental-pluck-contract.js?v=standard-v1-guard-1';
let loaded,coefficients,busy=false;
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
async function initialize(){
 const urls=['../../instruments/configured-guitar/body-library-256.json','../../instruments/configured-guitar/coefficients.wasm?v=coeff-cpp-1','../../instruments/physical-guitar/kernel.wasm','../../instruments/configured-guitar/default-settings.json'];
 const bytes=await Promise.all(urls.map(async url=>{const r=await fetch(new URL(url,import.meta.url));if(!r.ok)throw Error('Experimental model asset could not be loaded');return r.arrayBuffer()}));
 const hashes=await Promise.all(bytes.map(hash));
 return {body:JSON.parse(new TextDecoder().decode(bytes[0])),wasm:bytes[1],kernel:bytes[2],defaults:JSON.parse(new TextDecoder().decode(bytes[3])),assets:{body:hashes[0],coefficients:hashes[1],kernel:hashes[2],defaults:hashes[3]}};
}
self.onmessage=async({data})=>{
 const id=data.id;if(busy){self.postMessage({id,type:'error',message:'Experimental worker is already busy'});return;}busy=true;
 try{
  if(data.type==='init'){loaded=await initialize();self.postMessage({id,type:'ready',version:EXPERIMENT_VERSION,assets:loaded.assets,defaults:loaded.defaults});return;}
  if(data.type!=='render'||!loaded)throw Error('Experimental worker is not initialized');
  const request=normalizeExperiment(data.request);if(request.notes.length!==1)throw Error('Worker renders one note at a time');
  const note=request.notes[0],options=integrationFor(request,note,loaded.defaults,loaded.assets),started=performance.now();
  self.postMessage({id,type:'progress',stage:'coefficients',fraction:0});
  coefficients??=await GuitarCoefficients.create(loaded.body,loaded.wasm);
  const model=coefficients.build(request.settings,note.midi,{sampleRate:request.rate,stringNumber:note.stringNumber});
  const engine=await FinitePluckEngine.create(model,loaded.kernel,request.rate,options),pcm=new Float32Array(request.frames);
  for(let offset=0;offset<pcm.length;offset+=256){engine.render(pcm.subarray(offset,Math.min(offset+256,pcm.length)));self.postMessage({id,type:'progress',stage:'render',fraction:Math.min(offset+256,pcm.length)/pcm.length});await new Promise(resolve=>setTimeout(resolve,0));}
  let peak=0;for(const sample of pcm){if(!Number.isFinite(sample))throw Error('Nonfinite experimental audio');peak=Math.max(peak,Math.abs(sample));}
  self.postMessage({id,type:'rendered',pcm,frames:pcm.length,rate:request.rate,peak,physics:model.physics,integration:options,elapsedMs:performance.now()-started},[pcm.buffer]);
 }catch(error){self.postMessage({id,type:'error',message:error.message||String(error)});}finally{busy=false;}
};
