// SMF 0/1, PPQN. Reference: Standard MIDI-File Format Spec. 1.1.
// https://midimusic.github.io/tech/midispec.html
(function(root){
 'use strict';
 const fail=message=>{throw new Error(message)};
 function parse(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length>8*1024*1024)fail('MIDI は8MB以内で選んでください');
  let pos=0,limit=bytes.length,events=0,noteCount=0;
  const need=n=>{if(n<0||pos+n>limit)fail('MIDI データが途中で切れています')};
  const byte=()=>{need(1);return bytes[pos++]};
  const u16=()=>byte()*256+byte();
  const u32=()=>byte()*16777216+byte()*65536+byte()*256+byte();
  const tag=()=>String.fromCharCode(byte(),byte(),byte(),byte());
  const vlq=()=>{let v=0;for(let i=0;i<4;i++){const b=byte();v=v*128+(b&127);if(!(b&128))return v}fail('MIDI の可変長数値が不正です')};
  if(tag()!=='MThd')fail('標準 MIDI ファイルではありません');
  const length=u32();need(length);if(length<6)fail('MIDI ヘッダーが不正です');
  const start=pos,format=u16(),count=u16(),ppqn=u16();pos=start+length;
  if(format>1)fail('MIDI 形式0・1に対応しています');
  if(!count||count>256||(format===0&&count!==1))fail('トラック数が不正です（最大256）');
  if(!ppqn||(ppqn&32768))fail('SMPTE 時間形式には対応していません');
  const tracks=[],tempos=[],meters=[];
  while(pos<bytes.length){
   limit=bytes.length;const type=tag(),size=u32();need(size);const end=pos+size;
   if(type!=='MTrk'){pos=end;continue}
   if(tracks.length>=count)fail('トラック数がヘッダーと一致しません');
   limit=end;let tick=0,status=0,ended=false;const active=new Map(),track={name:'',notes:[],warnings:[],endBeat:0};
   const warn=text=>{if(!track.warnings.includes(text))track.warnings.push(text)};
   while(pos<end){
    if(++events>500000)fail('MIDI イベント数が多すぎます');
    tick+=vlq();if(tick/ppqn>4096)fail('曲の長さは4096拍以内にしてください');
    let s=byte();if(s<128){if(!status)fail('ランニングステータスが不正です');pos--;s=status}
    if(s===255){
     status=0;const kind=byte(),n=vlq();if(kind>127)fail('MIDI メタイベント番号が不正です');need(n);const data=bytes.subarray(pos,pos+n);pos+=n;
     if(kind===47){if(n!==0||pos!==end)fail('トラック終端が不正です');ended=true;break}
     if(kind===3)track.name=new TextDecoder().decode(data.subarray(0,400)).replace(/[\x00-\x1f\x7f]/g,'').slice(0,100);
     if(kind===81){if(n!==3)fail('テンポ情報が不正です');const value=data[0]*65536+data[1]*256+data[2];if(!value)fail('テンポが不正です');tempos.push({tick,value})}
     if(kind===88){if(n===4&&data[3]!==8)fail('標準以外の拍子の音価指定には対応していません');if(n!==4||!data[0]||data[0]>16||data[1]<1||data[1]>4)fail('対応していない拍子です');meters.push({tick,value:[data[0],2**data[1]].join('/')})}
     continue;
    }
    if(s===240||s===247){status=0;const n=vlq();need(n);pos+=n;warn('SysEx は再現されません');continue}
    if(s<128||s>=240)fail('対応していない MIDI イベントです');
    status=s;const kind=s>>4,channel=s&15,a=byte(),b=kind===12||kind===13?0:byte();
    if(a>127||b>127)fail('MIDI データバイトが不正です');
    if(kind===9&&b){
     if(++noteCount>20000)fail('音符は20000個以内にしてください');
     const key=channel*128+a,q=active.get(key)||[];q.push({tick,pitch:a,velocity:b/127});active.set(key,q);
     if(channel===9)warn('打楽器チャンネルも選択中の楽器で演奏します');
    }else if(kind===8||kind===9){
     const key=channel*128+a,q=active.get(key);if(!q?.length)fail('対応する開始音のないノートオフがあります');
     const note=q.shift();track.notes.push({pitch:note.pitch,velocity:note.velocity,beat:note.tick/ppqn,duration:(tick-note.tick)/ppqn});
    }else warn('音色指定・ペダル・コントローラー・ピッチベンドは再現されません');
   }
   if(!ended)fail('トラック終端がありません');
   if([...active.values()].some(q=>q.length))fail('終了していない音符があります');
   track.endBeat=tick/ppqn;tracks.push(track);pos=end;
  }
  if(tracks.length!==count)fail('トラック数がヘッダーと一致しません');
  function fixed(items,fallback,label){
   items.sort((a,b)=>a.tick-b.tick);let value=items.find(e=>e.tick===0)?.value??fallback;
   if(items.some(e=>e.value!==value))fail('途中で'+label+'が変わる MIDI は未対応です。固定'+label+'のファイルを選んでください');
   return value;
  }
  const bpm=60000000/fixed(tempos,500000,'テンポ'),meter=fixed(meters,'4/4','拍子').split('/').map(Number);
  if(bpm<20||bpm>300)fail('テンポは20〜300 BPMの範囲で選んでください');
  return {format,ppqn,bpm,meter,tracks};
 }
 function documentFrom(parsed,indices,title){
  const selected=[...new Set(indices)].map(i=>parsed.tracks[i]);
  if(!selected.length||selected.some(t=>!t))fail('取り込むトラックを選んでください');
  const notes=selected.flatMap(t=>t.notes).sort((a,b)=>a.beat-b.beat||a.pitch-b.pitch);
  if(!notes.length)fail('選択したトラックに音符がありません');
  if(notes.length>20000)fail('音符は20000個以内にしてください');
  if(notes.some(n=>n.pitch<21||n.pitch>108||n.duration<1/128))fail('音域21〜108・長さ1/128拍以上の音符に対応しています');
  return {title:title.trim().slice(0,100)||'MIDI の曲',bpm:parsed.bpm,meter:parsed.meter,source:null,endBeat:Math.max(...selected.map(t=>t.endBeat)),notes:notes.map((n,i)=>({...n,id:'midi-'+i}))};
 }
 const api={parse,documentFrom};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PMGMidiImport=api;
})(globalThis);
