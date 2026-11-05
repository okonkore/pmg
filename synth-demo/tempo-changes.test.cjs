const assert=require('node:assert/strict');
const M=require('./sequencer-model.js'),T=require('./playback-timing.js');
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const ramp=(startBeat,endBeat,targetBpm,after='hold',curve='bpm')=>({id:`${startBeat}`,startBeat,endBeat,targetBpm,after,curve});
const changes=[ramp(4,8,60),ramp(12,16,180,'base')];
const t=T.create({bpm:120,endBeat:20,tempoChanges:changes});
near(t.timeAt(4),2);near(t.timeAt(8),2+4*Math.log(2));near(t.timeAt(12),6+4*Math.log(2));
near(t.bpmAt(6),90);near(t.bpmAt(10),60);near(t.bpmAt(14),120);near(t.bpmAt(16),120);
for(let b=0;b<=20;b+=.03125)near(t.beatAt(t.timeAt(b)),b);
// Timing remains continuous at entry, target and abrupt BPM restoration boundaries.
for(const b of [4,8,12,16])assert.ok(t.timeAt(b+1e-7)-t.timeAt(b-1e-7)<1e-6);
const adj=T.create({bpm:120,endBeat:8,tempoChanges:[ramp(0,4,60),ramp(4,8,120)]});near(adj.bpmAt(4),60);near(adj.bpmAt(6),90);
const old={bpm:108,endBeat:31.5,barBeats:3,ending:true,everyBars:2,bars:'2, 5',ritBeats:4,endPercent:45};
const legacy=T.create(old),migrated=T.create({...old,tempoChanges:T.legacyRanges(old)});
for(let b=0;b<32;b+=.07)near(legacy.timeAt(b),migrated.timeAt(b));
near(T.create({...old,tempoChanges:[]}).timeAt(12),12*60/108);
const base={title:'Tempo test',bpm:120,meter:[4,4],notes:[{id:'n',beat:0,pitch:60,duration:20,velocity:1}],tempoChanges:changes};
const d=M.normalize(base);assert.deepEqual(d.tempoChanges,changes);assert.deepEqual(M.toSong(d).score.tempoChanges,changes);
assert.deepEqual(M.fromSong('test',M.toSong(d)).tempoChanges,changes);
for(const invalid of [[ramp(0,4,60),ramp(3,6,90)],[ramp(0,0,60)],[ramp(-1,4,60)],[ramp(0,4097,60)],[ramp(0,4,NaN)],[ramp(0,4,601)],[{...ramp(0,4,60),after:'oops'}]])assert.throws(()=>M.normalize({...base,tempoChanges:invalid}));
const h=new M.History(d);h.edit(x=>x.tempoChanges=[]);h.undo();assert.deepEqual(h.current.tempoChanges,changes);h.redo();assert.deepEqual(h.current.tempoChanges,[]);
const storage={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const lib=new M.Library({},storage),saved=lib.add(d);assert.equal(JSON.parse(lib.export(saved)).version,2);
assert.deepEqual(new M.Library({},storage).get(saved.id).tempoChanges,changes);
assert.deepEqual(lib.import(lib.export(saved)).tempoChanges,changes);
const v1={...base};delete v1.tempoChanges;assert.equal(lib.import(JSON.stringify({format:'pmg-song',version:1,song:v1})).tempoChanges,undefined);
assert.deepEqual(lib.create().tempoChanges,[]);
// Preserve old storage until a successful edit/save; unknown future formats remain protected.
const oldStorage={...storage,v:JSON.stringify({version:1,songs:[{...v1,id:'user-old'}]})};
const loaded=new M.Library({},oldStorage);assert.equal(loaded.get('user-old').tempoChanges,undefined);assert.equal(JSON.parse(oldStorage.v).version,1);
loaded.save(loaded.get('user-old'));assert.equal(JSON.parse(oldStorage.v).version,2);
console.log('Tempo curves, continuity, inversion, hold/reset, adjacency, legacy equivalence, validation, history and v1/v2 persistence passed.');
// Actual scheduler: seeking inside a ramp, loop reset, a held note crossing a boundary,
// and tempo-only silence extending the song beyond the last note.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),code=html.slice(html.indexOf('async function startSong('),html.indexOf("$('demo').onclick="));
(async()=>{
 const nodes={song:{value:'song'},status:{},demo:{}},clock={currentTime:0},played=[];let callback,info;
 const timing=T.create({bpm:120,endBeat:20,tempoChanges:changes});
 const score={bpm:120,events:[[0,60,16]],tempoChanges:[...changes,ramp(16,20,120)]};
 const scope=vm.createContext({playbackRun:0,demoEnds:0,demoTimer:0,ctx:clock,stop(){scope.playbackRun++},enable:async()=>{},SongPlaybackSettings:{get:()=>({rit:{ending:true,ritBeats:2,endPercent:25}})},songs:{song:{label:'test',score}},SequencerModel:M,PlaybackTiming:T,scoreEditor:{currentDocument:()=>({meter:[4,4],tempoChanges:score.tempoChanges}),transportStart:i=>info=i,transportStop(){}},isGuitar:()=>false,$:id=>nodes[id],play:(id,midi,time)=>({release:off=>played.push({midi,time,off})}),setTimeout:(fn,delay)=>{if(delay===25)callback=fn;return 1},voices:new Map(),refreshKeys(){},report:e=>{throw e}});
 vm.runInContext(code,scope);await scope.startSong({fromBeat:6});near(info.bpmAt(6),90);near(info.beatAt(timing.timeAt(8)-timing.timeAt(6)),8);
 near(played[0].off,.06+(timing.timeAt(16)-timing.timeAt(6))*.88);near(scope.demoEnds,.06+timing.timeAt(20)-timing.timeAt(6));
 clock.currentTime=0;played.length=0;await scope.startSong({fromBeat:6,loop:true});const length=timing.timeAt(20)-timing.timeAt(6);near(info.beatAt(length),6);clock.currentTime=length;callback();assert(played.some(p=>Math.abs(p.time-.06-length)<1e-8));
 console.log('Score-owned transport: legacy override, sustained-note seek, ramp clock/BPM, silent tail and loop reset passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
