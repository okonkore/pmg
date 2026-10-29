'use strict';
const assert=require('node:assert/strict'),T=require('./playback-timing.js'),M=require('./sequencer-model.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const fixed=T.create({bpm:120,endBeat:16});near(fixed.duration,8);near(fixed.timeAt(7),3.5);
const ending=T.create({bpm:120,endBeat:16,ending:true,ritBeats:2,endPercent:50});
near(ending.timeAt(14),7);near(ending.timeAt(15),7.625);near(ending.duration,8.5);
assert(ending.timeAt(16)-ending.timeAt(15)>ending.timeAt(15)-ending.timeAt(14));
const periodic=T.create({bpm:120,endBeat:32,everyBars:4,ritBeats:2,endPercent:50});
near(periodic.duration,17);near(periodic.timeAt(17)-periodic.timeAt(16),.5);
const specified=T.create({bpm:120,endBeat:32,bars:'4, 8',ritBeats:2,endPercent:50});near(periodic.duration,specified.duration);
const combined=T.create({bpm:120,endBeat:32,everyBars:4,bars:'4,8,999',ending:true,ritBeats:2,endPercent:50});near(combined.duration,17);
const compound=T.create({bpm:120,endBeat:12,barBeats:3,bars:'2',ritBeats:2,endPercent:50});near(compound.timeAt(6),3.5);near(compound.timeAt(7)-compound.timeAt(6),.5);
const overlap=T.create({bpm:120,endBeat:4,barBeats:1,everyBars:1,ritBeats:4,endPercent:50});near(overlap.duration,3);
const short=T.create({bpm:120,endBeat:.25,ending:true,ritBeats:4,endPercent:50});near(short.duration,.1875);
for(const timing of [fixed,ending,periodic,specified,combined,compound,overlap,short])for(let beat=0;beat<=Math.min(4,timing.beatAt(timing.duration));beat+=.03125)near(timing.beatAt(timing.timeAt(beat)),beat);
assert.deepEqual(T.barNumbers('4、8, 12 4'),[4,8,12]);for(const bad of ['0','-1','4.5','x','4097'])assert.throws(()=>T.barNumbers(bad),/小節番号/);
// Strum works in real seconds, including inside a ritardando.
const at=ending.timeAt(15),duration=ending.timeAt(16)-at;
const chord=M.playbackEvents([[at,60,duration],[at,64,duration],[at,67,duration]],60,{enabled:true,intervalMs:20});near(chord[1][0]-chord[0][0],.02);near(chord[2][0]+chord[2][2],ending.duration);
// Exercise the actual transport, from the middle of a slowdown and across a loop.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const startCode=html.slice(html.indexOf('async function startSong('),html.indexOf("$('demo').onclick="));
(async()=>{
 const nodes={song:{value:'song'},status:{},demo:{}},clock={currentTime:0},played=[];let callback,info;
 const scope=vm.createContext({playbackRun:0,demoEnds:0,demoTimer:0,ctx:clock,stop(){scope.playbackRun++},enable:async()=>{},SongPlaybackSettings:{get:()=>({rit:{ending:true,ritBeats:2,endPercent:50}})},songs:{song:{label:'test',score:{bpm:120,events:[[14,60,1],[15,64,1]]}}},SequencerModel:M,PlaybackTiming:T,scoreEditor:{currentDocument:()=>({meter:[4,4]}),transportStart:i=>info=i,transportStop(){}},isGuitar:()=>false,$:id=>nodes[id],play:(id,midi,time)=>{const v={release:off=>played.push({midi,time,off})};return v},setTimeout:(fn,delay)=>{if(delay===25)callback=fn;return 1},voices:new Map(),refreshKeys(){},report:e=>{throw e}});
 vm.runInContext(startCode,scope);await scope.startSong({fromBeat:14});near(info.beatAt(.625),15);
 clock.currentTime=.7;callback();near(played[0].time,.06);near(played[1].time,.685);near(scope.demoEnds,1.56);
 played.length=0;clock.currentTime=0;await scope.startSong({fromBeat:14,loop:true});near(info.beatAt(1.5),14);clock.currentTime=1.6;callback();assert(played.some(p=>Math.abs(p.time-1.56)<1e-8));
 console.log('Ritardando: end, periodic/explicit bars, meter, overlaps, inverse clock, fixed-ms strum, seeking and loop scheduling passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
