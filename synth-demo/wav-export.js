// Records the existing playback graph, including its effects and voice limits.
export function mountWavExport(api){
 const $=id=>document.getElementById(id),format=WavFormat;
 const dialog=document.createElement('dialog');dialog.id='wav-dialog';dialog.className='app-dialog';dialog.setAttribute('aria-labelledby','wav-title');
 dialog.innerHTML=`<div class="app-dialog-header"><h2 id="wav-title">曲をWAVに保存</h2><button id="wav-close">閉じる</button></div><div class="app-dialog-body app-scroll"><p>現在の音源・音量・リバーブ・強さ・テンポで、曲の先頭から最後まで1回書き出します。ループは含みません。マイクは使いません。</p><p>曲を実際に再生しながら記録するため、曲の長さ＋指定した余韻の時間がかかります。完了までこの画面を開いたままにし、画面ロックや別アプリへの切り替えを避けてください。</p><label>曲末に記録する余韻<select id="wav-tail"><option value="12">12秒（標準）</option><option value="30">30秒</option><option value="60">60秒</option></select></label><p id="wav-estimate"></p><p id="wav-source"></p><p>形式：ステレオ16bit PCM WAV。最大64 MiB。iPhoneなどでは長い曲の音源準備と書き出しにメモリを多く使います。</p><button id="wav-start">書き出し開始</button><button id="wav-cancel" hidden>中止</button><progress id="wav-progress" max="1" value="0" hidden></progress><p id="wav-status" role="status" aria-live="polite"></p><div id="wav-result" hidden><a id="wav-download" class="wav-download">WAVを保存</a><button id="wav-share" hidden>共有・ファイルに保存</button><p>Windowsでは「WAVを保存」。iPhoneでは「共有・ファイルに保存」から「ファイルに保存」を選べます。共有が使えない場合は「WAVを保存」を使い、開いた音声の共有メニューを確認してください。保存先や画面はブラウザによって異なります。</p></div></div>`;
 document.body.append(dialog);
 let job=null,url=null,file=null,generation=0,loadedContext=null;
 const message=s=>$('wav-status').textContent=s;
 function clearResult(){if(url)URL.revokeObjectURL(url);url=null;file=null;$('wav-result').hidden=true;$('wav-download').removeAttribute('href')}
 function buttons(busy){$('wav-tail').disabled=busy;$('wav-start').disabled=busy;$('wav-close').disabled=busy;$('wav-cancel').hidden=!busy;$('wav-progress').hidden=!busy}
 function clean(j){clearInterval(j.timer);if(j.node){j.node.port.onmessage=null;j.node.port.postMessage({type:'cancel'});try{j.output.disconnect(j.node)}catch{}j.node.disconnect();j.node.port.close()}j.parts=[]}
 function cancel(reason='書き出しを中止しました。ファイルは保存していません。'){
  if(!job)return;const j=job;job=null;generation++;clean(j);api.stop();buttons(false);message(reason);
 }
 function close(){if(job)cancel();dialog.close();clearResult()}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('close',()=>{if(job)cancel();clearResult()});
 $('wav-close').onclick=close;$('wav-cancel').onclick=()=>cancel();
 function tailSeconds(){const n=Number($('wav-tail').value);if(![12,30,60].includes(n))throw Error('余韻の長さを選んでください');return n}
 function estimate(){const seconds=api.duration()+tailSeconds(),rate=api.context()?.sampleRate||48000,p=format.plan(seconds,rate);$('wav-estimate').textContent=`曲と余韻：約${Math.ceil(p.seconds)}秒 ／ 約${(p.bytes/1048576).toFixed(1)} MiB（${rate} Hz${api.context()?'':'での目安'}）`;return p}
 $('wav-tail').onchange=()=>{try{estimate();message('')}catch(e){message(e.message)}};
 function open(){api.stop();clearResult();buttons(false);message('');try{estimate()}catch(e){message(e.message)}$('wav-source').textContent=api.credits();dialog.showModal()}
 $('wav-start').onclick=async()=>{
  if(job)return;clearResult();const id=++generation,j={id,parts:[],frames:0,scheduled:false};job=j;buttons(true);$('wav-progress').removeAttribute('value');message('音源を準備しています…');
  try{
   api.stop();estimate();const title=api.title();j.tail=tailSeconds();await api.enable();if(job!==j)return;
   const context=api.context(),output=api.output();if(!context.audioWorklet||typeof AudioWorkletNode==='undefined')throw Error('このブラウザではWAV書き出しを利用できません。AudioWorklet対応のブラウザでHTTPSから開いてください。');
   estimate();if(loadedContext!==context){await context.audioWorklet.addModule(new URL('./wav-capture-worklet.js?v=1',import.meta.url));loadedContext=context}if(job!==j)return;
   j.output=output;j.node=new AudioWorkletNode(context,'pmg-wav-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});output.connect(j.node);j.node.connect(context.destination);j.node.onprocessorerror=()=>cancel('音声の記録処理が停止したため書き出しを中止しました。');
   j.node.port.onmessage=({data:d})=>{
    if(job!==j)return;
    if(d.type==='error'){cancel(d.message);return}
    if(d.type==='chunk'){
     j.frames+=d.frames;if(j.frames>j.total||j.frames*4+44>format.MAX_BYTES){cancel('音声サイズの上限を超えたため中止しました。');return}j.parts.push(d.buffer);$('wav-progress').value=j.frames/j.total;
     message(`${j.frames/context.sampleRate>=j.songSeconds?'余韻を記録中':'書き出し中'} ${Math.floor(j.frames/context.sampleRate)} / ${Math.ceil(j.total/context.sampleRate)} 秒`);
    }
    if(d.type==='done'){
     if(d.frames!==j.total||j.frames!==j.total){cancel('音声の一部を記録できなかったため保存しませんでした。');return}
     try{
      const blob=new Blob([format.header(j.frames,context.sampleRate),...j.parts],{type:'audio/wav'});file=new File([blob],format.filename(title),{type:'audio/wav'});url=URL.createObjectURL(file);
      $('wav-download').href=url;$('wav-download').download=file.name;$('wav-result').hidden=false;
      $('wav-share').hidden=!(navigator.canShare?.({files:[file]})&&navigator.share);
      job=null;clean(j);api.stop();buttons(false);message(`WAVを作成しました（${(file.size/1048576).toFixed(1)} MiB）。保存ボタンを押してください。${d.clipped?' 一部のピークが16bitの範囲を超えたため制限されました。':''}${d.lastPeak>.001?' 末尾に音が残っています。余韻を長くして再作成できます。':''}`);
     }catch(e){cancel('WAVを作成できませんでした：'+e.message)}
    }
   };
   await api.play({fromBeat:0,loop:false,onScheduled:({start,length,run})=>{
    if(job!==j)throw new DOMException('中止','AbortError');const exact=format.plan(length+j.tail,context.sampleRate);j.total=exact.frames;j.songSeconds=length;j.run=run;j.scheduled=true;
    j.node.port.postMessage({type:'start',start:Math.round(start*context.sampleRate),end:Math.round(start*context.sampleRate)+exact.frames});$('wav-progress').value=0;message('書き出し中…');
    j.timer=setInterval(()=>{if(job===j&&(api.run()!==run||context.state!=='running'||api.audioError()||context.currentTime>start+exact.seconds+3))cancel('再生が中断されたため書き出しを中止しました。画面を開いたまま再試行してください。')},200);
   },onLate:()=>{cancel('再生処理が遅れたため書き出しを中止しました。ほかの処理を止めて再試行してください。');return false}});
   if(job===j&&!j.scheduled)cancel('再生を開始できなかったため書き出しを中止しました。音符と音源の準備を確認してください。');
  }catch(e){if(job===j)cancel('書き出しできませんでした：'+e.message)}
 };
 $('wav-share').onclick=async()=>{if(!file)return;try{await navigator.share({files:[file],title:file.name})}catch(e){if(e.name!=='AbortError')message('共有できませんでした。「WAVを保存」をお試しください。')}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&job)cancel('画面が非表示になったため書き出しを中止しました。')});window.addEventListener('pagehide',()=>{if(job)cancel();clearResult()});
 const button=document.createElement('button');button.id='song-export-wav';button.textContent='曲をWAVに保存';button.onclick=open;$('song-dialog').querySelector('.app-dialog-body').append(button);
 for(const id of ['app-menu-dialog','editor-menu-dialog']){const b=button.cloneNode(true);b.removeAttribute('id');b.dataset.wavExport='';b.onclick=open;$(id).querySelector('.app-dialog-body').append(b)}
 return {open,cancel,get active(){return !!job}};
}
