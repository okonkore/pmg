'use strict';
const PlaybackTiming=(()=>{
 function barNumbers(text){
  if(!String(text??'').trim())return [];
  const parts=String(text).trim().split(/[,、\s]+/);
  if(parts.some(s=>!/^\d+$/.test(s)||+s<1||+s>4096))throw Error('リタルダンドの小節番号は1〜4096の整数をカンマで区切ってください（例：4, 8, 12）');
  return [...new Set(parts.map(Number))];
 }
 function legacyRanges({bpm,endBeat,barBeats=4,ending=false,everyBars=0,bars='',ritBeats=2,endPercent=65}){
  const ends=new Set(),specified=barNumbers(bars);
  const every=Math.max(0,Math.min(4096,Math.floor(Number(everyBars)||0)));
  if(ending)ends.add(endBeat);
  for(const bar of specified){const end=bar*barBeats;if(end<=endBeat)ends.add(end)}
  if(every)for(let end=every*barBeats;end<=endBeat;end+=every*barBeats)ends.add(end);
  const width=Math.max(.25,Math.min(16,Number(ritBeats)||2)),factor=1/(Math.max(25,Math.min(95,Number(endPercent)||65))/100)-1;
  let previous=0;
  const ramps=[...ends].sort((a,b)=>a-b).filter(end=>end>0).map(end=>{const start=Math.max(previous,end-width,0);previous=end;return {start,end}});
  return ramps.map((r,i)=>({id:'legacy-'+i,startBeat:r.start,endBeat:r.end,targetBpm:bpm/(1+factor),after:'base',curve:'period'}));
 }
 function create(options){
  const {bpm,endBeat}=options;
  if(!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(endBeat)||endBeat<0)throw Error('テンポ・終端が正しくありません');
  const ramps=options.tempoChanges===undefined?legacyRanges(options):options.tempoChanges;
  // Validate at the timing boundary too: callers may supply a score without the editor.
  let previous=0,current=bpm,time=0;
  const segments=[];
  function add(start,end,from,to=from,curve='bpm'){
   if(end<=start)return;
   const width=end-start;
   const integral=x=>curve==='period'?60/from*x+(60/to-60/from)*x*x/(2*width):Math.abs(to-from)<1e-9?60/from*x:60*width/(to-from)*Math.log1p((to-from)*x/(width*from));
   segments.push({start,end,from,to,curve,time,integral});time+=integral(width);
  }
  for(const r of ramps){
   if(!r||!Number.isFinite(r.startBeat)||!Number.isFinite(r.endBeat)||r.startBeat<previous||r.endBeat<=r.startBeat||!Number.isFinite(r.targetBpm)||r.targetBpm<5||r.targetBpm>600||!['base','hold'].includes(r.after)||!['bpm','period'].includes(r.curve))throw Error('テンポ範囲が正しくありません');
   add(previous,r.startBeat,current);add(r.startBeat,r.endBeat,current,r.targetBpm,r.curve);
   previous=r.endBeat;current=r.after==='base'?bpm:r.targetBpm;
  }
  const tail={start:previous,time,bpm:current};
  function timeAt(beat){
   if(beat<=0)return 0;
   for(const s of segments)if(beat<s.end)return s.time+s.integral(beat-s.start);
   return tail.time+(beat-tail.start)*60/tail.bpm;
  }
  function bpmAt(beat){
   for(const s of segments)if(beat<s.end){const f=Math.max(0,(beat-s.start)/(s.end-s.start));return s.curve==='period'?60/((1-f)*60/s.from+f*60/s.to):s.from+(s.to-s.from)*f}
   return tail.bpm;
  }
  const duration=timeAt(endBeat);
  function beatAt(seconds){
   if(seconds<=0)return 0;if(seconds>=duration)return endBeat;
   let lo=0,hi=endBeat;for(let i=0;i<44;i++){const mid=(lo+hi)/2;if(timeAt(mid)<seconds)lo=mid;else hi=mid}return (lo+hi)/2;
  }
  return {timeAt,beatAt,bpmAt,duration};
 }
 return {create,barNumbers,legacyRanges};
})();
if(typeof module!=='undefined')module.exports=PlaybackTiming;
