'use strict';
const SongPlaybackSettings=(()=>{
  const $=id=>document.getElementById(id);
  let storage;try{storage=localStorage}catch{}
  const playbackKey='pmg.playback.v1';
  try{const saved=JSON.parse(storage?.getItem(playbackKey)||'null');if(saved){$('seq-strum').checked=saved.enabled===true;$('seq-strum-ms').value=Math.max(5,Math.min(100,Number(saved.intervalMs)||20));$('seq-strum-direction').value=saved.direction==='down'?'down':'up'}}catch{}
  function playbackSettings(){return {enabled:$('seq-strum').checked,intervalMs:+$('seq-strum-ms').value,direction:$('seq-strum-direction').value}}
  function updatePlaybackSettings(persist=false){
   $('seq-strum-out').textContent=$('seq-strum-ms').value+' ms';
   $('seq-strum-ms').disabled=$('seq-strum-direction').disabled=!$('seq-strum').checked;
   if(persist){stop();try{storage?.setItem(playbackKey,JSON.stringify(playbackSettings()))}catch{}}
  }
  for(const id of ['seq-strum','seq-strum-ms','seq-strum-direction'])$(id).addEventListener('input',()=>updatePlaybackSettings(true));
  updatePlaybackSettings();
  return {get:playbackSettings};
})();
