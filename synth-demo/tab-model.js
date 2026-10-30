// TAB planning only. Never feeds back into the song or sound model.
(function(root){
 const STANDARD=[40,45,50,55,59,64],EPS=1e-9;
 function plan(doc){
  const tuning=doc.source?.requiredTuning?.pitchesLowToHigh||STANDARD;
  if(!Array.isArray(tuning)||tuning.length!==6||!tuning.every(Number.isInteger))throw Error('調弦情報を確認してください');
  const notes=doc.notes.map((n,index)=>({...n,index})).sort((a,b)=>a.beat-b.beat||b.duration-a.duration||a.pitch-b.pitch);
  if(notes.length>20000)throw Error('TAB は20000音まで対応しています');
  const bar=doc.meter[0]*4/doc.meter[1],end=Math.max(doc.endBeat||0,...notes.map(n=>n.beat+n.duration),bar),barCount=Math.ceil((end-EPS)/bar);
  if(barCount>512)throw Error('この出力は512小節まで対応しています。曲データは変更していません。');
  let states=[{busy:Array(6).fill(null),position:0,cost:0,path:null}];
  for(const note of notes){
   const candidates=tuning.map((p,i)=>({string:6-i,fret:note.pitch-p,i})).filter(c=>c.fret>=0&&c.fret<=19);
   const next=[];
   for(const s of states){
    const busy=s.busy.map(n=>n&&n.end>note.beat+EPS?n:null);
    for(const c of candidates){if(busy[c.i])continue;
     const held=busy.filter(Boolean).map(n=>n.fret).filter(f=>f>0),frets=[...held,...(c.fret?[c.fret]:[])];const span=frets.length?Math.max(...frets)-Math.min(...frets):0;
     const b=busy.slice();b[c.i]={end:note.beat+note.duration,fret:c.fret};
     const entry={...note,string:c.string,fret:c.fret,stretch:span>4};next.push({busy:b,position:c.fret||s.position,cost:s.cost+Math.abs((c.fret||s.position)-s.position)*.8+c.fret*.15+Math.max(0,span-4)*8,path:{entry,previous:s.path}});
    }
    next.push({busy,position:s.position,cost:s.cost+10000,path:{entry:{...note,string:null,fret:null,reason:candidates.length?'保持音・同時音の弦競合':'調弦・0〜19フレットの範囲外'},previous:s.path}});
   }
   next.sort((a,b)=>a.cost-b.cost);states=next.slice(0,24);
  }
  const entries=[];for(let p=states[0].path;p;p=p.previous)entries.push(p.entry);entries.reverse();
  const bars=[];
  for(let i=0;i<barCount;i++){
   const start=i*bar,finish=Math.min(end,start+bar),here=entries.filter(n=>n.beat<finish-EPS&&n.beat+n.duration>start+EPS);
   const times=[...new Set([start,...here.filter(n=>n.beat>=start).map(n=>n.beat)])].sort((a,b)=>a-b);
   const intervals=here.map(n=>[Math.max(start,n.beat),Math.min(finish,n.beat+n.duration)]).sort((a,b)=>a[0]-b[0]);let at=start;const rests=[];for(const [a,b]of intervals){if(a>at+EPS)rests.push([at,a]);at=Math.max(at,b)}if(at<finish-EPS)rests.push([at,finish]);
   bars.push({number:i+1,start,end:finish,times,notes:here,rests});
  }
  return {tuning:[...tuning],requiredTuning:!!doc.source?.requiredTuning,entries,bars,unassigned:entries.filter(n=>!n.string),stretches:entries.filter(n=>n.stretch),automatic:true};
 }
 const api={plan,STANDARD};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PMGTab=api;
})(globalThis);
