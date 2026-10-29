'use strict';
const PlaybackTiming=(()=>{
 function barNumbers(text){
  if(!String(text??'').trim())return [];
  const parts=String(text).trim().split(/[,、\s]+/);
  if(parts.some(s=>!/^\d+$/.test(s)||+s<1||+s>4096))throw Error('リタルダンドの小節番号は1〜4096の整数をカンマで区切ってください（例：4, 8, 12）');
  return [...new Set(parts.map(Number))];
 }
 function create({bpm,endBeat,barBeats=4,ending=false,everyBars=0,bars='',ritBeats=2,endPercent=65}){
  const base=60/bpm,ends=new Set(),specified=barNumbers(bars);
  const every=Math.max(0,Math.min(4096,Math.floor(Number(everyBars)||0)));
  if(ending)ends.add(endBeat);
  for(const bar of specified){const end=bar*barBeats;if(end<=endBeat)ends.add(end)}
  if(every)for(let end=every*barBeats;end<=endBeat;end+=every*barBeats)ends.add(end);
  const width=Math.max(.25,Math.min(16,Number(ritBeats)||2)),factor=1/(Math.max(25,Math.min(95,Number(endPercent)||65))/100)-1;
  let previous=0;
  const ramps=[...ends].sort((a,b)=>a-b).filter(end=>end>0).map(end=>{const start=Math.max(previous,end-width,0);previous=end;return {start,end}});
  function timeAt(beat){
   let time=beat*base;
   for(const r of ramps){const x=Math.max(0,Math.min(beat-r.start,r.end-r.start));time+=base*factor*x*x/(2*(r.end-r.start))}
   return time;
  }
  const duration=timeAt(endBeat);
  function beatAt(seconds){
   if(seconds<=0)return 0;if(seconds>=duration)return endBeat;
   let lo=0,hi=endBeat;for(let i=0;i<44;i++){const mid=(lo+hi)/2;if(timeAt(mid)<seconds)lo=mid;else hi=mid}return (lo+hi)/2;
  }
  return {timeAt,beatAt,duration};
 }
 return {create,barNumbers};
})();
if(typeof module!=='undefined')module.exports=PlaybackTiming;
