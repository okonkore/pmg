'use strict';
// Self-review: real catalog/startSong/play/voice helpers and instrument loaders,
// with a deterministic audio clock and no-op audio graph. No PCM/listening claims.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const M=require('./sequencer-model'),T=require('./playback-timing');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const catalog=vm.createContext({});for(const f of ['gavotte','prelude','bach-solos','bach-1012','sor-op60','sor-op6','repertoire-batch1','repertoire-batch2','repertoire-batch3','repertoire-batch4','repertoire-batch5','repertoire-batch6','repertoire-batch7','bwv1006a-complete','bwv1009-complete','bwv1004-chaconne','bwv1004-complete','catalog-quality'])vm.runInContext(fs.readFileSync(path.join(__dirname,f+'.js'),'utf8'),catalog);
const els=new Map(),element=()=>({value:'',textContent:'',children:[],append(x){this.children.push(x)}});
catalog.document={getElementById(id){if(!els.has(id))els.set(id,element());return els.get(id)},createElement:element};vm.runInContext(inline.slice(0,inline.indexOf('const presets=')),catalog);const songs=vm.runInContext('songs',catalog);
function wavDuration(data){let pos=12,byteRate;while(pos+8<=data.length){const n=data.readUInt32LE(pos+4),id=data.toString('ascii',pos,pos+4);if(id==='fmt ')byteRate=data.readUInt32LE(pos+16);if(id==='data')return n/byteRate;pos+=8+n+(n%2)}throw Error('WAV data missing')}
async function run(key,mode,{loop=false,fromBeat=0,rit={},strum=false}={}){
 let now=0,next=1,inPlay=false;const timers=new Map(),calls=[],steals=[],natural=[];
 const schedule=(fn,ms)=>{const id=next++;timers.set(id,{at:now+Math.max(0,ms)/1000,fn});return id};
 const param=()=>new Proxy({value:0},{get:(o,k)=>k in o?o[k]:()=>{}});
 function node(){return {gain:param(),frequency:param(),Q:param(),detune:param(),playbackRate:{value:1},connect(n){return n},disconnect(){},setPeriodicWave(){}}}
 const ctx={get currentTime(){return now},sampleRate:44100,destination:{},createGain:node,createBiquadFilter:node,createPeriodicWave:()=>({}),decodeAudioData:async data=>({duration:wavDuration(Buffer.from(data))})};
 function source(buffered){const n=node();let pending;
  function end(at){if(pending)timers.delete(pending);pending=schedule(()=>n.onended?.(),(at-now)*1000)}
  n.start=at=>{if(buffered)end(at+n.buffer.duration/n.playbackRate.value)};
  n.stop=(at=now)=>end(at);return n;
 }
 ctx.createOscillator=()=>source(false);ctx.createBufferSource=()=>source(true);
 const controls={song:{value:key},release:{value:'.55'},cutoff:{value:'6500'}};
 const scope=vm.createContext({ctx,bus:{},preset:mode,presets:{pluck:{attack:.005,decay:.65,sustain:.045,detune:4,wave:'triangle',sub:.15,resonance:3},pad:{attack:.48,decay:.7,sustain:.8,detune:15,wave:'sawtooth',sub:.16,resonance:.7},guitar520r:{engine:'520r'},whole:{engine:'whole-shell'}},songs,SequencerModel:M,PlaybackTiming:T,SongPlaybackSettings:{get:()=>({enabled:strum,intervalMs:20,direction:'down',rit})},voices:new Map(),allVoices:new Set(),playbackRun:0,demoEnds:0,demoTimer:0,refreshKeys(){},noteName:String,presetsName:()=>mode,$:id=>controls[id]||(controls[id]={}),setTimeout:schedule,clearTimeout:id=>timers.delete(id),enable:async()=>{},isGuitar:()=>false,report:e=>{throw e},scoreEditor:{currentDocument:()=>M.fromSong(key,songs[key]),transportStart(o){scope.transport=o},transportStop(){}}});
 scope.stop=()=>{scope.playbackRun++;scope.demoEnds=0;timers.clear();for(const v of [...scope.allVoices])v.kill();scope.voices.clear()};
 if(mode==='pad')controls.release.value='1.7';
 for(const [name,folder] of [['guitar520rInstrument','guitar-520r-spruce'],['wholeShellInstrument','guitar-whole-shell']])if((mode==='guitar520r')===(name==='guitar520rInstrument')){
  const file=path.join(__dirname,'instruments',folder,'instrument.js');const src=fs.readFileSync(file,'utf8').replace('export async function','async function').replaceAll('import.meta.url',JSON.stringify('file://'+file));
  const loader=vm.createContext({URL,fetch:async url=>{const p=new URL(url);p.search='';const data=fs.readFileSync(p);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}}});vm.runInContext(src+';this.load=loadGuitar',loader);scope[name]=await loader.load(ctx,{destination:{}});
 }
 vm.runInContext(inline.slice(inline.indexOf('function play('),inline.indexOf('function isPhysical(')),scope);
 vm.runInContext(inline.slice(inline.indexOf('function playWholeShell('),inline.indexOf('function presetsName(')),scope);
 const actual=scope.play;scope.play=(id,midi,when,velocity)=>{inPlay=true;const v=actual(id,midi,when,velocity);inPlay=false;assert(v,'Every event receives a distinct voice');const rec={id,midi,when,gate:null};calls.push(rec);const kill=v.kill.bind(v),release=v.release.bind(v);v.kill=()=>{if(!rec.cleaned&&!inPlay&&now<rec.gate-1e-8)natural.push({id,midi,at:now,gate:rec.gate});if(!rec.cleaned&&inPlay)steals.push({id,midi,at:now,beforeAttack:now<when,beforeGate:now<rec.gate});rec.cleaned=true;return kill()};v.release=at=>{rec.gate=at;return release(at)};return v};
 vm.runInContext(inline.slice(inline.indexOf('async function startSong('),inline.indexOf("$('demo').onclick")),scope);
 await scope.startSong({loop,fromBeat});const length=T.create({bpm:songs[key].score.bpm,endBeat:scope.transport.endBeat,barBeats:scope.transport.endBeat?M.fromSong(key,songs[key]).meter[0]*4/M.fromSong(key,songs[key]).meter[1]:4,...rit}).duration;
 const horizon=loop?scope.transport.startTime+2*length-.001:length+2;
 while(timers.size){let id,entry;for(const [k,t] of timers)if(!entry||t.at<entry.at){id=k;entry=t}if(entry.at>horizon)break;timers.delete(id);now=entry.at;entry.fn();assert(next<500000,'Bounded timer processing')}
 const expected=songs[key].score.events.filter(([a,p,d])=>a+d>fromBeat).length;
 if(!loop){assert.equal(calls.length,expected,key+' schedules every event');assert.equal(scope.demoEnds,0)}else assert.equal(calls.filter(c=>c.id.startsWith('d1-')).length,expected);
 if(!strum&&!Object.keys(rit).length){const events=songs[key].score.events.filter(([a,p,d])=>a+d>fromBeat),seconds=60/songs[key].score.bpm;for(const [i,e] of events.entries()){const [a,p,d]=e,c=calls[i],offset=Math.max(a,fromBeat)-fromBeat;assert.equal(c.midi,p);assert(Math.abs(c.when-(.06+offset*seconds))<1e-8,key+' onset/tempo');assert(Math.abs(c.gate-(c.when+(a+d-Math.max(a,fromBeat))*seconds*.88))<1e-8,key+' duration/gate')}}
 assert.equal(new Set(calls.map(c=>c.id)).size,calls.length,'Same-pitch voices use distinct event IDs');
 if(key==='chaconne1004'&&!loop&&!fromBeat&&!strum&&!Object.keys(rit).length){assert.equal(length,770);assert.equal(calls.length,3123);for(const beat of [0,264,395,599,623,767])assert(calls.some(c=>Math.abs(c.when-(.06+beat))<1e-8),'Chaconne full-form checkpoint '+beat);assert.equal(calls.filter(c=>Math.abs(c.when-(.06+767))<1e-8).length,2,'Final independent unison voices');}
 if(key==='carcassi60_9'&&!loop&&!fromBeat&&!strum&&!Object.keys(rit).length){assert.equal(length,124);for(const beat of [0,32,108,140,216,246])assert(calls.some(c=>Math.abs(c.when-(.06+beat*.5))<1e-8),'Form checkpoint '+beat);assert(calls.every(c=>c.gate<=.06+124));}
 return {key,mode,scheduled:calls.length,naturalBeforeGate:natural.length,steals:steals.length,beforeGate:steals.filter(s=>s.beforeGate).length,beforeAttack:steals.filter(s=>s.beforeAttack).length};
}
(async()=>{const results=[];for(const key of Object.keys(songs))for(const mode of ['pluck','pad','guitar520r','whole'])results.push(await run(key,mode));
 for(const [key,fromBeat] of [['allemande1004',192.75],['courante1004',234.75],['sarabanda1004',144],['giga1004',360]]){await run(key,'guitar520r',{loop:true});await run(key,'guitar520r',{fromBeat});}
 await run('chaconne1004','guitar520r',{loop:true});await run('chaconne1004','guitar520r',{fromBeat:623});
 await run('carcassi60_9','guitar520r',{loop:true});await run('carcassi60_9','guitar520r',{fromBeat:216});await run('carcassi60_9','guitar520r',{strum:true,rit:{ending:true,endPercent:60,ritBeats:4}});
 for(const [key,song] of Object.entries(songs)){const source=M.fromSong(key,song).source;assert(source.licenseUrl&&source.modifications&&source.terms,key+' exported rights/change notice');for(const [field,value] of Object.entries(song.source)){if(typeof value==='string'){assert(value.length<=500,key+' '+field);assert.equal(source[field],value)}}const lib=new M.Library({}, {getItem:()=>null,setItem(){}});assert.deepEqual(lib.import(lib.export(lib.add(M.fromSong(key,song)))).source,source)}
 const polyphony=Object.entries(songs).map(([key,song])=>{const points=song.score.events.flatMap(([a,p,d])=>[[a,1,p],[a+d,-1,p]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let live=0,peak=0,samePitchPeak=0;const pitches=new Map();for(const [at,delta,p] of points){live+=delta;pitches.set(p,(pitches.get(p)||0)+delta);peak=Math.max(peak,live);samePitchPeak=Math.max(samePitchPeak,pitches.get(p))}assert(peak<=12);return {key,peak,samePitchPeak}});assert(results.filter(r=>r.mode==='guitar520r').every(r=>r.steals===0));
 const malicious=M.fromSong('probe',songs.sor1_6);malicious.source.credit='<img src=x onerror=alert(1)>';malicious.source.url='javascript:alert(1)';const lib=new M.Library({}, {getItem:()=>null,setItem(){}});assert.equal(lib.import(lib.export(lib.add(malicious))).source.credit,malicious.source.credit);assert(html.includes('seq')&&fs.readFileSync(path.join(__dirname,'sequencer.js'),'utf8').includes("$('seq-origin').textContent="),'Source display is plain text');assert.equal(M.normalize({...malicious,source:{...malicious.source,credit:'x'.repeat(501)}}).source.credit.length,500);
 const report={polyphony,selfReview:true,method:'Actual app scheduler, allocator, oscillator voice and sample loaders; deterministic mock AudioContext, real WAV durations; no PCM audibility claim.',results};if(process.env.PMG_PLAYBACK_AUDIT_REPORT)fs.writeFileSync(process.env.PMG_PLAYBACK_AUDIT_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log('PASS: all55 complete schedules ×4 presets; Carcassi fullform/2 loops/seek/strum+rit; source length and JSON metadata.');for(const mode of ['pluck','pad','guitar520r','whole']){const r=results.filter(r=>r.mode===mode);console.log(mode,JSON.stringify({piecesWithSteals:r.filter(r=>r.steals).length,totalSteals:r.reduce((n,r)=>n+r.steals,0),beforeGate:r.reduce((n,r)=>n+r.beforeGate,0),beforeAttack:r.reduce((n,r)=>n+r.beforeAttack,0),naturalBeforeGate:r.reduce((n,r)=>n+r.naturalBeforeGate,0),carcassi:r.find(r=>r.key==='carcassi60_9')}))}
})().catch(e=>{console.error(e);process.exitCode=1});
