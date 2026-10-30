import {createLabComparison} from './runtime/lab-comparison.js';
const COMMON_GAIN=.65,SECONDS=.5;
export function mountPluckAudition({body,stopPerformance=()=>{}}){
 const dialog=body.closest('dialog'),comparison=createLabComparison();body.classList.add('pluck-audition');
 body.innerHTML=`<p class="pluck-intro"><span class="pluck-badge">実験</span> 標準650mm · 520R推定条件</p>
 <div class="pluck-fields"><label>音<select id="pluck-note"><option value="40">6弦 E2・低音</option><option value="64">1弦 E4・高音</option></select></label><label>Bの解放時間<select id="pluck-release"><option value="0.000513">短い · 0.513ms</option><option value="0.002">長い · 2ms</option></select></label></div>
 <section class="pluck-ready" aria-label="準備済みの比較"><p id="pluck-prepared">比較音を準備してください</p><div class="pluck-ab"><button id="pluck-play-a" disabled aria-pressed="false"><strong>A</strong><span>現行モデル・瞬時解放</span></button><button id="pluck-play-b" disabled aria-pressed="false"><strong>B</strong><span id="pluck-b-label">候補・有限時間解放</span></button></div><p class="pluck-level">共通の音量設定 · 0.5秒</p></section>
 <p id="pluck-error" role="alert" hidden></p>
 <details class="pluck-help"><summary>この比較について</summary><p>Aは現行の音源計算（PCM24保存前）、Bは力を時間をかけて離す候補です。音程・弦・引く力・位置・再生ゲインは共通で、音ごとのピーク正規化はしません。本体のPCM24保存・エフェクト・コンプレッサーは通しません。Bでは積分精度も異なるため、下のCは瞬時解放をBと同じ計算条件で生成します。CとBを比べると解放時間の効果を分離できます。</p><p>実験音で、実測したギターの再現ではありません。準備には数十秒かかることがあります。通常の調弦設定は使わず、PMG本体の楽器・曲・保存設定には接続しません。650mm、ブリッジから80mm、1.545765N、48kHz、0.5秒。有限解放は規定した力で、指・爪の接触そのものではありません。</p><button id="pluck-play-control" disabled aria-pressed="false">C · 共通計算の瞬時解放</button></details>`;
 const footer=document.createElement('div');footer.className='pluck-footer';footer.innerHTML='<p id="pluck-status" role="status" aria-live="polite">同じ1音を3条件で準備します</p><progress id="pluck-progress" max="1" value="0" aria-label="比較音の準備" hidden></progress><div class="pluck-actions"><button id="pluck-prepare" class="primary">比較音を準備</button><button id="pluck-cancel" hidden>中止</button><button id="pluck-stop" disabled>停止</button></div>';dialog.append(footer);
 const $=id=>dialog.querySelector('#'+id);let generation=0,busy=false,pair=null,context=null,playGeneration=0,started=0,timer=null,lastProgress=null,lastAnnounced=-1;const voices=new Set();
 function buttons(){for(const name of ['a','b'])$('pluck-play-'+name).disabled=!pair||busy;$('pluck-play-control').disabled=!pair||busy;$('pluck-prepare').disabled=busy;$('pluck-note').disabled=busy;$('pluck-release').disabled=busy;$('pluck-cancel').hidden=!busy;$('pluck-stop').disabled=voices.size===0;}
 function halt(immediate=false){playGeneration++;for(const voice of [...voices]){try{const now=context.currentTime;if(immediate){voice.source.stop();voice.clean();}else{voice.gain.gain.cancelAndHoldAtTime?.(now);if(!voice.gain.gain.cancelAndHoldAtTime){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(Math.min(COMMON_GAIN,voice.gain.gain.value),now);}voice.gain.gain.linearRampToValueAtTime(0,now+.012);voice.source.stop(now+.012);}}catch{voice.clean()}}for(const id of ['pluck-play-a','pluck-play-b','pluck-play-control'])$(id).setAttribute('aria-pressed','false');buttons();}
 function progressText(){if(!lastProgress)return;const percent=Math.floor(lastProgress.fraction*100),seconds=Math.floor((performance.now()-started)/1000);const stage=lastProgress.stage==='initializing'?'読み込み':lastProgress.stage==='cached'?'保存済みの音を使用':'準備';$('pluck-status').textContent=`${lastProgress.part}を${stage}中 · ${percent}% · ${seconds}秒`;$('pluck-progress').value=lastProgress.fraction;}
 function settled(){busy=false;clearInterval(timer);timer=null;$('pluck-progress').hidden=true;buttons();}
 function cancel(){if(!busy)return;generation++;comparison.cancel();settled();$('pluck-status').textContent=pair?'中止しました。前の比較音を保持しています。':'準備を中止しました';}
 function showPair(){const note=pair.request.notes[0],release=pair.request.release.seconds*1000;$('pluck-prepared').textContent=`準備済み：${note.midi===40?'6弦 E2':'1弦 E4'} · 650mm`;$('pluck-b-label').textContent=`${release}msで離す`;$('pluck-status').textContent='AとBをタップして比較できます';dialog.dataset.preparedNote=String(note.midi);dialog.dataset.preparedRelease=String(pair.request.release.seconds);}
 $('pluck-prepare').onclick=async()=>{
  if(busy)return;halt(true);const token=++generation;busy=true;started=performance.now();lastProgress=null;lastAnnounced=-1;$('pluck-error').hidden=true;$('pluck-status').textContent='標準650mmを読み込み中（A・C・Bの3音）';$('pluck-progress').value=0;$('pluck-progress').hidden=false;buttons();
  timer=setInterval(()=>{if(busy)progressText()},1000);
  try{
   const response=await fetch(new URL('../instruments/configured-guitar/default-settings.json',import.meta.url));if(!response.ok)throw Error('Default settings unavailable');const settings=await response.json();settings.scaleMm=650;
   if(token!==generation||!dialog.open)return;
   const midi=Number($('pluck-note').value),release=Number($('pluck-release').value);
   const prepared=await comparison.prepare({settings,note:{midi,stringNumber:midi===40?6:1},seconds:SECONDS,rate:48000,release:{seconds:release,shape:'cosine'},mode:'auto'},{onProgress:p=>{if(token!==generation||!dialog.open)return;lastProgress=p;const bucket=Math.floor(p.fraction*10);$('pluck-progress').value=p.fraction;if(bucket!==lastAnnounced){lastAnnounced=bucket;progressText()}}});
   if(token!==generation||!dialog.open)return;pair=prepared;showPair();
  }catch(error){if(token===generation&&error.name!=='AbortError'){$('pluck-error').textContent='準備できませんでした。もう一度お試しください。';$('pluck-error').hidden=false;$('pluck-status').textContent=pair?'前の比較音はそのまま再生できます':'比較音はまだ準備されていません';}}
  finally{if(token===generation)settled();}
 };
 async function play(which){
  if(!pair||busy)return;halt(true);const token=++playGeneration;stopPerformance();
  try{
   context??=new AudioContext({sampleRate:48000,latencyHint:'interactive'});await context.resume();
   if(!dialog.open||document.hidden){await context.suspend();return;}
   if(token!==playGeneration)return;
   const bank=pair[which],buffer=bank.toAudioBuffer(context,bank.notes[0].id),source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=COMMON_GAIN;source.connect(gain).connect(context.destination);
   const voice={source,gain,clean(){source.disconnect();gain.disconnect();voices.delete(voice);if(!voices.size)for(const id of ['pluck-play-a','pluck-play-b','pluck-play-control'])$(id).setAttribute('aria-pressed','false');buttons()}};voices.add(voice);source.onended=voice.clean;
   const start=context.currentTime+.005;gain.gain.setValueAtTime(COMMON_GAIN,start+buffer.duration-.012);gain.gain.linearRampToValueAtTime(0,start+buffer.duration);source.start(start);(which==='a'?$('pluck-play-control'):$('pluck-play-'+(which==='current'?'a':'b'))).setAttribute('aria-pressed','true');buttons();
  }catch{$('pluck-error').textContent='音声を再生できませんでした。もう一度タップしてください。';$('pluck-error').hidden=false;halt(true);}
 }
 $('pluck-play-a').onclick=()=>play('current');$('pluck-play-control').onclick=()=>play('a');$('pluck-play-b').onclick=()=>play('b');$('pluck-stop').onclick=()=>halt();$('pluck-cancel').onclick=cancel;
 for(const name of ['pluck-note','pluck-release'])$(name).onchange=()=>{halt(true);$('pluck-status').textContent='変更した条件で比較音を準備してください';};
 const leave=()=>{cancel();halt(true);if(context?.state==='running')context.suspend().catch(()=>{})};dialog.addEventListener('close',leave);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)leave()});
 window.addEventListener('pagehide',e=>{leave();if(!e.persisted){comparison.dispose();context?.close().catch(()=>{})}});
 buttons();return {cancel,stop:()=>halt(true)};
}

mountPluckAudition({body:document.querySelector('#lab-body')});
