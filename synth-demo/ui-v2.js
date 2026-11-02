// Optional presentation only. No song, waveform or instrument storage is duplicated.
const $=id=>document.getElementById(id),shell=$('app-shell'),editor=$('score-editor');
document.body.classList.add('ui-v2');
await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./ui-v2.css',import.meta.url).href;link.onload=resolve;link.onerror=()=>reject(Error('V2 stylesheet unavailable'));document.head.append(link);});
const make=(tag,id,text)=>{const e=document.createElement(tag);if(id)e.id=id;if(text)e.textContent=text;return e;};
const trigger=(id,text,panel)=>{const e=make('button',id,text);e.dataset.panel=panel;e.setAttribute('aria-haspopup','dialog');return e;};
const songSheet=AppShell.createPanel('v2-song-dialog','曲を選ぶ');songSheet.append($('song-picker'));
const libraryButton=make('button','v2-open-library','曲ライブラリを開く');libraryButton.onclick=()=>AppShell.navigate('library');songSheet.append(libraryButton);
const statusSheet=AppShell.createPanel('v2-status-dialog','状態・保存');statusSheet.append(document.querySelector('.app-status'),document.querySelector('.app-editor-state'));
for(const id of ['app-menu-dialog','editor-menu-dialog'])$(id).querySelector('.app-dialog-body').prepend(trigger(null,'状態・保存','v2-status-dialog'),trigger(null,'音色・音量','mixer-dialog'));
const audioAlert=trigger('v2-audio-alert','','v2-status-dialog');audioAlert.hidden=true;audioAlert.setAttribute('role','status');shell.append(audioAlert);
function syncAudio(){audioAlert.textContent=$('status').textContent;audioAlert.hidden=!/できません|失敗|エラー/.test(audioAlert.textContent);}
new MutationObserver(syncAudio).observe($('status'),{childList:true,subtree:true});syncAudio();
$('app-mixer').hidden=true;document.querySelector('.app-song-bar').remove();
const titleButton=trigger('v2-title','曲を選ぶ','v2-song-dialog');$('app-heading').after(titleButton);document.querySelector('.app-brand').textContent='V2';
const layerSheet=AppShell.createPanel('v2-layer-dialog','弦レイヤー');
const layerList=make('div','v2-layer-list');layerList.setAttribute('role','group');layerList.setAttribute('aria-label','表示・追加する弦');
for(const option of $('seq-layer').options){const b=make('button',null,option.textContent);b.dataset.layer=option.value;b.onclick=()=>{$('seq-layer').value=option.value;$('seq-layer').dispatchEvent(new Event('change'));$('v2-layer-dialog').querySelector('[data-dismiss]').click();};layerList.append(b);}
const assignmentResult=make('p','v2-assignment-result');assignmentResult.setAttribute('role','status');assignmentResult.hidden=true;
layerSheet.append(layerList,$('seq-layers'),assignmentResult);$('seq-layer').closest('label').hidden=true;
const layerHelp=make('p',null,'全体：ギターの新しい音は自動配置。未指定：弦を決めずに追加。1〜6弦：選んだ弦に追加。');layerHelp.className='v2-caption';layerSheet.append(layerHelp);
const toolSheet=AppShell.createPanel('v2-tool-dialog','編集ツール');
const modeButtons=make('div','v2-mode-buttons');modeButtons.append($('seq-select'),$('seq-draw'),$('seq-pan'));toolSheet.append(modeButtons,$('seq-redo'),trigger(null,'グリッド・ズーム・削除','editor-settings-dialog'));
for(const button of modeButtons.children)button.addEventListener('click',()=>$('v2-tool-dialog').querySelector('[data-dismiss]').click());
const tools=document.querySelector('.app-editor-tools'),dock=make('div','v2-editor-dock');
const toolButton=trigger('v2-tool','選択 ▾','v2-tool-dialog'),layerButton=trigger('v2-layer','全体 ▾','v2-layer-dialog');
const copyButton=make('button','v2-copy-edit','コピーして編集');copyButton.onclick=()=>$('seq-copy').click();
dock.append($('seq-undo'),$('seq-play'),$('seq-stop'),$('seq-position'),$('seq-note-settings'));editor.append(dock);
$('seq-undo').textContent='↶';$('seq-play').textContent='▶';$('seq-play').setAttribute('aria-label','カーソルから再生');$('seq-stop').textContent='■';$('seq-stop').setAttribute('aria-label','再生を停止');$('seq-note-settings').textContent='音符';
const playbackBody=$('playback-dialog').querySelector('.app-dialog-body');playbackBody.prepend($('seq-rewind'),$('seq-loop').closest('label'));
editor.querySelector(':scope > .seq-toolbar').remove();
tools.replaceChildren(toolButton,layerButton,$('seq-layer-status'),copyButton);editor.append(dock);
const info=make('div','v2-save-alert');info.setAttribute('role','status');info.hidden=true;tools.after(info);
// Keep editing errors visible even though routine status has moved into its sheet.
function syncEditor(){
 const saveText=$('seq-save-state').textContent;assignmentResult.hidden=!saveText.includes('自動配置');assignmentResult.textContent=assignmentResult.hidden?'':saveText;
 const error=$('seq-save-state').dataset.error==='true';info.hidden=!error;info.textContent=error?$('seq-save-state').textContent:'';
 const active=['select','draw','pan'].find(id=>$('seq-'+id).getAttribute('aria-pressed')==='true');toolButton.textContent=({select:'↖ 選択',draw:'✎ 鉛筆',pan:'✋ 移動'}[active]||'ツール')+' ▾';
 const layer=$('seq-layer').value;layerButton.textContent=({all:'全体',unassigned:'未指定'}[layer]||layer+'弦')+' ▾';
 for(const b of layerList.children)b.setAttribute('aria-pressed',String(b.dataset.layer===layer));
 copyButton.hidden=!$('seq-draw').disabled;
}
$('seq-layer').addEventListener('change',syncEditor);
new MutationObserver(syncEditor).observe($('seq-save-state'),{childList:true,subtree:true,attributes:true});
for(const id of ['seq-select','seq-draw','seq-pan'])new MutationObserver(syncEditor).observe($(id),{attributes:true,attributeFilter:['aria-pressed','disabled']});
const performance=$('performance-screen'),hero=make('div','v2-now-playing');hero.innerHTML='<span class="v2-caption">選択中の曲</span><h2></h2><p></p><button data-panel="v2-song-dialog">曲を変更</button>';performance.prepend(hero);
$('mixer-dialog').querySelector('.app-dialog-body').append($('mix-reset'));
const instrumentSheet=AppShell.createPanel('v2-instrument-dialog','楽器の設定');
for(const controls of [...$('instrument-screen').querySelectorAll(':scope > .guitar-controls')])instrumentSheet.append(controls);
const instrumentSettings=trigger('v2-instrument-settings','楽器の設定','v2-instrument-dialog');$('instrument-audition').before(instrumentSettings);
function syncInstrument(){instrumentSettings.dataset.panel=[...instrumentSheet.children].some(el=>el.classList.contains('guitar-controls')&&!el.hidden)?'v2-instrument-dialog':'mixer-dialog';}
$('preset').addEventListener('change',syncInstrument);syncInstrument();
// Existing native dialogs (preparation, string sets) and their cancellation remain authoritative.
function syncTitle(){
 const route=AppShell.route,option=$('song').selectedOptions[0];titleButton.textContent=['performance','piano-roll'].includes(route)?option?.textContent||'曲を選ぶ':({library:'曲ライブラリ',instrument:'楽器'}[route]||'PMG');
 titleButton.setAttribute('aria-label','曲を選ぶ：'+(option?.textContent||''));
 hero.querySelector('h2').textContent=option?.textContent||'';hero.querySelector('p').textContent=scoreEditor.currentDocument().bpm+' BPM';
 syncEditor();
}
new MutationObserver(syncTitle).observe(document.body,{attributes:true,attributeFilter:['data-view']});
new MutationObserver(syncTitle).observe($('song'),{childList:true,subtree:true});$('song').addEventListener('change',syncTitle);$('seq-bpm').addEventListener('change',syncTitle);
syncTitle();
// CSS uses the same VisualViewport measurements as the existing shell; no inverse pinch scale.
if(history.state?.pmgPanel?.startsWith('v2-'))AppShell.sync();
document.body.dataset.v2Ready='true';
