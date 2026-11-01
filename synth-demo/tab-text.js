// Plain text only: no changes to notes or automatic fingering.
(function(root){
 const planner=typeof module!=='undefined'&&module.exports?require('./tab-model.js'):root.PMGTab;
 const clean=v=>String(v).replace(/[\r\n\t\x00-\x1f\x7f]/g,' ');
 function render(doc,tab=(planner||root.PMGTab).plan(doc)){
  const out=[clean(doc.title),(tab.automatic?'自動運指案':'指定弦を優先した運指案')+' / '+doc.meter.join('/')+' / BPM '+doc.bpm,
   '調弦（6→1弦）: '+tab.tuning.map(n=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]+(Math.floor(n/12)-1)+'('+n+')').join(' '),
   '1弦が上。数字=フレット、~=持続、-=休止、|=小節境界、:=ブロック継続。1文字=1セル。a=10,b=11,…z=35。',
   '拍は四分音符=1、曲頭=0。指番号・声部分離は未対応。演奏可能性は保証しません。',
   `音符 ${tab.entries.length} / 未割当 ${tab.unassigned.length} / 広い押弦位置 ${tab.stretches.length}`];
  if(tab.entries.some(n=>n.string&&(!Number.isInteger(n.fret)||n.fret<0||n.fret>35)))out.push('警告: 0〜35外のフレットは文字表現できません（?）。音符一覧の値を確認してください。');
  if(tab.requiredTuning)out.push('曲の必要調弦を採用（音源の調弦は変更しません）。');
  for(const bar of tab.bars){
   const relevant=tab.entries.filter(n=>n.beat<bar.end&&n.beat+n.duration>bar.start);
   const points=[bar.start,bar.end,...relevant.flatMap(n=>[Math.max(bar.start,n.beat),Math.min(bar.end,n.beat+n.duration)])];
   const division=[4,8,12,16,24,32,48,64,96,128].find(d=>points.every(t=>Math.round(t*d)/d===t));
   const times=division?Array.from({length:Math.ceil((bar.end-bar.start)*division)},(_,i)=>(Math.round(bar.start*division)+i)/division):[...new Set(points)].filter(t=>t<bar.end).sort((a,b)=>a-b);
   out.push('',`小節 ${bar.number}: ${bar.start}〜${bar.end}拍 / ${division?'1セル=1/'+division+'拍':'不均等時間列（量子化なし）。各列の拍位置を参照'}`);
   for(let offset=0;offset<times.length;offset+=24){
    const part=times.slice(offset,offset+24),left=offset?':':'|',right=offset+24<times.length?':':'|';
    out.push(`列 ${offset+1}〜${offset+part.length} / 開始 ${part[0]}拍`);
    if(!division)out.push('列の拍位置: '+part.join(', '));
    for(let string=1;string<=6;string++)out.push(left+part.map(time=>{
     const n=relevant.find(n=>n.string===string&&n.beat<=time&&n.beat+n.duration>time);
     return n?(n.beat===time?(Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=35?n.fret.toString(36):'?'):'~'):'-';
    }).join('')+right);
    out.push('');
   }
  }
  out.push('音符一覧（元の開始・長さ。未割当音も省略しません）');
  for(const n of tab.entries)out.push(`#${n.index+1} 拍=${n.beat} 長さ=${n.duration} MIDI=${n.pitch}${n.stringNumber!==undefined?' 指定弦='+n.stringNumber:''} ${n.string?`${n.string}弦/${n.fret}フレット${n.stretch?' [広い押弦位置]':''}`:'未割当: '+n.reason}`);
  if(doc.source){out.push('','出典・ライセンス');for(const [k,v]of Object.entries(doc.source))if(typeof v==='string')out.push(clean(k)+': '+clean(v));}
  out.push('改変: 指定弦を優先し、未指定音の弦・フレットを自動割当。元の音高・開始・長さは変更していません。');
  if(out.length>2000)out.splice(6,0,`長い出力（${out.length}行）。省略せず表示しています。TXT保存での確認を推奨します。`);
  return out.join('\n')+'\n';
 }
 const api={render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PMGTabText=api;
})(globalThis);
