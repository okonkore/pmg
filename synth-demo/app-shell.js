import {renderTab} from './tab-output.js';
import './midi-import.js?v=range-skip-1';
import './configured-guitar-app.js?v=preparation-tiles-1';

// Presentation only: move existing controls, keeping their handlers, values and model ownership.
const byId=id=>document.getElementById(id);
const main=document.querySelector('main');
const make=(tag,className,html='')=>{const el=document.createElement(tag);el.className=className;el.innerHTML=html;return el};
const move=(target,...ids)=>ids.forEach(id=>target.append(byId(id)));
const shell=make('main','app-shell');shell.id='app-shell';
const header=make('header','app-header','<div><span class="app-brand">PMG</span><h1 id="app-heading">演奏</h1></div><div class="app-header-actions"><button id="app-mixer" aria-label="音色の詳細">音色</button><button id="app-menu" aria-label="メニュー" aria-haspopup="dialog">•••</button></div>');
const statusBar=make('div','app-status');move(statusBar,'status');
const songBar=make('div','app-song-bar');move(songBar,'song-picker');
const content=make('div','app-content');
const nav=make('nav','app-nav');nav.setAttribute('aria-label','メインナビゲーション');
const routes={performance:'演奏','piano-roll':'編集',library:'曲',instrument:'楽器'};
nav.innerHTML=Object.entries(routes).map(([id,label])=>`<button data-route="${id}" id="nav-${id}"><span aria-hidden="true">${{performance:'♬','piano-roll':'▤',library:'♫',instrument:'♮'}[id]}</span>${label}</button>`).join('');
main.before(shell);shell.append(header,statusBar,songBar,content,nav);
move(content,'performance-screen','score-editor');
const library=make('section','app-library app-scroll','<div class="app-section-heading"><h2>曲ライブラリ</h2><button id="library-new">＋ 新しい曲</button></div><label class="app-search">曲を探す<input id="library-search" type="search" placeholder="曲名・作曲者" autocomplete="off"></label><div id="library-list" class="library-list"></div><p id="library-empty" hidden>一致する曲がありません</p>');library.id='library-screen';
const instrument=make('section','app-instrument app-scroll','<div class="app-section-heading"><h2>楽器</h2><button id="instrument-details">音源について</button></div>');instrument.id='instrument-screen';
content.append(library,instrument);
const dialogs=new Map();
function dialog(id,title){
 const el=make('dialog','app-dialog',`<div class="app-dialog-header"><h2 id="${id}-title">${title}</h2><button data-dismiss aria-label="${title}を閉じる">閉じる</button></div><div class="app-dialog-body app-scroll"></div>`);
 el.id=id;el.setAttribute('aria-labelledby',id+'-title');document.body.append(el);dialogs.set(id,el);
 el.querySelector('[data-dismiss]').onclick=()=>dismiss(el);
 el.addEventListener('cancel',e=>{e.preventDefault();dismiss(el)});
 el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss(el)}});
 return el.lastElementChild;
}
const menu=dialog('app-menu-dialog','メニュー');
menu.innerHTML='<button data-panel="playback-dialog">再生設定</button><button data-panel="song-dialog">曲の設定・保存</button><button data-panel="tab-dialog">TAB譜・印刷</button><button data-panel="help-dialog">使い方・出典</button>';
const mixer=dialog('mixer-dialog','音色の詳細');mixer.append(document.querySelector('#performance-screen > .controls'));
const playback=dialog('playback-dialog','再生設定');move(playback,'song-playback-settings');
const songSettings=dialog('song-dialog','曲の設定・保存');
const editorSettings=dialog('editor-settings-dialog','グリッド・表示');
const noteSettings=dialog('note-dialog','選択した音符');
const midiBody=dialog('midi-dialog','MIDI 読込');
const tabBody=dialog('tab-dialog','TAB譜・印刷');
const tabPrint=make('button','tab-print','印刷・PDF保存');tabPrint.onclick=()=>window.print();
const tabDocument=make('article');tabDocument.id='tab-document';tabBody.append(tabPrint,tabDocument);
function refreshTab(){stop();try{renderTab(tabDocument,scoreEditor.currentDocument());tabPrint.disabled=false}catch(error){tabDocument.replaceChildren(make('p'));tabDocument.firstChild.textContent=error.message;tabPrint.disabled=true}}
const help=dialog('help-dialog','使い方・出典');
const instrumentHelp=dialog('instrument-help-dialog','音源について');
move(instrumentHelp,'preset-info');
// Explanations and source links stay available, without occupying the playing surface.
const helpSection=(title)=>{const section=make('section','help-section',`<h3>${title}</h3>`);help.append(section);return section};
move(helpSection('選択中の曲'),'song-info');
move(helpSection('ピアノロール'),'seq-help','seq-notice');
move(helpSection('音源・楽譜の出典'),'performance-footer');byId('performance-footer').hidden=false;
for(const el of [...document.querySelectorAll('#performance-screen > .hint')])helpSection('鍵盤の操作').append(el);
const playbackHelp=helpSection('再生設定');for(const el of [...playback.querySelectorAll('small')])playbackHelp.append(el);
// Instrument-specific controls are their original DOM nodes, including dynamically added guitar controls.
instrument.append(document.querySelector('.preset-picker'));
for(const el of [...document.querySelectorAll('#performance-screen > .guitar-controls')]){
 instrument.append(el);
 for(const hint of [...el.querySelectorAll(':scope > .hint')])if(!hint.id)instrumentHelp.append(hint);
}
// Preparation concurrency/benchmark remain secondary settings, with their warnings intact.
for(const el of document.querySelectorAll('.configured-performance')){
 const details=make('details','app-advanced','<summary>音源準備の詳細・速度計測</summary>');el.before(details);details.append(el);
}
// Preserve existing editor actions; distribute them between a compact toolbar and focused sheets.
const editor=byId('score-editor'),toolbars=[...editor.querySelectorAll(':scope > .seq-toolbar')];
const tools=make('div','app-editor-tools');editor.prepend(tools);tools.setAttribute('aria-label','編集ツール');
move(tools,'seq-select','seq-draw','seq-pan','seq-undo','seq-redo');
tools.insertAdjacentHTML('beforeend','<button data-panel="note-dialog">音符</button>');
const transport=toolbars[0];
move(songSettings,'seq-new','seq-copy');songSettings.append(editor.querySelector('.seq-title-row'));
songSettings.append(byId('seq-bpm').closest('.seq-tools'));
const fileActions=make('div','app-file-actions');move(fileActions,'seq-save','seq-export','seq-import','seq-remove','seq-file');songSettings.append(fileActions);
for(const id of ['seq-snap','seq-length','seq-zoom'])editorSettings.append(byId(id).closest('label'));
move(editorSettings,'seq-fit','seq-quantize','seq-delete');
noteSettings.append(editor.querySelector('.seq-inspector'));
const editorMenu=dialog('editor-menu-dialog','編集メニュー');editorMenu.innerHTML='<button data-panel="song-dialog">曲の設定・保存</button><button data-panel="editor-settings-dialog">グリッド・表示</button><button data-panel="note-dialog">選択した音符</button><button data-panel="playback-dialog">再生設定</button><button data-panel="tab-dialog">TAB譜・印刷</button><button data-panel="help-dialog">使い方・出典</button>';
byId('seq-menu-toggle').remove();
const editorState=make('div','app-editor-state');move(editorState,'seq-badge','seq-save-state');
move(menu,'seq-close');
editor.replaceChildren(tools,byId('seq-scroll'),transport,editorState);
// Keep old action hooks available in contextual locations.
move(menu,'open-editor','copy-song');
const performance=byId('performance-screen');
performance.querySelector('.top').remove();performance.querySelector('.song-actions').remove();byId('song-home').remove();
performance.querySelector('.bottom small').remove();
const listeningMix=make('section','app-listening-mix','<h2>音量・リバーブ</h2>');listeningMix.setAttribute('aria-label','再生音の設定');
for(const id of ['volume','reverb'])listeningMix.append(byId(id).closest('label'));
const mixReset=make('button','','初期値に戻す');mixReset.id='mix-reset';mixReset.onclick=()=>resetMix();listeningMix.append(mixReset);performance.append(listeningMix);performance.classList.add('app-scroll');
const audition=make('section','app-audition','<h2>試奏</h2>');audition.id='instrument-audition';audition.append(performance.querySelector('.octave-bar'),byId('keyboard'));instrument.querySelector('.preset-picker').after(audition);

const power=byId('power');power.textContent='音をオン';header.querySelector('.app-header-actions').prepend(power);
const performanceActions=make('div','app-performance-actions','<button id="performance-instrument">楽器を選ぶ</button><button data-panel="playback-dialog" aria-label="再生設定">再生設定</button>');performance.prepend(performanceActions);
// Spare original containers have no active controls left; preserve no duplicate UI.
main.hidden=true;
if(!Number.isInteger(history.state?.pmgIndex))history.replaceState({...history.state,pmgIndex:0},'',location.href);
const state={entryIndex:history.state.pmgIndex,route:'performance',syncing:false,opener:null,editorVisited:false,restoring:false};
function routeFromURL(){const route=location.hash.slice(1);return Object.hasOwn(routes,route)?route:'performance'}
function href(route){return location.pathname+location.search+(route==='performance'?'':'#'+route)}
function renderRoute(route){
 const changed=state.route!==route;state.route=route;editorScreen=route==='piano-roll';
 for(const [id,view] of Object.entries({performance,'piano-roll':editor,library,instrument}))view.hidden=id!==route;
 songBar.hidden=!['performance','piano-roll'].includes(route);
 document.body.classList.toggle('editor-view',editorScreen);document.body.dataset.view=route;
 byId('app-heading').textContent=routes[route];document.title=routes[route]+' · PMG';
 byId('open-editor').setAttribute('aria-expanded',String(editorScreen));byId('open-editor').hidden=editorScreen;byId('seq-close').hidden=route==='performance';
 for(const button of nav.children)button.setAttribute('aria-current',button.dataset.route===route?'page':'false');
 if(changed){stop();scoreEditor.save()}
 if(route==='library')renderLibrary();
 if(editorScreen&&!state.editorVisited){state.editorVisited=true;const notes=scoreEditor.currentDocument().notes;const pitch=notes.length?[...notes].sort((a,b)=>a.pitch-b.pitch)[Math.floor(notes.length/2)].pitch:60;byId('seq-scroll').scrollTop=Math.max(0,(108-pitch)*20-byId('seq-scroll').clientHeight/2+30);}

}
function dismissNativeDialogs(){
 for(const el of [...document.querySelectorAll('dialog[open]')].reverse())if(!dialogs.has(el.id)){
  const event=new Event('cancel',{cancelable:true});el.dispatchEvent(event);
  if(event.defaultPrevented&&el.open)return false;
  if(el.open)el.close();
 }
 return true;
}
function sync(){
 if(state.restoring){if(history.state?.pmgIndex===state.entryIndex)state.restoring=false;return}
 if(routeFromURL()===state.route&&document.querySelector('dialog[open]:not(.app-dialog)'))return;
 if(!dismissNativeDialogs()){const target=history.state?.pmgIndex;if(Number.isInteger(target)&&target!==state.entryIndex){state.restoring=true;history.go(state.entryIndex-target)}else history.replaceState({pmgIndex:state.entryIndex},'',href(state.route));return}
 state.entryIndex=Number.isInteger(history.state?.pmgIndex)?history.state.pmgIndex:state.entryIndex+1;
 history.replaceState({...history.state,pmgIndex:state.entryIndex},'',location.href);
 state.syncing=true;
 const panel=history.state?.pmgPanel;
 for(const [id,el] of dialogs){if(id!==panel&&el.open)el.close();}
 const route=routeFromURL();renderRoute(route);
 if(route==='piano-roll')scoreEditor.open();
 if(dialogs.has(panel)&&!dialogs.get(panel).open){if(panel==='tab-dialog')refreshTab();dialogs.get(panel).showModal();}
 byId('app-menu').setAttribute('aria-expanded',String(byId('editor-menu-dialog').open||byId('app-menu-dialog').open));
 state.syncing=false;
}
function navigate(route){
 if(!Object.hasOwn(routes,route))return;
 if(state.syncing){renderRoute(route);return}
 if(!dismissNativeDialogs())return;
 for(const el of dialogs.values())if(el.open)el.close();
 if(history.state?.pmgPanel)history.replaceState({pmgIndex:state.entryIndex},'',href(route));
 else if(state.route!==route)history.pushState({pmgIndex:++state.entryIndex},'',href(route));
 renderRoute(route);if(route==='piano-roll'){state.syncing=true;scoreEditor.open();state.syncing=false;}
 byId('nav-'+route).focus({preventScroll:true});
}
function openPanel(id){
 const el=dialogs.get(id);if(!el)return;
 if(id==='tab-dialog')refreshTab();
 state.opener=document.activeElement;
 for(const other of dialogs.values())if(other!==el&&other.open)other.close();
 // Switching sheets replaces their entry so Back returns to the working surface.
 if(history.state?.pmgPanel)history.replaceState({pmgPanel:id,pmgIndex:state.entryIndex},'',location.href);
 else history.pushState({pmgPanel:id,pmgIndex:++state.entryIndex},'',location.href);
 el.showModal();byId('app-menu').setAttribute('aria-expanded',String(id==='editor-menu-dialog'||id==='app-menu-dialog'));
}
function dismiss(el){
 el.close();byId('app-menu').setAttribute('aria-expanded','false');
 if(history.state?.pmgPanel===el.id)history.back();
 if(state.opener?.isConnected&&!state.opener.closest('dialog:not([open])'))state.opener.focus({preventScroll:true});
}
function renderLibrary(){
 const query=byId('library-search').value.trim().toLocaleLowerCase(),list=byId('library-list');list.replaceChildren();
 for(const option of byId('song').options){
  const collection=option.parentElement.label||'';
  if(!(option.textContent+' '+collection).toLocaleLowerCase().includes(query))continue;
  const button=make('button','library-song');button.dataset.song=option.value;
  const title=document.createElement('span');title.textContent=option.textContent;
  const detail=document.createElement('small');detail.textContent=option.value.startsWith('user-')?'マイソング':collection;button.append(title,detail);
  button.setAttribute('aria-pressed',String(byId('song').value===option.value));
  button.onclick=()=>{byId('song').value=option.value;byId('song').dispatchEvent(new Event('change',{bubbles:true}));navigate('performance')};list.append(button);
 }
 byId('library-empty').hidden=list.children.length>0;
}
window.AppShell={navigate,sync,openPanel,get route(){return state.route}};
nav.addEventListener('click',e=>{const button=e.target.closest('[data-route]');if(button)navigate(button.dataset.route)});
document.addEventListener('click',e=>{const button=e.target.closest('[data-panel]');if(button)openPanel(button.dataset.panel)});
byId('app-menu').onclick=()=>openPanel(state.route==='piano-roll'?'editor-menu-dialog':'app-menu-dialog');byId('app-mixer').onclick=()=>openPanel('mixer-dialog');
byId('instrument-details').onclick=()=>openPanel('instrument-help-dialog');
byId('performance-instrument').onclick=()=>navigate('instrument');
byId('library-new').onclick=()=>{navigate('piano-roll');byId('seq-new').click();openPanel('song-dialog')};
byId('library-search').oninput=renderLibrary;
function instrumentLabel(){byId('performance-instrument').textContent=byId('preset').selectedOptions[0].textContent}
byId('preset').addEventListener('change',instrumentLabel);
for(const el of document.querySelectorAll('dialog:not(.app-dialog)'))el.addEventListener('close',instrumentLabel);
instrumentLabel();
for(const id of ['seq-new','seq-copy','copy-song'])byId(id).addEventListener('click',()=>{if(dialogs.get('song-dialog').open)dismiss(dialogs.get('song-dialog'))});
// Resize the shell for the software keyboard, without applying inverse scaling to accessibility zoom.
function fitViewport(){const viewport=window.visualViewport;const height=viewport&&viewport.scale===1?viewport.height:window.innerHeight;document.documentElement.style.setProperty('--app-height',height+'px');document.documentElement.style.setProperty('--app-offset-top',(viewport&&viewport.scale===1?viewport.offsetTop:0)+'px');}
window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);window.addEventListener('resize',fitViewport);fitViewport();
// A focused field may not emit change before pagehide (reload/mobile tab eviction).
// Flush only valid song fields; do not silently commit a guitar design draft.
window.addEventListener('pagehide',()=>{
 const field=document.activeElement;
 if(field?.matches('#seq-title,#seq-bpm,#seq-meter,#seq-pitch,#seq-at,#seq-duration,#seq-velocity')&&field.checkValidity()&&!(field.type==='number'&&field.value===''))field.dispatchEvent(new Event('change',{bubbles:true}));
 scoreEditor.save();
},{capture:true});
// Initial native guitar setup may already be open; do not cancel it during boot.
renderRoute(routeFromURL());if(editorScreen){state.syncing=true;scoreEditor.open();state.syncing=false;}
if(dialogs.has(history.state?.pmgPanel))dialogs.get(history.state.pmgPanel).showModal();
document.body.classList.add('app-ready');

// MIDI is parsed locally. Preview state never changes the current song.
const midiButton=make('button','','MIDI 読込');midiButton.id='library-midi';byId('library-new').before(midiButton);
const midiSongButton=make('button','','MIDI 読込');midiSongButton.id='song-midi';fileActions.append(midiSongButton);
midiBody.innerHTML='<label>MIDI ファイル<input id="midi-file" type="file" accept=".mid,.midi,audio/midi"></label><p>ファイルはこの端末内で読み込みます。</p><p id="midi-error" role="alert"></p><div id="midi-preview" hidden><label>曲名<input id="midi-title" maxlength="100"></label><p id="midi-summary"></p><fieldset id="midi-tracks"><legend>取り込むトラック</legend></fieldset><p id="midi-warning"></p><p id="midi-range" role="status"></p><button id="midi-confirm">マイソングに保存</button></div>';
let midiParsed=null,midiGeneration=0;
const midiResult=make('p','','');midiResult.id='midi-result';midiResult.setAttribute('role','status');midiResult.hidden=true;byId('score-editor').prepend(midiResult);
const midiIndices=()=>[...byId('midi-tracks').querySelectorAll('input:checked')].map(input=>Number(input.value));
const midiRangeText=s=>`アプリ音域（21〜108）外の${s.skipped}音を除外${s.skipped?'：'+s.details:''}`;
function updateMidiRange(){if(!midiParsed)return;const s=PMGMidiImport.selectionSummary(midiParsed,midiIndices());byId('midi-range').textContent=`${s.kept}音を取り込み · ${midiRangeText(s)}`;byId('midi-error').textContent=''}
byId('midi-tracks').onchange=updateMidiRange;
byId('song-picker').addEventListener('change',()=>{midiResult.hidden=true});
function resetMidi(){midiGeneration++;midiParsed=null;byId('midi-file').value='';byId('midi-preview').hidden=true;byId('midi-error').textContent=''}
function showMidi(){resetMidi();openPanel('midi-dialog')}
midiButton.onclick=midiSongButton.onclick=showMidi;
byId('midi-dialog').addEventListener('close',resetMidi);
byId('midi-file').onchange=async()=>{
 const file=byId('midi-file').files[0],generation=++midiGeneration;midiParsed=null;byId('midi-preview').hidden=true;byId('midi-error').textContent='';if(!file)return;
 try{
  if(file.size>8*1024*1024)throw new Error('MIDI は8MB以内で選んでください');
  const buffer=await file.arrayBuffer();if(generation!==midiGeneration||!byId('midi-dialog').open)return;
  midiParsed=PMGMidiImport.parse(buffer);byId('midi-title').value=file.name.replace(/\.midi?$/i,'').slice(0,100);
  byId('midi-summary').textContent=`形式${midiParsed.format} · ${Number(midiParsed.bpm.toFixed(3))} BPM · ${midiParsed.meter.join('/')} · ${midiParsed.tracks.reduce((n,t)=>n+t.notes.length,0)}音`;
  const tracks=byId('midi-tracks');tracks.replaceChildren(make('legend','','取り込むトラック'));
  midiParsed.tracks.forEach((track,i)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=i;input.checked=track.notes.length>0;input.disabled=!track.notes.length;label.append(input,document.createTextNode(`${track.name||'トラック '+(i+1)} · ${track.notes.length}音`));tracks.append(label)});
  byId('midi-warning').textContent=['選択したトラックをまとめ、現在の楽器で演奏します。',...new Set(midiParsed.tracks.flatMap(t=>t.warnings))].join(' ');byId('midi-preview').hidden=false;updateMidiRange();
 }catch(error){if(generation===midiGeneration&&byId('midi-dialog').open)byId('midi-error').textContent=error.message}
};
byId('midi-confirm').onclick=()=>{
 try{if(!midiParsed)return;const indices=midiIndices();const doc=PMGMidiImport.documentFrom(midiParsed,indices,byId('midi-title').value);scoreEditor.importDocument(doc);const summary=PMGMidiImport.selectionSummary(midiParsed,indices);midiResult.textContent=`${doc.notes.length}音を保存しました · ${midiRangeText(summary)}`;midiResult.hidden=false;navigate('piano-roll')}
 catch(error){byId('midi-error').textContent=error.message}
};
