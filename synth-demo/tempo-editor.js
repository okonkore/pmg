'use strict';
// Score-owned tempo UI. Kept separate from note gestures and global playback preferences.
const TempoEditor=(()=>{
 function mount(api){
  const M=SequencerModel,$=id=>document.getElementById(id);
  const dialog=document.createElement('dialog');dialog.id='seq-tempo-dialog';dialog.className='tempo-dialog';dialog.setAttribute('aria-labelledby','tempo-title');
  dialog.innerHTML=`<h2 id="tempo-title">曲のテンポ変化</h2><button id="tempo-close" type="button">閉じる</button>
   <p>小節バーの下の「テンポ」行をドラッグして範囲を指定。範囲をタップすると編集できます。小さな範囲は下の一覧から選べます。</p>
   <p id="tempo-status"></p><div id="tempo-list"></div><button id="tempo-new" type="button">＋ 範囲を追加</button>
   <form id="tempo-form"><label>開始の小節位置 <input id="tempo-start" type="number" min="1" step="any" required></label><label>終了の小節位置 <input id="tempo-end" type="number" min="1" step="any" required></label>
   <small>1＝1小節の先頭、2＝2小節の先頭。1.5は1小節の中央。長さは4分音符の0.25拍以上。</small>
   <label>到達BPM <input id="tempo-target" type="number" min="5" max="600" step="any" required></label>
   <label>変化のしかた <select id="tempo-curve"><option value="bpm">BPMをなめらかに変える</option><option value="period">拍の時間をなめらかに変える（旧方式）</option></select></label>
   <label>範囲の後 <select id="tempo-after"><option value="hold">到達BPMを保つ</option><option value="base">曲の基本BPMに戻す</option></select></label>
   <small>開始BPMは直前のテンポを引き継ぎます。到達BPMが低ければ徐々に遅く、高ければ徐々に速くなります。「戻す」は終端で即座に復帰します。範囲の重なりは不可、隣接は可能です。</small>
   <p id="tempo-error" role="alert"></p><button id="tempo-apply" type="submit">曲に保存</button><button id="tempo-delete" type="button">この範囲を削除</button></form>
   <details id="tempo-legacy"><summary>以前の共通リタルダンド設定</summary><p>未移行の曲だけに適用される、このブラウザの共通設定です。「曲に取り込む」で現在の範囲と速さを保存できます。以後は共通設定の影響を受けません。</p><div id="tempo-legacy-slot"></div><button id="tempo-migrate" type="button">以前の設定を曲に取り込む</button></details>
   <button id="tempo-constant" type="button">すべての範囲をなくして基本BPMで再生</button><p>自動保存・元に戻すに対応。基本BPMや拍子を変えても、保存した到達BPMと拍位置は変わりません。範囲の終端まで曲の長さに含まれます。</p>`;
  document.body.append(dialog);$('tempo-legacy-slot').append($('legacy-rit-settings'));
  let selected=null,gesture=null,lastPx=56,initial=null;
  const bar=()=>api.doc().meter[0]*4/api.doc().meter[1];
  const ranges=()=>api.doc().tempoChanges||[];
  const position=x=>Math.round(x*1000000)/1000000;
  function commit(changes){
   try{const valid=M.normalizeTempoChanges(changes);api.edit(d=>d.tempoChanges=valid);return true}catch(e){$('tempo-error').textContent=e.message;return false}
  }
  function select(r){
   selected=r?.id||null;const start=r?.startBeat??Math.min(4095.75,Math.floor(api.cursor()/bar())*bar());
   $('tempo-start').value=position(1+start/bar());$('tempo-end').value=position(1+(r?.endBeat??Math.min(4096,start+bar()))/bar());
   initial={startBeat:start,endBeat:r?.endBeat??Math.min(4096,start+bar()),startValue:$('tempo-start').value,endValue:$('tempo-end').value};
   $('tempo-target').value=r?.targetBpm??Math.max(5,Math.round(api.doc().bpm*.75));$('tempo-after').value=r?.after||'hold';$('tempo-curve').value=r?.curve||'bpm';
   $('tempo-error').textContent='';$('tempo-delete').disabled=api.readonly()||!selected;
  }
  function refresh(){
   const d=api.doc(),legacy=d.tempoChanges===undefined;
   $('tempo-status').textContent=(api.readonly()?'内蔵曲です。「曲の設定・保存」からコピーして編集してください。 ':'')+`基本BPM ${d.bpm}。`+(legacy?'現在は以前の共通設定で再生しています。最初の範囲を保存すると曲専用に切り替わります。':`${ranges().length}個の範囲を曲に保存しています。`);
   for(const id of ['tempo-new','tempo-start','tempo-end','tempo-target','tempo-after','tempo-curve','tempo-apply','tempo-constant'])$(id).disabled=api.readonly();
   $('tempo-migrate').disabled=api.readonly()||!legacy;$('tempo-delete').disabled=api.readonly()||!selected;
   $('tempo-list').replaceChildren();
   for(const r of ranges()){const b=document.createElement('button');b.type='button';b.textContent=`${position(1+r.startBeat/bar())} → ${position(1+r.endBeat/bar())}小節：${position(r.targetBpm)} BPM${r.after==='base'?'・復帰':''}`;b.onclick=()=>select(r);$('tempo-list').append(b)}
  }
  function open(r){api.stop();refresh();select(r);if(!dialog.open)dialog.showModal()}
  $('seq-tempo').onclick=()=>open();$('tempo-close').onclick=()=>dialog.close();$('tempo-new').onclick=()=>select();
  $('tempo-form').onsubmit=e=>{
   e.preventDefault();if(api.readonly())return;
   const r={id:selected||M.uid('tempo'),startBeat:$('tempo-start').value===initial.startValue?initial.startBeat:position((Number($('tempo-start').value)-1)*bar()),endBeat:$('tempo-end').value===initial.endValue?initial.endBeat:position((Number($('tempo-end').value)-1)*bar()),targetBpm:Number($('tempo-target').value),after:$('tempo-after').value,curve:$('tempo-curve').value};
   if(commit([...ranges().filter(x=>x.id!==selected),r])){selected=r.id;refresh();dialog.close()}
  };
  $('tempo-delete').onclick=()=>{if(!api.readonly()&&commit(ranges().filter(r=>r.id!==selected))){select();refresh()}};
  $('tempo-constant').onclick=()=>{if(!api.readonly()&&commit([])){select();refresh()}};
  $('tempo-migrate').onclick=()=>{
   if(api.readonly()||api.doc().tempoChanges!==undefined)return;
   try{const d=api.doc(),endBeat=Math.max(d.endBeat||0,...d.notes.map(n=>n.beat+n.duration));const next=PlaybackTiming.legacyRanges({bpm:d.bpm,endBeat,barBeats:bar(),...SongPlaybackSettings.get().rit});if(commit(next)){select();refresh()}}catch(e){$('tempo-error').textContent=e.message}
  };
  // Pointer gestures are on a dedicated lane. The original ruler still scrubs/pinches.
  function wire(lane){
   lane.onpointerdown=e=>{if(e.button!==0)return;e.stopPropagation();e.preventDefault();if(gesture){gesture=null;return}gesture={id:e.pointerId,x:e.clientX,beat:Math.floor(Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/lastPx)/bar())*bar(),target:e.target.closest('[data-tempo]')?.dataset.tempo};lane.setPointerCapture(e.pointerId)};
   lane.onpointermove=e=>{if(!gesture||gesture.id!==e.pointerId)return;const end=(Math.floor(Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/lastPx)/bar())+1)*bar();lane.style.setProperty('--selection-start',Math.min(gesture.beat,end-bar())*lastPx+'px');lane.style.setProperty('--selection-width',(Math.abs(end-bar()-gesture.beat)+bar())*lastPx+'px');lane.dataset.dragging='true'};
   lane.onpointerup=e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;delete lane.dataset.dragging;e.stopPropagation();
    if(Math.abs(e.clientX-g.x)<8&&g.target){open(ranges().find(r=>r.id===g.target));return}
    const at=Math.floor(Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/lastPx)/bar())*bar();open({startBeat:Math.min(4095.75,g.beat,at),endBeat:Math.min(4096,Math.max(g.beat,at)+bar()),targetBpm:Math.max(5,Math.round(api.doc().bpm*.75))});
   };
   lane.onpointercancel=lane.onlostpointercapture=()=>{gesture=null;delete lane.dataset.dragging};
   lane.onclick=e=>{e.stopPropagation();if(e.detail===0&&e.target.dataset.tempo)open(ranges().find(r=>r.id===e.target.dataset.tempo))};
  }
  function render(ruler,px){
   lastPx=px;gesture=null;
   const lane=document.createElement('div');lane.className='seq-tempo-lane';lane.id='seq-tempo-lane';lane.setAttribute('aria-label','テンポ範囲。ドラッグして小節を選択');
   const hint=document.createElement('span');hint.className='tempo-hint';hint.textContent=api.doc().tempoChanges===undefined?'テンポ：以前の共通設定':'テンポ：ドラッグで範囲を追加';lane.append(hint);
   let from=api.doc().bpm;
   for(const r of ranges()){const chip=document.createElement('button');chip.type='button';chip.className='seq-tempo-range';chip.dataset.tempo=r.id;chip.style.left=r.startBeat*px+'px';chip.style.width=(r.endBeat-r.startBeat)*px+'px';chip.textContent=`${r.targetBpm<from?'↘':r.targetBpm>from?'↗':'→'} ${position(r.targetBpm)} BPM${r.after==='base'?' ↩':''}`;chip.title=chip.textContent;chip.setAttribute('aria-label',`${position(1+r.startBeat/bar())}から${position(1+r.endBeat/bar())}小節、到達${r.targetBpm} BPM`);lane.append(chip);from=r.after==='base'?api.doc().bpm:r.targetBpm}
   wire(lane);ruler.append(lane);
  }
  return {render,cancel(){gesture=null;const lane=$('seq-tempo-lane');if(lane)delete lane.dataset.dragging}};
 }
 return {mount};
})();
