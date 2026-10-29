import {validateSettings,signature,MIDI_RANGE} from './settings.js';
const DB_NAME='pmg-physical-guitar-prepared-v1',MAX_MEMORY=64*1024*1024;
const aborted=()=>new DOMException('準備を中止しました','AbortError');
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function openDB(){const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{req.result.createObjectStore('notes');};return request(req);}
export async function createPreparedGuitar(context,{destination=context.destination,onProgress=()=>{}}={}) {
 const db=await openDB(),cache=new Map(),pending=new Map(),loads=new Map();let active,worker,job=0,generation=0,preparing=false,memory=0;
 function key(configKey,midi){return configKey+':'+context.sampleRate+':'+midi;}
 async function read(k){return request(db.transaction('notes').objectStore('notes').get(k));}
 async function exists(k){return (await request(db.transaction('notes').objectStore('notes').getKey(k)))!==undefined;}
 async function write(k,value){return new Promise((resolve,reject)=>{const tx=db.transaction('notes','readwrite');tx.objectStore('notes').put(value,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存できませんでした'));});}
 function cancel(){generation++;worker?.terminate();worker=null;for(const p of pending.values())p.reject(aborted());pending.clear();preparing=false;}
 function ask(type,params={}){const id=++job;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({type,id,...params});});}
 async function spawn(){worker?.terminate();worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;if(data.type==='progress'){onProgress({...data,type:'stage'});return;}pending.delete(data.id);data.type==='error'?p.reject(Error(data.message)):p.resolve(data);};worker.onerror=e=>{for(const p of pending.values())p.reject(Error(e.message));pending.clear();};await ask('init');}
 async function prepare(input,{midis=MIDI_RANGE}={}){
  const config=validateSettings(input);cancel();const token=generation;preparing=true;const configKey='full-pressure-m256-r1:'+signature(config),list=[...new Set(midis)];if(list.some(n=>!Number.isInteger(n)||n<21||n>108))throw Error('準備する音域を確認してください');let done=0;
  try{for(const midi of list){if(token!==generation)throw aborted();onProgress({type:'note',done,total:list.length,midi});const k=key(configKey,midi);const existing=await exists(k);if(token!==generation)throw aborted();if(!existing){if(!worker)await spawn();if(token!==generation)throw aborted();const result=await ask('render',{settings:config,midi,rate:context.sampleRate});if(token!==generation)throw aborted();
    await write(k,{pcm:result.pcm,pcmScale:result.pcmScale,rate:result.rate,frames:result.frames,physics:result.physics,capped:result.capped,peak:result.peak});}

    if(token!==generation)throw aborted();onProgress({type:'note',done:++done,total:list.length,midi});}
   active={config,configKey,midis:[...new Set([...(active?.configKey===configKey?active.midis:[]),...list])]};return active;
  }finally{if(token===generation){preparing=false;worker?.terminate();worker=null;}}
 }
 async function loadNote(midi){if(!active)throw Error('先に弦の設定を決定してください');const k=key(active.configKey,midi);if(cache.has(k)){const item=cache.get(k);cache.delete(k);cache.set(k,item);return item;}
  const record=await read(k);if(!record)throw Error('この音はまだ準備できていません');const buffer=context.createBuffer(1,record.frames,record.rate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const j=3*i,n=record.pcm[j]|record.pcm[j+1]<<8|record.pcm[j+2]<<16;data[i]=((n<<8)>>8)/8388607*(record.pcmScale??1);}
  const bytes=buffer.length*4;while(memory+bytes>MAX_MEMORY&&cache.size){const [first,item]=cache.entries().next().value;memory-=item.bytes;cache.delete(first);}const item={buffer,physics:record.physics,bytes};cache.set(k,item);memory+=bytes;return item;
 }
 async function ensure(midi){if(!active)throw Error('先に弦の設定を決定してください');const k=key(active.configKey,midi);if(loads.has(k))return loads.get(k);const promise=loadNote(midi).finally(()=>loads.delete(k));loads.set(k,promise);return promise;}
 function play({midi,when=context.currentTime,gain=1,onended=()=>{}}){if(!Number.isFinite(when)||!Number.isFinite(gain)||gain<0||gain>1)throw Error('演奏条件を確認してください');let source,volume,ended=false,releaseAt=Infinity;const finish=()=>{if(ended)return;ended=true;source?.disconnect();volume?.disconnect();onended();};
  const voice={midi,ready:ensure(midi).then(item=>{if(ended)return;if(releaseAt<=context.currentTime){finish();return;}source=context.createBufferSource();volume=context.createGain();volume.gain.value=gain;source.buffer=item.buffer;source.connect(volume).connect(destination);source.onended=finish;source.start(Math.max(when,context.currentTime));if(Number.isFinite(releaseAt))voice.release(releaseAt);return item;}).catch(e=>{finish();throw e;}),release(at=context.currentTime){releaseAt=Math.min(releaseAt,at);if(source&&!ended){const t=Math.max(at,context.currentTime);volume.gain.cancelScheduledValues(t);volume.gain.setValueAtTime(gain,t);volume.gain.linearRampToValueAtTime(0,t+.012);source.stop(t+.012);}},kill(){if(source&&!ended){try{source.stop();}catch{}}finish();}};return voice;
 }
 return {prepare,ensure,play,cancel,async has(midi){return !!active&&await exists(key(active.configKey,midi));},get preparing(){return preparing;},get active(){return active;},dispose(){cancel();cache.clear();memory=0;db.close();}};
}
