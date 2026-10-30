'use strict';
// Song data and edit history are independent of the DOM and audio engine.
const SequencerModel=(()=>{
 const MAX_BEATS=4096,MAX_NOTES=20000,MIN_LENGTH=1/128,VERSION=1;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const uid=prefix=>prefix+'-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
 function normalize(input){
  if(!input||typeof input!=='object'||!Array.isArray(input.notes)||input.notes.length>MAX_NOTES)throw new Error('曲データの形式が正しくありません');
  const title=String(input.title||'無題').trim().slice(0,100)||'無題',bpm=Number(input.bpm),meter=input.meter||[4,4];
  if(!Number.isFinite(bpm)||bpm<20||bpm>300)throw new Error('テンポは20〜300 BPMで指定してください');
  if(!Array.isArray(meter)||meter.length!==2||!Number.isInteger(meter[0])||meter[0]<1||meter[0]>16||![2,4,8,16].includes(meter[1]))throw new Error('拍子の形式が正しくありません');
  const ids=new Set();
  const notes=input.notes.map(n=>{
   const {beat,pitch,duration}=n;
   if(![beat,pitch,duration].every(Number.isFinite)||beat<0||!Number.isInteger(pitch)||pitch<21||pitch>108||duration<MIN_LENGTH||beat+duration>MAX_BEATS)throw new Error('音符が対応範囲外です（A0〜C8・4096拍まで）');
   const velocity=n.velocity??1;
   if(!Number.isFinite(velocity)||velocity<=0||velocity>1)throw new Error('ベロシティの形式が正しくありません');
   let id=typeof n.id==='string'&&n.id.length<100?n.id:uid('note');if(ids.has(id))id=uid('note');ids.add(id);
   return {id,beat,pitch,duration,velocity};
  }).sort((a,b)=>a.beat-b.beat||a.pitch-b.pitch);
  const source=input.source&&typeof input.source==='object'?Object.fromEntries(['title','key','credit','license','url','licenseUrl','modifications','pitch','terms','endingStatus'].filter(k=>typeof input.source[k]==='string').map(k=>[k,input.source[k].slice(0,500)])):null;
  if(source&&input.source.requiredTuning!==undefined){
   const tuning=input.source.requiredTuning;
   if(!tuning||tuning.instrument!=='guitar'||!Array.isArray(tuning.pitchesLowToHigh)||tuning.pitchesLowToHigh.length!==6||!tuning.pitchesLowToHigh.every((p,i,a)=>Number.isInteger(p)&&p>=21&&p<=108&&(!i||p>a[i-1]))||tuning.automaticallyApplied!==false)throw new Error('必要な調弦の形式が正しくありません（自動適用は非対応）');
   source.requiredTuning={instrument:'guitar',pitchesLowToHigh:[...tuning.pitchesLowToHigh],automaticallyApplied:false};
  }
  if(input.endBeat!==undefined&&(!Number.isFinite(input.endBeat)||input.endBeat<0||input.endBeat>MAX_BEATS))throw new Error('曲の終端が対応範囲外です');
  // Preserve the explicit score marker; playback/editor extent also includes current note ends.
  const endBeat=input.endBeat;
  return {id:String(input.id||''),title,bpm,meter:[...meter],...(endBeat===undefined?{}:{endBeat}),notes,source};
 }
 function fromSong(key,song){
  const is1012=key==='gavotte'||key==='gavotte2'||key.endsWith('1012');
  const meter=song.score.meter|| (key.startsWith('prelude')&&is1012?[12,8]:key.startsWith('gigue')?[6,8]:key.startsWith('sarabande')?(is1012?[3,2]:[3,4]):key.startsWith('courante')?[3,4]:key.startsWith('gavotte')?[2,2]:[4,4]);
  return normalize({id:key,title:song.score.title,bpm:song.score.bpm,meter,endBeat:song.score.endBeat,notes:song.score.events.map(([beat,pitch,duration,velocity],i)=>({id:'original-'+i,beat,pitch,duration,velocity:velocity??1})),source:song.source?{...song.source,key,title:song.score.title}:{key,title:song.score.title,credit:is1012?'J. S. Bach / Hajo Dezelski / Mutopia':'J. S. Bach / Andreas Scherer / Mutopia',license:is1012?'CC BY-SA 3.0':'Public Domain',url:'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id='+(is1012?({prelude1012:1494,allemande1012:1503,courante1012:1504,sarabande1012:1505,gavotte:1506,gavotte2:1507,gigue1012:1508}[key]||1506):517)}});
 }
 function toSong(document){const d=normalize(document);return {label:d.title,option:d.title,edition:'マイソング',source:d.source,score:{title:d.title,bpm:d.bpm,meter:d.meter,endBeat:d.endBeat,events:d.notes.map(n=>[n.beat,n.pitch,n.duration,n.velocity])}}}
 // Offset chord attacks only; keep their original ends and the loop length.
 function playbackEvents(events,bpm,{enabled=false,intervalMs=20,direction='up'}={}){
  const sorted=events.map(e=>[...e]).sort((a,b)=>a[0]-b[0]);
  if(!enabled)return sorted;
  const gap=Math.max(0,Math.min(100,Number(intervalMs)||0))*bpm/60000;
  for(let i=0;i<sorted.length;){
   let end=i+1;while(end<sorted.length&&sorted[end][0]===sorted[i][0])end++;
   const chord=sorted.slice(i,end).sort((a,b)=>direction==='down'?b[1]-a[1]:a[1]-b[1]);
   // Leave room for every note even in very short chords and dense passages.
   const room=Math.min(...chord.map(e=>e[2]),end<sorted.length?sorted[end][0]-sorted[i][0]:Infinity)*.8;
   const step=chord.length>1?Math.min(gap,room/(chord.length-1)):0;
   chord.forEach((e,index)=>{const offset=index*step;e[0]+=offset;e[2]-=offset});
   i=end;
  }
  return sorted.sort((a,b)=>a[0]-b[0]);
 }
 class History{
  constructor(document,readonly=false){this.current=normalize(document);this.readonly=readonly;this.past=[];this.future=[]}
  commit(document){if(this.readonly)throw new Error('内蔵曲は編集できません。コピーを作成してください');const next=normalize(document);if(JSON.stringify(next)===JSON.stringify(this.current))return false;this.past.push(this.current);if(this.past.length>100)this.past.shift();this.current=next;this.future=[];return true}
  edit(change){const next=clone(this.current);change(next);return this.commit(next)}
  undo(){if(this.readonly||!this.past.length)return false;this.future.push(this.current);this.current=this.past.pop();return true}
  redo(){if(this.readonly||!this.future.length)return false;this.past.push(this.current);this.current=this.future.pop();return true}
 }
 class Library{
  constructor(songs,storage){
   this.songs=songs;this.storage=storage;this.key='pmg.songs.v1';this.builtins=new Set(Object.keys(songs));this.users=new Map();this.error='';
   for(const key of this.builtins)Object.defineProperty(songs,key,{value:freeze(songs[key]),writable:false,configurable:false,enumerable:true});
   try{
    const raw=storage?.getItem(this.key);if(raw){const data=JSON.parse(raw);if(data.version!==VERSION||!Array.isArray(data.songs))throw new Error('保存データの形式が正しくありません');for(const item of data.songs){const doc=normalize(item);if(!doc.id.startsWith('user-')||this.builtins.has(doc.id))throw new Error('保存された曲IDが正しくありません');this.users.set(doc.id,doc);songs[doc.id]=toSong(doc)}}
   }catch(error){this.error='保存データを読み込めませんでした。既存データは上書きしません。';this.loadFailed=true}
  }
  isBuiltin(id){return this.builtins.has(id)}
  get(id){if(this.isBuiltin(id))return fromSong(id,this.songs[id]);if(!this.users.has(id))throw new Error('曲が見つかりません');return clone(this.users.get(id))}
  uniqueTitle(title){const names=new Set([...this.users.values()].map(d=>d.title));let result=title,i=2;while(names.has(result))result=title+' '+i++;return result}
  add(document){const doc=normalize({...clone(document),id:uid('user')});doc.title=this.uniqueTitle(doc.title);this.users.set(doc.id,doc);this.songs[doc.id]=toSong(doc);this.persist();return clone(doc)}
  addSaved(document){const doc=this.add(document);if(this.error){this.users.delete(doc.id);delete this.songs[doc.id];throw new Error(this.error)}return doc}
  duplicate(id){const doc=this.get(id);doc.title=doc.title+' のコピー';doc.notes.forEach(n=>n.id=uid('note'));return this.add(doc)}
  create(){return this.add({title:'新しい曲',bpm:108,meter:[4,4],notes:[]})}
  save(document){const doc=normalize(document);if(this.isBuiltin(doc.id)||!this.users.has(doc.id))throw new Error('内蔵曲は上書きできません');this.users.set(doc.id,clone(doc));this.songs[doc.id]=toSong(doc);return this.persist()}
  remove(id){if(this.isBuiltin(id))throw new Error('内蔵曲は削除できません');this.users.delete(id);delete this.songs[id];return this.persist()}
  persist(){
   if(this.loadFailed){this.error='保存データの読み込みに失敗したため自動保存を停止しています。JSONで書き出してください。';return false}
   try{if(!this.storage)throw new Error('Storage unavailable');this.storage.setItem(this.key,JSON.stringify({version:VERSION,songs:[...this.users.values()]}));this.error='';return true}catch(error){this.error='ブラウザに保存できません。JSONで書き出して曲を保管してください。';return false}
  }
  export(document){return JSON.stringify({format:'pmg-song',version:VERSION,song:normalize(document)},null,2)}
  import(text){const data=JSON.parse(text);if(data.format!=='pmg-song'||data.version!==VERSION)throw new Error('PMGの曲ファイルを選んでください');return this.add(data.song)}
 }
 return {MAX_BEATS,MAX_NOTES,MIN_LENGTH,clone,uid,normalize,fromSong,toSong,playbackEvents,History,Library};
})();
if(typeof module!=='undefined')module.exports=SequencerModel;
