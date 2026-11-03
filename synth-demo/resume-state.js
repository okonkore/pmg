// Small navigation/settings record; songs and configured guitars keep their authoritative stores.
const KEY='pmg.resume.v1',tone=['cutoff','release','space'],physical=['physical-position','physical-force','physical-velocity'];
let loadedRaw=null;
export function readResumeState(){try{loadedRaw=localStorage.getItem(KEY);const s=JSON.parse(loadedRaw);return s?.version===1&&typeof s==='object'?s:{}}catch{return {}}}
export function installResumeState(saved,api){
 const $=id=>document.getElementById(id);let restoring=true,snapshot=loadedRaw;
 const tones=saved.tones&&typeof saved.tones==='object'&&!Array.isArray(saved.tones)?{...saved.tones}:{};
 function apply(values,ids){for(const id of ids){const e=$(id),v=values?.[id];if(typeof v==='number'&&Number.isFinite(v)&&v>=Number(e.min)&&v<=Number(e.max)){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}}}
 apply(tones[api.getPreset()],tone);apply(saved.physical,physical);
 if(Number.isInteger(saved.octave)&&saved.octave>=-4&&saved.octave<=3)api.setOctave(saved.octave);
 if(saved.guitar&&['nail','position','body'].every(k=>Number.isFinite(saved.guitar[k])&&saved.guitar[k]>=0&&saved.guitar[k]<=1))api.setGuitar(Object.fromEntries(['nail','position','body'].map(k=>[k,saved.guitar[k]])));
 const values=ids=>Object.fromEntries(ids.map(id=>[id,Number($(id).value)]));
 function persist(){
  if(restoring||$('shared-update-dialog')?.open)return;
  tones[api.getPreset()]=values(tone);
  const s={version:1,song:$('song').value,preset:api.getPreset(),route:api.getRoute(),tones,physical:values(physical),octave:api.getOctave(),guitar:api.getGuitar()};
  try{if(localStorage.getItem(KEY)!==snapshot){$('status').textContent='別の画面で選択・設定が更新されました。再読み込みしてください。';return;}const raw=JSON.stringify(s);localStorage.setItem(KEY,raw);snapshot=raw;}catch{ $('status').textContent='画面・楽器の選択を保存できません。ブラウザの保存領域を確認してください。'; }
  // Old deep-link parameters must not undo later explicit song/instrument choices on reload.
  const u=new URL(location.href);for(const name of ['song','preset'])if(u.searchParams.has(name))u.searchParams.set(name,s[name]);history.replaceState(history.state,'',u);
 }
 document.addEventListener('pmg-preset-changed',()=>{restoring=true;apply(tones[api.getPreset()],tone);restoring=false;persist()});
 document.addEventListener('pmg-song-opened',persist);document.addEventListener('pmg-settings-changed',persist);
 for(const id of [...tone,...physical])$(id).addEventListener('input',persist);
 new MutationObserver(persist).observe(document.body,{attributes:true,attributeFilter:['data-view']});
 restoring=false;
 // Do not rewrite old/invalid/other-tab data merely by opening or reloading a page.
}
