'use strict';
const ScoreEditor=(()=>{
 const M=SequencerModel,ROW=20,TOP=108,GUTTER=62,RULER=30;
 const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 const noteName=p=>names[p%12]+(Math.floor(p/12)-1);
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const rounded=v=>Math.round(v*10000)/10000;
 function mount(api){
  let storage;try{storage=localStorage}catch{}
  const library=new M.Library(api.songs,storage),histories=new Map();
  const panel=document.getElementById('score-editor'),picker=document.getElementById('song');
  let history,currentId,selection=new Set(),tool='select',px=56,cursor=0,clipboard=[],gesture,transport,raf=0,saveTimer;
  let draft=null;
  panel.innerHTML=`
   <div class="seq-header"><div class="seq-heading"><h2>ピアノロール</h2><span id="seq-badge" class="seq-badge"></span></div><div class="seq-tools"><button id="seq-new">＋ 新しい曲</button><button id="seq-copy">コピーして編集</button><button id="seq-close" aria-label="ピアノロールを閉じる">閉じる</button></div></div>
   <div class="seq-title-row"><input id="seq-title" aria-label="曲名" maxlength="100"><span id="seq-save-state" class="seq-save-state" role="status"></span></div>
   <p id="seq-notice" class="seq-notice"></p>
   <div class="seq-toolbar">
    <div class="seq-tools"><button id="seq-play" aria-label="カーソルから再生">▶ 再生</button><button id="seq-stop">■ 停止</button><button id="seq-rewind" aria-label="先頭へ戻る">|◀</button><output id="seq-position" class="seq-position">1.1.000</output><label><input id="seq-loop" type="checkbox">ループ</label></div>
    <div class="seq-tools"><label>BPM <input id="seq-bpm" type="number" min="20" max="300" step="1"></label><label>拍子 <select id="seq-meter"><option value="4/4">4/4</option><option value="2/2">2/2</option><option value="3/4">3/4</option><option value="3/2">3/2</option><option value="6/8">6/8</option><option value="12/8">12/8</option></select></label></div>
   </div>
   <div class="seq-toolbar">
    <div class="seq-tools"><button id="seq-select" aria-pressed="true" title="選択・移動 (V)">↖ 選択</button><button id="seq-draw" aria-pressed="false" title="音符を描く (P)">✎ 鉛筆</button><button id="seq-pan" aria-pressed="false" title="画面を移動 (H)">✋ 移動</button><label>グリッド <select id="seq-snap"><option value="0.125">1/32</option><option value="0.25" selected>1/16</option><option value="0.5">1/8</option><option value="1">1/4</option><option value="0">オフ</option></select></label><label>音符長 <select id="seq-length"><option value="0.125">1/32</option><option value="0.25">1/16</option><option value="0.5">1/8</option><option value="1" selected>1/4</option><option value="2">1/2</option><option value="4">全音符</option></select></label></div>
    <div class="seq-tools"><button id="seq-undo" aria-label="元に戻す" title="元に戻す (Ctrl / ⌘ Z)">↶</button><button id="seq-redo" aria-label="やり直す" title="やり直す (Ctrl / ⌘ Shift Z)">↷</button><button id="seq-quantize">クオンタイズ</button><button id="seq-delete">音符を削除</button></div>
    <div class="seq-tools"><label>ズーム <input id="seq-zoom" type="range" min="1" max="160" value="56"></label><button id="seq-fit">全体</button><button id="seq-save">保存</button><button id="seq-export">JSON書出</button><button id="seq-import">読込</button><button id="seq-remove">曲を削除</button><input id="seq-file" type="file" accept=".json,application/json" hidden></div>
   </div>
   <div id="seq-scroll" class="seq-scroll" tabindex="0" role="region" aria-label="ピアノロール。音符を選択し矢印キーで移動。Deleteで削除。" aria-describedby="seq-help"><div id="seq-roll" class="seq-roll"><div id="seq-grid" class="seq-grid"></div><div id="seq-playhead" class="seq-playhead"></div><div id="seq-piano" class="seq-piano"></div><div id="seq-ruler" class="seq-ruler"></div><div id="seq-corner" class="seq-corner">小節</div></div></div>
   <div class="seq-inspector"><span id="seq-selection-info" class="seq-selection-info">音符を選択</span><label>音程 <input id="seq-pitch" aria-label="選択音符の音程" placeholder="C4"></label><label>位置（拍）<input id="seq-at" type="number" min="0" max="4095" step="0.25"></label><label>長さ（拍）<input id="seq-duration" type="number" min="0.0078125" max="4096" step="0.25"></label><label>強さ <input id="seq-velocity" type="range" min="1" max="127" value="127"><output id="seq-velocity-out">127</output></label></div>
   <p id="seq-help" class="seq-help">空白をダブルクリック、または鉛筆で音符を追加。音符をドラッグで移動、右端で長さ変更。<kbd>Shift</kbd>＋クリック／空白のドラッグで複数選択。ルーラーで再生位置を指定。<br><kbd>V</kbd> 選択 · <kbd>P</kbd> 鉛筆 · <kbd>Space</kbd> 再生／停止 · <kbd>Delete</kbd> 削除 · <kbd>Ctrl / ⌘ C・V</kbd> コピー／貼り付け · <kbd>Ctrl / ⌘ Z</kbd> Undo<span id="seq-origin" class="seq-origin"></span></p>`;
  const $=id=>document.getElementById(id),scroll=$('seq-scroll'),grid=$('seq-grid'),roll=$('seq-roll'),ruler=$('seq-ruler');
  const readonly=()=>history?.readonly;
  const doc=()=>draft||history.current;
  const barBeats=()=>doc().meter[0]*4/doc().meter[1];
  const snap=()=>+$('seq-snap').value;
  const quantize=beat=>snap()?Math.round(beat/snap())*snap():beat;
  const minLength=()=>snap()||M.MIN_LENGTH;
  const endBeat=()=>Math.max(barBeats()*4,...doc().notes.map(n=>n.beat+n.duration));
  function message(text,error=false){$('seq-save-state').textContent=text;$('seq-save-state').dataset.error=error}
  function updateLibraryMenu(){
   let group=$('my-song-group');
   if(!group){group=document.createElement('optgroup');group.id='my-song-group';group.label='マイソング';picker.append(group)}
   group.replaceChildren();
   for(const d of library.users.values()){const option=document.createElement('option');option.value=d.id;option.textContent=d.title;group.append(option)}
   group.disabled=!library.users.size;
  }
  function save(){clearTimeout(saveTimer);if(!history||readonly())return;const picked=picker.value,ok=library.save(history.current);updateLibraryMenu();picker.value=picked;api.updateSong();message(ok?'このブラウザに保存済み':library.error,!ok)}
  function changed(){
   api.stop();selection=new Set([...selection].filter(id=>history.current.notes.some(n=>n.id===id)));api.songs[currentId]=M.toSong(history.current);api.updateSong();
   message('保存中…');clearTimeout(saveTimer);saveTimer=setTimeout(save,250);render();
  }
  function edit(change){if(readonly())return;try{if(history.edit(change))changed()}catch(error){message(error.message,true);render()}}
  function setPosition(beat){cursor=clamp(beat,0,M.MAX_BEATS);const bar=barBeats(),unit=4/doc().meter[1];$('seq-position').textContent=`${Math.floor(cursor/bar)+1}.${Math.floor((cursor%bar)/unit)+1}.${String(Math.round((cursor%unit)/unit*960)).padStart(3,'0')}`;$('seq-playhead').style.left=GUTTER+cursor*px+'px';const marker=$('seq-ruler-cursor');if(marker)marker.style.left=cursor*px+'px'}
  function sticky(){ $('seq-piano').style.transform=`translateX(${scroll.scrollLeft}px)`;ruler.style.transform=`translateY(${scroll.scrollTop}px)`;$('seq-corner').style.transform=`translate(${scroll.scrollLeft}px,${scroll.scrollTop}px)` }
  function renderNotes(){
   const frag=document.createDocumentFragment();
   for(const n of doc().notes){
    const button=document.createElement('div');button.className='seq-note'+(selection.has(n.id)?' selected':'');button.dataset.note=n.id;button.dataset.readonly=String(readonly());button.setAttribute('role','button');button.setAttribute('tabindex','-1');button.setAttribute('aria-label',`${noteName(n.pitch)}、${rounded(n.beat)}拍、長さ${rounded(n.duration)}拍、強さ${Math.round(n.velocity*127)}`);button.title=button.getAttribute('aria-label');
    Object.assign(button.style,{left:n.beat*px+'px',top:(TOP-n.pitch)*ROW+1+'px',width:Math.max(5,n.duration*px-1)+'px'});
    if(n.duration*px>28)button.append(document.createTextNode(noteName(n.pitch)));
    const handle=document.createElement('span');handle.className='seq-resize';button.append(handle);frag.append(button);
   }
   grid.replaceChildren(frag);
  }
  function inspector(){
   const selected=doc().notes.filter(n=>selection.has(n.id)),n=selected[0],single=selected.length===1;
   $('seq-selection-info').textContent=selected.length?`${selected.length}音を選択`:`${doc().notes.length}音`;
   for(const id of ['seq-pitch','seq-at','seq-duration'])$(id).disabled=readonly()||!single;
   $('seq-velocity').disabled=readonly()||!selected.length;
   $('seq-pitch').value=single?noteName(n.pitch):'';$('seq-at').value=single?rounded(n.beat):'';$('seq-duration').value=single?rounded(n.duration):'';
   $('seq-velocity').value=n?Math.round(n.velocity*127):127;$('seq-velocity-out').textContent=$('seq-velocity').value;
   $('seq-delete').disabled=readonly()||!selected.length;$('seq-quantize').disabled=readonly()||!selected.length||!snap();
   $('seq-undo').disabled=readonly()||!history.past.length;$('seq-redo').disabled=readonly()||!history.future.length;
  }
  function render(){
   const d=doc(),bar=barBeats(),beats=Math.min(M.MAX_BEATS,Math.ceil(endBeat()/bar)*bar+bar*2),width=beats*px;
   $('seq-title').value=d.title;$('seq-title').disabled=readonly();$('seq-bpm').value=d.bpm;$('seq-bpm').disabled=readonly();
   const meter=d.meter.join('/');if(![...$('seq-meter').options].some(o=>o.value===meter)){$('seq-meter').add(new Option(meter,meter))}$('seq-meter').value=meter;$('seq-meter').disabled=readonly();
   $('seq-badge').textContent=readonly()?'内蔵曲 · 読み取り専用':'マイソング';
   $('seq-copy').textContent=readonly()?'コピーして編集':'曲を複製';
   $('seq-notice').textContent=readonly()?'内蔵曲は変更できません。「コピーして編集」で自分の曲として編集できます。':'編集内容はこのブラウザに自動保存されます。別の端末へ移すときはJSONで書き出してください。';
   for(const id of ['seq-draw','seq-save','seq-remove'])$(id).disabled=readonly();
   $('seq-origin').textContent=d.source?`コピー元：${d.source.title} · ${d.source.credit} · ${d.source.license}`:'';
   roll.style.width=GUTTER+width+'px';roll.style.height=RULER+88*ROW+'px';grid.style.width=width+'px';grid.style.height=88*ROW+'px';grid.style.setProperty('--bar-px',bar*px+'px');grid.style.setProperty('--step-px',(snap()||1)*px+'px');grid.dataset.tool=tool;grid.dataset.readonly=String(readonly());
   ruler.style.width=width+'px';ruler.replaceChildren();
   // Thin out measure labels at low zoom while retaining true bar positions.
   const stride=Math.max(1,Math.ceil(45/(bar*px)));
   for(let at=0;at<beats;at+=bar*stride){const label=document.createElement('span');label.className='seq-bar';label.textContent=String(Math.round(at/bar)+1);label.style.left=at*px+'px';ruler.append(label)}
   const marker=document.createElement('span');marker.id='seq-ruler-cursor';marker.className='seq-ruler-cursor';ruler.append(marker);
   renderNotes();inspector();setPosition(cursor);sticky();
  }
  function load(id,reset=true){
   if(currentId&&history&&!readonly())save();api.stop();clearTimeout(saveTimer);draft=null;currentId=id;
   if(!histories.has(id))histories.set(id,new M.History(library.get(id),library.isBuiltin(id)));
   history=histories.get(id);selection.clear();if(reset)cursor=0;message(library.error|| (readonly()?'オリジナルを保護しています':'このブラウザに保存済み'),!!library.error);render();
   if(reset){scroll.scrollLeft=0;const notes=history.current.notes;const pitch=notes.length?[...notes].sort((a,b)=>a.pitch-b.pitch)[Math.floor(notes.length/2)].pitch:60;scroll.scrollTop=clamp((TOP-pitch)*ROW-scroll.clientHeight/2+RULER,0,88*ROW)}
  }
  function choose(id){api.showEditor?.();panel.hidden=false;updateLibraryMenu();picker.value=id;api.updateSong();load(id);$('open-editor').setAttribute('aria-expanded','true')}
  function open(){api.showEditor?.();panel.hidden=false;$('open-editor').setAttribute('aria-expanded','true');if(currentId!==picker.value)load(picker.value);else render();panel.scrollIntoView({behavior:'smooth',block:'start'})}
  function historyAction(action){if(readonly())return;if(history[action]())changed()}
  function deleteSelection(){if(!selection.size)return;edit(d=>d.notes=d.notes.filter(n=>!selection.has(n.id)))}
  function point(e){const r=grid.getBoundingClientRect();return {beat:clamp((e.clientX-r.left)/px,0,M.MAX_BEATS),pitch:clamp(TOP-Math.floor((e.clientY-r.top)/ROW),21,108),x:e.clientX-r.left,y:e.clientY-r.top}}
  function addNote(p){
   const beat=Math.max(0,quantize(p.beat)),duration=Math.min(+$('seq-length').value,M.MAX_BEATS-beat);if(duration<M.MIN_LENGTH)return;
   const n={id:M.uid('note'),beat,pitch:p.pitch,duration,velocity:1};selection=new Set([n.id]);edit(d=>d.notes.push(n));return n.id;
  }
  function setTool(next){tool=next;for(const t of ['select','draw','pan'])$('seq-'+t).setAttribute('aria-pressed',String(t===tool));grid.dataset.tool=tool}
  function shiftSelection(beats,pitches){
   edit(d=>{const chosen=d.notes.filter(n=>selection.has(n.id));if(!chosen.length)return;const deltaBeat=clamp(beats,-Math.min(...chosen.map(n=>n.beat)),M.MAX_BEATS-Math.max(...chosen.map(n=>n.beat+n.duration)));const deltaPitch=clamp(pitches,21-Math.min(...chosen.map(n=>n.pitch)),108-Math.max(...chosen.map(n=>n.pitch)));chosen.forEach(n=>{n.beat=rounded(n.beat+deltaBeat);n.pitch+=deltaPitch})});
  }
  grid.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();scroll.focus({preventScroll:true});const p=point(e),target=e.target.closest('[data-note]');
   if(tool==='pan'){gesture={kind:'pan',pointer:e.pointerId,x:e.clientX,y:e.clientY,left:scroll.scrollLeft,top:scroll.scrollTop};grid.setPointerCapture(e.pointerId);return}
   if(target){const id=target.dataset.note;if(e.shiftKey){selection.has(id)?selection.delete(id):selection.add(id)}else if(!selection.has(id))selection=new Set([id]);renderNotes();inspector();
    if(readonly()||!selection.has(id))return;
    api.stop();gesture={kind:e.target.closest('.seq-resize')?'resize':'move',base:M.clone(history.current),id,point:p,clientX:e.clientX,clientY:e.clientY,selection:new Set(selection),pointer:e.pointerId};
   }else if(tool==='draw'&&!readonly()){
    const base=M.clone(history.current),beat=quantize(p.beat),duration=Math.min(+$('seq-length').value,M.MAX_BEATS-beat);if(duration<M.MIN_LENGTH)return;
    api.stop();const note={id:M.uid('note'),beat,pitch:p.pitch,duration,velocity:1};draft=M.clone(base);draft.notes.push(note);selection=new Set([note.id]);gesture={kind:'draw',base,id:note.id,point:p,pointer:e.pointerId};renderNotes();inspector();
   }else{
    if(!e.shiftKey)selection.clear();gesture={kind:'marquee',point:p,selection:new Set(selection),pointer:e.pointerId};renderNotes();inspector();
   }
   grid.setPointerCapture(e.pointerId);
  });
  grid.addEventListener('pointermove',e=>{
   if(!gesture||gesture.pointer!==e.pointerId)return;const p=point(e),g=gesture;
   if(g.kind==='pan'){scroll.scrollLeft=g.left-(e.clientX-g.x);scroll.scrollTop=g.top-(e.clientY-g.y);return}
   if(g.kind==='marquee'){
    const left=Math.min(g.point.beat,p.beat),right=Math.max(g.point.beat,p.beat),low=Math.min(g.point.pitch,p.pitch),high=Math.max(g.point.pitch,p.pitch);
    selection=new Set(g.selection);for(const n of doc().notes)if(n.beat<right&&n.beat+n.duration>left&&n.pitch>=low&&n.pitch<=high)selection.add(n.id);
    renderNotes();const box=document.createElement('div');box.className='seq-marquee';Object.assign(box.style,{left:left*px+'px',top:(TOP-high)*ROW+'px',width:(right-left)*px+'px',height:(high-low+1)*ROW+'px'});grid.append(box);inspector();return;
   }
   if(g.kind!=='draw'&&Math.abs(e.clientX-g.clientX)+Math.abs(e.clientY-g.clientY)<3&&!draft)return;
   draft=M.clone(g.base);
   if(g.kind==='draw'){
    const start=quantize(g.point.beat),end=Math.max(start+minLength(),quantize(p.beat));draft.notes.push({id:g.id,beat:start,pitch:g.point.pitch,duration:Math.min(M.MAX_BEATS-start,end-start),velocity:1});
   }else{
    const anchor=g.base.notes.find(n=>n.id===g.id),chosen=draft.notes.filter(n=>g.selection.has(n.id));
    if(g.kind==='move'){
     const deltaBeat=clamp(quantize(anchor.beat+p.beat-g.point.beat)-anchor.beat,-Math.min(...chosen.map(n=>n.beat)),M.MAX_BEATS-Math.max(...chosen.map(n=>n.beat+n.duration)));
     const deltaPitch=clamp(p.pitch-g.point.pitch,21-Math.min(...chosen.map(n=>n.pitch)),108-Math.max(...chosen.map(n=>n.pitch)));
     chosen.forEach(n=>{n.beat=rounded(n.beat+deltaBeat);n.pitch+=deltaPitch});
    }else{
     let delta=quantize(anchor.beat+anchor.duration+p.beat-g.point.beat)-anchor.beat-anchor.duration;
     delta=clamp(delta,minLength()-Math.min(...chosen.map(n=>n.duration)),M.MAX_BEATS-Math.max(...chosen.map(n=>n.beat+n.duration)));chosen.forEach(n=>n.duration=Math.max(M.MIN_LENGTH,rounded(n.duration+delta)));
    }
   }
   renderNotes();inspector();
  });
  function finishGesture(cancel=false){
   if(!gesture)return;const next=draft;gesture=null;draft=null;
   if(!cancel&&next&&!readonly()){try{if(history.commit(next))changed();else render()}catch(error){message(error.message,true);render()}}else{renderNotes();inspector()}
  }
  grid.addEventListener('pointerup',()=>finishGesture());grid.addEventListener('pointercancel',()=>finishGesture(true));grid.addEventListener('lostpointercapture',()=>finishGesture());
  grid.addEventListener('dblclick',e=>{if(readonly()||tool!=='select')return;if(e.target.closest('[data-note]')){deleteSelection();return}addNote(point(e))});
  grid.addEventListener('contextmenu',e=>{e.preventDefault();const el=e.target.closest('[data-note]');if(el&&!readonly()){selection=new Set([el.dataset.note]);deleteSelection()}});
  ruler.addEventListener('pointerdown',e=>{if(e.button!==0)return;api.stop();const r=ruler.getBoundingClientRect();setPosition(Math.max(0,quantize((e.clientX-r.left)/px)));scroll.focus({preventScroll:true})});
  scroll.addEventListener('scroll',sticky,{passive:true});
  const piano=$('seq-piano');
  for(let pitch=TOP;pitch>=21;pitch--){const key=document.createElement('button');key.className='seq-piano-key'+([1,3,6,8,10].includes(pitch%12)?' black':'');key.textContent=noteName(pitch);key.title=noteName(pitch)+' を試聴';key.addEventListener('click',()=>api.audition(pitch));piano.append(key)}
  $('open-editor').addEventListener('click',open);
  $('copy-song').addEventListener('click',()=>{if(currentId!==picker.value)load(picker.value);if(!readonly())save();choose(library.duplicate(picker.value).id);panel.scrollIntoView({behavior:'smooth',block:'start'})});
  $('seq-close').textContent=api.closeEditor?'演奏画面へ':'閉じる';
  if(api.closeEditor)$('seq-close').setAttribute('aria-label','演奏画面へ戻る');
  $('seq-close').onclick=()=>{if(api.closeEditor){api.closeEditor();return}panel.hidden=true;$('open-editor').setAttribute('aria-expanded','false');$('open-editor').focus()};
  $('seq-new').onclick=()=>choose(library.create().id);
  $('seq-copy').onclick=()=>{if(!readonly())save();choose(library.duplicate(currentId).id)};
  $('seq-select').onclick=()=>setTool('select');$('seq-draw').onclick=()=>setTool('draw');$('seq-pan').onclick=()=>setTool('pan');
  $('seq-undo').onclick=()=>historyAction('undo');$('seq-redo').onclick=()=>historyAction('redo');$('seq-delete').onclick=deleteSelection;
  $('seq-quantize').onclick=()=>edit(d=>d.notes.filter(n=>selection.has(n.id)).forEach(n=>n.beat=clamp(quantize(n.beat),0,M.MAX_BEATS-n.duration)));
  $('seq-save').onclick=save;
  $('seq-title').onchange=()=>edit(d=>d.title=$('seq-title').value);
  $('seq-bpm').onchange=()=>edit(d=>d.bpm=+$('seq-bpm').value);
  $('seq-meter').onchange=()=>edit(d=>d.meter=$('seq-meter').value.split('/').map(Number));
  $('seq-snap').onchange=render;
  function zoom(value){const beatAtCenter=(scroll.scrollLeft+scroll.clientWidth/2-GUTTER)/px;px=value;$('seq-zoom').value=px;render();scroll.scrollLeft=Math.max(0,beatAtCenter*px-scroll.clientWidth/2+GUTTER)}
  $('seq-zoom').oninput=()=>zoom(+$('seq-zoom').value);
  $('seq-fit').onclick=()=>{zoom(clamp((scroll.clientWidth-GUTTER-30)/endBeat(),1,160));scroll.scrollLeft=0};
  $('seq-play').onclick=()=>transport?api.stop():api.play({fromBeat:cursor,loop:$('seq-loop').checked});
  $('seq-stop').onclick=()=>api.stop();$('seq-rewind').onclick=()=>{api.stop();setPosition(0);scroll.scrollLeft=0};
  $('seq-remove').onclick=()=>{if(readonly()||!confirm('「'+history.current.title+'」をこのブラウザから削除しますか？'))return;api.stop();clearTimeout(saveTimer);library.remove(currentId);histories.delete(currentId);history=null;currentId=null;updateLibraryMenu();choose('gavotte')};
  $('seq-export').onclick=()=>{const blob=new Blob([library.export(history.current)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=history.current.title.replace(/[\\/:*?"<>|]/g,'_')+'.pmg.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  $('seq-import').onclick=()=>$('seq-file').click();
  $('seq-file').onchange=async()=>{const file=$('seq-file').files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('曲ファイルは8MB以内で選んでください');const d=library.import(await file.text());updateLibraryMenu();choose(d.id)}catch(error){message('読み込めませんでした：'+error.message,true)}$('seq-file').value=''};
  function changeSingle(change){if(selection.size!==1)return;edit(d=>{const n=d.notes.find(n=>selection.has(n.id));if(n)change(n)})}
  $('seq-pitch').onchange=()=>{const match=/^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec($('seq-pitch').value.trim());if(!match){message('音程はC4、F#3などで入力してください',true);inspector();return}const pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1].toUpperCase()]+(['#','♯'].includes(match[2])?1:['b','♭'].includes(match[2])?-1:0);changeSingle(n=>n.pitch=(+match[3]+1)*12+pc)};
  $('seq-at').onchange=()=>changeSingle(n=>n.beat=+$('seq-at').value);
  $('seq-duration').onchange=()=>changeSingle(n=>n.duration=+$('seq-duration').value);
  $('seq-velocity').oninput=()=>$('seq-velocity-out').textContent=$('seq-velocity').value;
  $('seq-velocity').onchange=()=>edit(d=>d.notes.filter(n=>selection.has(n.id)).forEach(n=>n.velocity=+$('seq-velocity').value/127));
  function copyNotes(){clipboard=M.clone(doc().notes.filter(n=>selection.has(n.id)));message(clipboard.length+'音をコピーしました')}
  function paste(){if(readonly()||!clipboard.length)return;const first=Math.min(...clipboard.map(n=>n.beat)),last=Math.max(...clipboard.map(n=>n.beat+n.duration))-first;if(cursor+last>M.MAX_BEATS){message('貼り付け位置が曲の上限を超えています',true);return}const notes=clipboard.map(n=>({...n,id:M.uid('note'),beat:rounded(n.beat-first+cursor)}));selection=new Set(notes.map(n=>n.id));edit(d=>d.notes.push(...notes))}
  panel.addEventListener('keydown',e=>{
   if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;
   const cmd=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
   if(cmd&&key==='s'){e.preventDefault();save();return}
   if(cmd&&key==='z'){e.preventDefault();historyAction(e.shiftKey?'redo':'undo');return}
   if(cmd&&key==='y'){e.preventDefault();historyAction('redo');return}
   if(cmd&&key==='a'){e.preventDefault();selection=new Set(doc().notes.map(n=>n.id));renderNotes();inspector();return}
   if(cmd&&key==='c'){e.preventDefault();copyNotes();return}if(cmd&&key==='v'){e.preventDefault();paste();return}
   if(key===' '){e.preventDefault();$('seq-play').click();return}
   if(key==='delete'||key==='backspace'){e.preventDefault();deleteSelection();return}
   if(key==='escape'){selection.clear();renderNotes();inspector();return}
   if(cmd||e.altKey)return;
   if(key==='h')setTool('pan');if(key==='v')setTool('select');if(key==='p'&&!readonly())setTool('draw');
   const shifts={arrowleft:[-(snap()||.25),0],arrowright:[snap()||.25,0],arrowup:[0,e.shiftKey?12:1],arrowdown:[0,e.shiftKey?-12:-1]};
   if(shifts[key]){e.preventDefault();shiftSelection(...shifts[key])}
  });
  function transportBeat(){if(!transport)return cursor;const elapsed=Math.max(0,transport.clock()-transport.startTime)*transport.bpm/60,span=transport.endBeat-transport.fromBeat;return transport.loop?transport.fromBeat+(elapsed%span):Math.min(transport.endBeat,transport.fromBeat+elapsed)}
  function frame(){if(!transport)return;setPosition(transportBeat());if(!panel.hidden){const x=cursor*px+GUTTER;if(x>scroll.scrollLeft+scroll.clientWidth-35)scroll.scrollLeft=x-scroll.clientWidth*.3;else if(x<scroll.scrollLeft+GUTTER)scroll.scrollLeft=Math.max(0,x-GUTTER-px)}raf=requestAnimationFrame(frame)}
  function transportStop(){if(transport)setPosition(transportBeat());transport=null;cancelAnimationFrame(raf);$('seq-play').textContent='▶ 再生'}
  window.addEventListener('pagehide',()=>{if(history&&!readonly())save()});
  updateLibraryMenu();load(picker.value);
  return {
   save,
   songChanged(){load(picker.value)},
   transportStart(info){transportStop();transport=info;$('seq-play').textContent='■ 停止';cancelAnimationFrame(raf);frame()},
   transportStop,
   open,
   currentDocument(){return M.clone(history.current)}
  };
 }
 return {mount};
})();
