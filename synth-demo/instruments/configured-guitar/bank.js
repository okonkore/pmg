import {validateSettings,signature,MIDI_RANGE} from './settings.js';
export const MAX_PREPARATION_CONCURRENCY=4;
const DB_NAME='pmg-physical-guitar-prepared-v1',MAX_MEMORY=64*1024*1024;
const aborted=()=>new DOMException('準備を中止しました','AbortError');
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function openDB(){const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{req.result.createObjectStore('notes');};return request(req);}
export async function createPreparedGuitar(context,{destination=context.destination,onProgress=()=>{}}={}) {
 const db=await openDB(),cache=new Map(),loads=new Map(),workers=new Set();
 let active,job=0,generation=0,preparing=false,memory=0,lastPreparation;
 function key(configKey,midi){return configKey+':'+context.sampleRate+':'+midi;}
 async function read(k){return request(db.transaction('notes').objectStore('notes').get(k));}
 async function exists(k){return (await request(db.transaction('notes').objectStore('notes').getKey(k)))!==undefined;}
 async function write(k,value){return new Promise((resolve,reject)=>{const tx=db.transaction('notes','readwrite');tx.objectStore('notes').put(value,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存できませんでした'));});}
 function stopWorkers(reason=aborted()){
  for(const entry of workers){entry.worker.terminate();for(const p of entry.pending.values())p.reject(reason);entry.pending.clear();}workers.clear();
 }
 function cancel(){generation++;stopWorkers();preparing=false;}
 function check(token){if(token!==generation)throw aborted();}
 function ask(entry,type,params={}){const id=++job;return new Promise((resolve,reject)=>{entry.pending.set(id,{resolve,reject});try{entry.worker.postMessage({type,id,...params});}catch(e){entry.pending.delete(id);reject(e);}});}
 async function spawn(token,onStage){
  check(token);const entry={worker:new Worker(new URL('./worker.js?v=guard-retry-1',import.meta.url),{type:'module'}),pending:new Map()};workers.add(entry);
  entry.worker.onmessage=({data})=>{const p=entry.pending.get(data.id);if(!p||token!==generation)return;if(data.type==='progress'){onStage(data);return;}entry.pending.delete(data.id);data.type==='error'?p.reject(Error(data.message)):p.resolve(data);};
  entry.worker.onerror=e=>{const error=Error(e.message||'計算Workerが停止しました');for(const p of entry.pending.values())p.reject(error);entry.pending.clear();};
  entry.worker.onmessageerror=()=>{for(const p of entry.pending.values())p.reject(Error('計算結果を読み取れませんでした'));entry.pending.clear();};
  await ask(entry,'init');check(token);return entry;
 }
 async function run(input,{midis=MIDI_RANGE,concurrency=1}={},benchmarkOnly=false){
  const config=validateSettings(input),list=[...new Set(midis)];
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>MAX_PREPARATION_CONCURRENCY)throw Error('並列数は1〜4で指定してください');
  if(list.some(n=>!Number.isInteger(n)||n<21||n>108))throw Error('準備する音域を確認してください');
  cancel();const token=generation,started=performance.now(),configKey='full-pressure-m256-guard-retry-4-2-1-v1:'+signature(config),running=new Map(),notes=[];preparing=true;
  let done=0,reused=0,cursor=0,workerCount=0;const missing=[];
  const stage=()=>{check(token);onProgress({type:'stage',running:[...running.values()].map(item=>({...item})),workers:workerCount,concurrency,done,total:list.length,benchmark:benchmarkOnly});};
  const progress=midi=>{check(token);onProgress({type:'note',done,total:list.length,midi,concurrency,workers:workerCount,reused,benchmark:benchmarkOnly});};
  try{
   for(const midi of list){
    check(token);const k=key(configKey,midi),existing=!benchmarkOnly&&await exists(k);check(token);
    if(existing){const record=await read(k);check(token);const limit=Math.round(15*record.rate);if(record.frames>limit){record.frames=limit;record.pcm=record.pcm.slice(0,limit*3);record.capped=true;await write(k,record);check(token);}done++;reused++;progress(midi);}else missing.push(midi);
   }
   workerCount=Math.min(concurrency,missing.length);onProgress({type:'plan',done,total:list.length,reused,workers:workerCount,concurrency,benchmark:benchmarkOnly});
   await Promise.all(Array.from({length:workerCount},async(_,slot)=>{
    let entry;
    while(cursor<missing.length){
     check(token);const midi=missing[cursor++];running.set(slot,{midi,stage:entry?'弦と胴の係数を計算':'計算エンジンを起動',fraction:0});stage();
     if(!entry)entry=await spawn(token,data=>{const item=running.get(slot);if(item){item.stage=data.stage;item.fraction=data.fraction;stage();}});
     check(token);const result=await ask(entry,'render',{settings:config,midi,rate:context.sampleRate});check(token);
     if(!benchmarkOnly){running.get(slot).stage='端末に保存';running.get(slot).fraction=1;stage();await write(key(configKey,midi),{pcm:result.pcm,pcmScale:result.pcmScale,rate:result.rate,frames:result.frames,physics:result.physics,integration:result.integration,capped:result.capped,peak:result.peak});check(token);}
     notes.push({midi,frames:result.frames,peak:result.peak,coefficientMs:result.physics.coefficientMs});delete result.pcm;running.delete(slot);done++;progress(midi);stage();
    }
   }));
   check(token);const stats={elapsedMs:performance.now()-started,concurrency,workersUsed:workerCount,reused,generated:missing.length,total:list.length,notes,benchmark:benchmarkOnly};
   if(!benchmarkOnly){active={config,configKey,midis:[...new Set([...(active?.configKey===configKey?active.midis:[]),...list])]};lastPreparation=stats;}
   return stats;
  }catch(e){if(token===generation){generation++;stopWorkers(e);preparing=false;}throw e;}
  finally{if(token===generation){preparing=false;stopWorkers();}}
 }
 async function prepare(input,options={}){await run(input,options,false);return active;}
 async function benchmark(input,{concurrency=1,midis=[40,45,50,64]}={}){return run(input,{concurrency,midis},true);}
 async function loadNote(midi){if(!active)throw Error('先に弦の設定を決定してください');const k=key(active.configKey,midi);if(cache.has(k)){const item=cache.get(k);cache.delete(k);cache.set(k,item);return item;}
  const record=await read(k);if(!record)throw Error('この音はまだ準備できていません');const buffer=context.createBuffer(1,record.frames,record.rate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const j=3*i,n=record.pcm[j]|record.pcm[j+1]<<8|record.pcm[j+2]<<16;data[i]=((n<<8)>>8)/8388607*(record.pcmScale??1);}
  const bytes=buffer.length*4;while(memory+bytes>MAX_MEMORY&&cache.size){const [first,item]=cache.entries().next().value;memory-=item.bytes;cache.delete(first);}const item={buffer,physics:record.physics,bytes};cache.set(k,item);memory+=bytes;return item;
 }
 async function ensure(midi){if(!active)throw Error('先に弦の設定を決定してください');const k=key(active.configKey,midi);if(loads.has(k))return loads.get(k);const promise=loadNote(midi).finally(()=>loads.delete(k));loads.set(k,promise);return promise;}
 function play({midi,when=context.currentTime,gain=1,onended=()=>{}}){if(!Number.isFinite(when)||!Number.isFinite(gain)||gain<0||gain>1)throw Error('演奏条件を確認してください');let source,volume,ended=false,releaseAt=Infinity;const finish=()=>{if(ended)return;ended=true;source?.disconnect();volume?.disconnect();onended();};
  const voice={midi,ready:ensure(midi).then(item=>{if(ended)return;if(releaseAt<=context.currentTime){finish();return;}source=context.createBufferSource();volume=context.createGain();volume.gain.value=gain;source.buffer=item.buffer;source.connect(volume).connect(destination);source.onended=finish;source.start(Math.max(when,context.currentTime));if(Number.isFinite(releaseAt))voice.release(releaseAt);return item;}).catch(e=>{finish();throw e;}),release(at=context.currentTime){releaseAt=Math.min(releaseAt,at);if(source&&!ended){const t=Math.max(at,context.currentTime);volume.gain.cancelScheduledValues(t);volume.gain.setValueAtTime(gain,t);volume.gain.linearRampToValueAtTime(0,t+.012);source.stop(t+.012);}},kill(){if(source&&!ended){try{source.stop();}catch{}}finish();}};return voice;
 }
 return {prepare,benchmark,ensure,play,cancel,get lastPreparation(){return lastPreparation;},async has(midi){return !!active&&await exists(key(active.configKey,midi));},get preparing(){return preparing;},get active(){return active;},dispose(){cancel();cache.clear();memory=0;db.close();}};
}
