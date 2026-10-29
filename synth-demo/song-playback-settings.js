'use strict';
const SongPlaybackSettings=(()=>{
  const $=id=>document.getElementById(id);
  let storage;try{storage=localStorage}catch{}
  const playbackKey='pmg.playback.v1';
  try{const saved=JSON.parse(storage?.getItem(playbackKey)||'null');if(saved){$('seq-strum').checked=saved.enabled===true;$('seq-strum-ms').value=Math.max(5,Math.min(100,Number(saved.intervalMs)||20));$('seq-strum-direction').value=saved.direction==='down'?'down':'up';if(saved.rit){$('song-rit-ending').checked=saved.rit.ending===true;$('song-rit-every').value=Math.max(0,Math.min(4096,Math.floor(Number(saved.rit.everyBars)||0)));$('song-rit-bars').value=String(saved.rit.bars||'');$('song-rit-beats').value=[1,2,4].includes(+saved.rit.ritBeats)?saved.rit.ritBeats:2;$('song-rit-percent').value=Math.max(25,Math.min(95,Number(saved.rit.endPercent)||65))}}}catch{}
  function playbackSettings(){return {enabled:$('seq-strum').checked,intervalMs:+$('seq-strum-ms').value,direction:$('seq-strum-direction').value,rit:{ending:$('song-rit-ending').checked,everyBars:+$('song-rit-every').value,bars:$('song-rit-bars').value,ritBeats:+$('song-rit-beats').value,endPercent:+$('song-rit-percent').value}}}
  function updatePlaybackSettings(persist=false){
   $('song-rit-out').textContent=$('song-rit-percent').value+'%';
   try{PlaybackTiming.barNumbers($('song-rit-bars').value);$('song-rit-bars').setCustomValidity('')}catch(e){$('song-rit-bars').setCustomValidity(e.message)}
   $('seq-strum-out').textContent=$('seq-strum-ms').value+' ms';
   $('seq-strum-ms').disabled=$('seq-strum-direction').disabled=!$('seq-strum').checked;
   if(persist){stop();try{storage?.setItem(playbackKey,JSON.stringify(playbackSettings()))}catch{}}
  }
  for(const id of ['seq-strum','seq-strum-ms','seq-strum-direction','song-rit-ending','song-rit-every','song-rit-bars','song-rit-beats','song-rit-percent'])$(id).addEventListener('input',()=>updatePlaybackSettings(true));
  updatePlaybackSettings();
  return {get(){for(const id of ['song-rit-every','song-rit-bars'])if(!$(id).reportValidity())throw Error('リタルダンドの小節指定を確認してください');return playbackSettings()}};
})();
