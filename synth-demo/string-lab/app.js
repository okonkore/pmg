'use strict';
const $=id=>document.getElementById(id), P=StringPhysics;
const nonlinearCache=new Map(),guidedCache=new Map(),sequenceVoiceCache=new Map(),sympatheticCache=new Map(),bodyCache=new Map();
function initialState(){const p=StringGuided.positionConfig('mm80');delete p.guidedPreset;return p;}
let state=initialState(),snapshot=null,context=null,source=null,lastAudio=null,playGeneration=0,renderJob=null,diagnosticWavUrl=null;
const controls=[
 ['stringControls','scale','開放弦長',400,800,1,'mm'],['stringControls','fret','フレット',0,24,1,''],['stringControls','diameter','単線の直径',.3,1.5,.01,'mm'],['stringControls','density','ナイロン材の密度（共通）',900,8000,10,'kg/m³'],['stringControls','young','ナイロン材のYoung率（共通）',.1,210,.1,'GPa'],['stringControls','tension','張力',5,150,.1,'N'],
 ['woundControls','coreDiameter','芯束の外径',.2,1.2,.01,'mm'],['woundControls','coreFill','芯束の充填率',.1,1,.01,''],['woundControls','filaments','芯の繊維数',1,500,1,'本'],['woundControls','wireDiameter','巻線の線径',.03,.3,.005,'mm'],['woundControls','wireDensity','巻線材の密度',2000,20000,10,'kg/m³'],['woundControls','wireYoung','巻線材のYoung率',1,220,1,'GPa'],['woundControls','pitchRatio','巻きピッチ / 巻線径',1,3,.05,''],
 ['interactionControls','coreCoupling','繊維の曲げ結合率（仮定）',0,1,.01,''],['interactionControls','windingParticipation','巻線の曲げ参加率（仮定）',0,.05,.0001,''],['wireLossControls','windingLossAngle','巻線の曲げ損失角（仮定）',0,.1,.001,''],
 ['pluckControls','position' ,'ブリッジからの距離',5,250,1,'mm'],['pluckControls','pullMm','弦を引く量',.01,5,.01,'mm'],
 ['lossControls','lossAngle','曲げの損失角',0,.1,.001,''],['lossControls','thermal','有効内部損失 1/Q',0,.005,.0001,''],['supportControls','supportMassG','支持部の質量',2,100,1,'g'],['supportControls','supportStiffness','支持部の硬さ',1000,100000000,1000,'N/m'],['supportControls','supportDamping','支持部の損失',0,50,.1,'N s/m'],
 ['audioControls','gain','試聴ゲイン',-36,12,1,'dB']];
for(const [group,key,title,min,max,step,unit] of controls){
 const el=document.createElement('div');el.className='control';el.innerHTML=`<label for="${key}">${title}<span class="value"><input aria-label="${title}の数値" id="${key}Number" type="number" min="${min}" max="${max}" step="${step}">${unit}</span></label><input id="${key}" type="range" min="${min}" max="${max}" step="${step}">`;
 $(group).append(el);
 for(const id of [key,key+'Number'])$(id).addEventListener('input',e=>{const v=Number(e.target.value);if(e.target.value===''||!Number.isFinite(v)||v<min||v>max){message('入力範囲を確認してください',true);return;}state[key]=v;sync();update();});
}
function sync(){for(const [,key]of controls){$(key).value=state[key];$(key+'Number').value=state[key];}$('air').checked=state.air;$('nonlinear').checked=state.nonlinear;$('supportEnabled').checked=state.supportEnabled;$('supportSide').value=state.supportSide;$('supportConstruction').value=state.construction;$('nlConstruction').value=state.construction;$('construction').value=state.construction;$('compareHz').value=state.compareHz;}
function message(text,error=false){$('status').textContent=text;$('status').className=error?'warning':'';for(const id of ['attackStatus','massStatus','massFineStatus','bothMassStatus','positionStatus','fretStatus','tensionStatus','diameterStatus','diameterForceStatus','densityStatus','youngStatus','materialLossStatus','bendingStatus','windingStatus','contactStatus','airStatus','airDiameterStatus','pitchLengthStatus','sameNoteStatus','dynamicStatus','sequenceStatus','sympatheticStatus','bodyStatus','radiationStatus','plateStatus','plateAttackStatus','plateStartupStatus','plateLossStatus','plateStiffnessStatus','plateBandStatus','plateEigenStatus','platePositionStatus','classicalStatus','classicalAttackStatus','bridgeAttachmentStatus','bracingStatus','assemblyStatus','backRadiationStatus']){const near=$(id);if(near){near.textContent=text;near.className=error?'warning':'muted';}}}
function graph(id,draw){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.font='12px system-ui';draw(g,c.width,c.height);}
function update(){
 $('supportResult').textContent='動く支持を再生すると、実際に計算したモードの減衰を表示します。';graph('supportDecay',()=>{});updateSupportParameters();
 $('nlResult').textContent='再生すると追加張力と音程の変化を表示します。';graph('nlPitch',()=>{});
 try{const s=P.model(state);$('normalConditions').textContent='現在の条件：'+(state.construction==='wound'?'巻弦':'単線')+' / '+(state.fret===0?'開放':state.fret+'フレット')+' / '+s.modes[0].hz.toFixed(1)+' Hz / 引く量'+state.pullMm+' mm / '+(state.supportEnabled?'可動支持':state.nonlinear?'固定支持・追加張力あり':'両端固定')+' / ゲイン'+state.gain+' dB';$('frequency').textContent=s.modes[0].hz.toFixed(1)+' Hz';$('length').textContent=(s.L*1000).toFixed(1)+' mm';$('displacement').textContent=(s.displacement*1000).toFixed(2)+' mm';$('pullForce').textContent=(state.supportEnabled?StringSupport.system(state).spec.p.force:state.nonlinear?StringNonlinear.initial(state).spec.p.force:s.p.force).toFixed(3)+' N';
 const approximate=s.modes.filter(m=>m.sigma/m.w>.05).length;
 $('diagnostics').textContent=((state.nonlinear||state.supportEnabled)?'固定支持・線形モデルの参考値 / ':'')+(state.construction==='wound'?`巻弦：芯 ${(s.cross.coreMu*1000).toFixed(3)} + 巻線 ${(s.cross.wireMu*1000).toFixed(3)} g/m · 外径 ${(s.cross.diameter*1000).toFixed(3)} mm · `:'単線：')+`線密度 ${(s.mu*1000).toFixed(3)} g/m · 曲げ剛性 ${s.ei.toExponential(3)} N m² · 初期エネルギー ${(s.energy*1000).toFixed(3)} mJ · ${s.modes.length}モード`+(approximate?` ／ ${approximate}モードは損失が大きく、低損失近似の精度に注意。`:'');
 $('modes').innerHTML=s.modes.slice(0,16).map(m=>`<tr><td>${m.n}</td><td>${m.hz.toFixed(1)}</td><td>${(m.air*20/Math.LN10).toFixed(2)}</td><td>${(m.ve*20/Math.LN10).toFixed(2)}</td><td>${(m.thermal*20/Math.LN10).toFixed(2)}</td><td>${m.dbPerSecond.toFixed(2)}</td></tr>`).join('');
 graph('spectrum',(g,w,h)=>{const values=s.modes.slice(0,24).map(m=>Math.abs((state.releaseMs===0?m.q:m.releasedAmplitude)*m.bridge)),max=Math.max(...values,1e-30),dx=(w-65)/values.length;g.fillStyle='#6b7d72';for(const db of [0,-20,-40,-60]){const y=25-db/60*(h-60);g.strokeStyle='#e1e6da';g.beginPath();g.moveTo(40,y);g.lineTo(w-10,y);g.stroke();g.fillText(db+'',5,y+4);}values.forEach((v,i)=>{const db=Math.max(-60,20*Math.log10(Math.max(v/max,1e-30))),height=(60+db)/60*(h-60);g.fillStyle='#538169';g.fillRect(45+i*dx,h-35-height,Math.max(2,dx-7),height);g.fillStyle='#68796c';g.fillText(i+1+'',45+i*dx,h-12);});});
 const colors=['#225f49','#c18135','#587dba','#a46476'],ns=[1,2,3,6];
 graph('decay',(g,w,h)=>{g.strokeStyle='#e1e6da';g.fillStyle='#6b7d72';for(const db of [0,-20,-40,-60]){const y=20-db/60*(h-55);g.beginPath();g.moveTo(40,y);g.lineTo(w-10,y);g.stroke();g.fillText(db+'',4,y+4);}for(let t=0;t<=state.duration;t++){const x=40+t/state.duration*(w-55);g.fillText(t+'s',x,h-10);}ns.forEach((n,i)=>{const m=s.modes[n-1];if(!m)return;g.strokeStyle=colors[i];g.beginPath();for(let j=0;j<=200;j++){const t=j/200*state.duration,db=-m.dbPerSecond*t;const y=20-Math.max(-60,db)/60*(h-55);if(j===0)g.moveTo(40,y);else g.lineTo(40+j/200*(w-55),y);}g.stroke();});});
 $('legend').innerHTML=ns.filter(n=>s.modes[n-1]).map((n,i)=>`<span style="color:${colors[i]}">モード ${n}</span>`).join('');
 if(s.displacement>.01*s.L)message('変位が弦長の1%を超えています。微小変位モデルの範囲に注意。',true);
 else message('条件を更新しました。「弾く」で試聴できます。');
 updatePair();
 }catch(e){message(e.message,true);$('playPlain').disabled=true;$('playWound').disabled=true;}
}
let calculationTimer=null,calculationStarted=0,calculationFocus=null,preparedPlayback=null;
function closeCalculation(){clearInterval(calculationTimer);calculationTimer=null;preparedPlayback=null;if($('calculationDialog').open)$('calculationDialog').close();document.querySelector('main').removeAttribute('aria-busy');if(calculationFocus?.isConnected)calculationFocus.focus({preventScroll:true});calculationFocus=null;}
function showCalculation(label){
 calculationFocus=document.activeElement;calculationStarted=performance.now();preparedPlayback=null;
 $('calculationTitle').textContent='音を計算しています';$('calculationLabel').textContent=label;
 $('calculationDetail').textContent='初回はデータの読み込みと計算に時間がかかります。完了すると再生します。';
 $('calculationSpinner').hidden=false;$('calculationResume').hidden=true;$('calculationCancel').textContent='計算をキャンセル';
 $('calculationElapsed').textContent='経過 0秒';clearInterval(calculationTimer);calculationTimer=setInterval(()=>{$('calculationElapsed').textContent='経過 '+Math.floor((performance.now()-calculationStarted)/1000)+'秒';},500);
 document.querySelector('main').setAttribute('aria-busy','true');if(!$('calculationDialog').open)$('calculationDialog').showModal();
}
function calculationNotice(title,detail,ready=null){clearInterval(calculationTimer);calculationTimer=null;$('calculationTitle').textContent=title;$('calculationDetail').textContent=detail;$('calculationSpinner').hidden=true;$('calculationCancel').textContent='閉じる';preparedPlayback=ready;$('calculationResume').hidden=!ready;if(!$('calculationDialog').open)$('calculationDialog').showModal();document.querySelector('main').removeAttribute('aria-busy');}
function startSound(sound,label){
 const b=context.createBuffer(1,sound.samples.length,sound.sampleRate);b.copyToChannel(sound.samples,0);source=context.createBufferSource();source.buffer=b;source.connect(context.destination);source.start();closeCalculation();
 message(`${label}を再生中 · ピーク ${sound.peak>0?(20*Math.log10(sound.peak)).toFixed(1):'−∞'} dBFS · 約${sound.tail.duration.toFixed(1)}秒${sound.tail.capped?'（上限・末尾を緩やかに消音）':''} · 自動音量補正なし`);
}
$('calculationCancel').onclick=()=>{const calculating=!!calculationTimer;stop();message(calculating?'計算をキャンセルしました。':'閉じました。');};
$('calculationDialog').addEventListener('cancel',e=>{e.preventDefault();$('calculationCancel').click();});
$('calculationResume').onclick=async()=>{const pending=preparedPlayback;if(!pending)return;try{await context.resume();if(pending.generation!==playGeneration)return;if(context.state!=='running')throw Error('音声を開始できませんでした。もう一度「この音を再生する」を押してください。');startSound(pending.sound,pending.label);}catch(e){if(pending.generation===playGeneration)calculationNotice('音声の再生待ち',e.message,pending);}};
function stop(preserveNative=false){closeCalculation();$('play').disabled=false;$('playA').disabled=!snapshot;updatePair();if(!preserveNative)$('attackAudio')?.pause();playGeneration++;if(renderJob){renderJob.worker.terminate();renderJob.reject(new Error('cancelled'));renderJob=null;}if(source){source.stop();source=null;}}
async function play(config,label,locked=false){
 stop();const generation=playGeneration;showCalculation(label);$('play').disabled=true;$('playA').disabled=true;$('playPlain').disabled=true;$('playWound').disabled=true;message(label+((config.nonlinear||config.supportEnabled||config.plateModes)?'を計算しています…（初回は数十秒掛かることがあります）':'を計算しています…'));
 try{context??=new AudioContext();await context.resume();await new Promise(resolve=>setTimeout(resolve,30));
 if(generation!==playGeneration)return;
 const request={...config,gain:locked?config.gain:state.gain,duration:locked?config.duration:state.duration};
 const guidedKey=locked?JSON.stringify({request,sampleRate:context.sampleRate}):null;
 const sound=locked&&guidedCache.has(guidedKey)?guidedCache.get(guidedKey):(request.bodyId||request.sympatheticId||request.sequenceId||request.attackView||request.nonlinear||request.supportEnabled)?await renderNonlinear(request,context.sampleRate):P.render(request,context.sampleRate,{autoTail:true});
 if(generation!==playGeneration)return;
 $('calculationTitle').textContent='再生を準備しています';$('calculationDetail').textContent='計算が完了しました。音声を準備しています。';
 if(locked){guidedCache.set(guidedKey,sound);if(guidedCache.size>91)guidedCache.delete(guidedCache.keys().next().value);}
 if(sound.nonlinear)showNonlinear(sound);if(sound.support)showSupport(sound);
 if(!Number.isFinite(sound.peak)||!sound.samples.every(Number.isFinite))throw Error('音の計算結果を確認できませんでした。初期条件へ戻してください。');
 if(sound.peak>.98)throw Error('出力が大きすぎます。試聴ゲインを下げてください。');
 lastAudio=sound;$('wav').disabled=false;{const audio=$('attackAudio');audio.pause();if(diagnosticWavUrl)URL.revokeObjectURL(diagnosticWavUrl);diagnosticWavUrl=URL.createObjectURL(waveBlob(sound));audio.src=diagnosticWavUrl;audio.load();$(sound.diagnostic?(sound.diagnostic.caseId?'bothMassAudioSlot':'attackAudioSlot'):'normalAudioSlot').append($('attackAudioWrap'));$('attackAudioWrap').hidden=false;}if(context.state!=='running'){calculationNotice('計算完了 · 再生待ち','ブラウザーが音声を停止しています。「この音を再生する」を押してください。',{sound,label,generation});message('計算は完了しました。画面中央の「この音を再生する」を押してください。');return;}startSound(sound,label);
 }catch(e){if(generation===playGeneration){message(e.message,true);calculationNotice('音を再生できませんでした',e.message);}}finally{if(generation===playGeneration){$('play').disabled=false;$('playA').disabled=!snapshot;updatePair();}}
}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('play').onclick=()=>play({...state},'現在の条件');$('stop').onclick=()=>{stop();message('停止しました');};
$('saveA').onclick=()=>{snapshot={...state};$('playA').disabled=false;$('comparison').textContent=`A：${state.construction==='wound'?'巻弦（芯 '+state.coreDiameter+' mm / 巻線 '+state.wireDiameter+' mm）':'単線'} / ${state.diameter} mm / ${state.density} kg/m³ / ${state.young} GPa / ${state.tension} N / ${state.fret}フレット / ${state.position} mm / ${state.pullMm} mm引く。試聴ゲインは現在の設定を共有し、再生時間は減衰から計算します。`;message('条件をAに保存しました');};
$('playA').onclick=()=>play(snapshot,'A');$('air').onchange=e=>{state.air=e.target.checked;update();};
$('reset').onclick=()=>{state=initialState();sync();update();};
$('tune').onclick=()=>{try{const t=P.tune(state,Number($('target').value));if(t<5||t>150)throw Error('計算した張力が操作範囲5〜150 Nを外れます');state.tension=t;sync();update();}catch(e){message(e.message,true);}};
$('settings').onclick=()=>download(new Blob([JSON.stringify({version:'string-v2-listen-57',current:state,A:snapshot,lastRendered:lastAudio?{conditions:lastAudio.spec.p,sampleRate:lastAudio.sampleRate,peak:lastAudio.peak,tail:lastAudio.tail,nonlinear:lastAudio.nonlinear||null,support:lastAudio.support||null,diagnostic:lastAudio.diagnostic||null,polyphony:lastAudio.polyphony||null,body:lastAudio.body||null,sympathetic:lastAudio.sympathetic||null}:null,reference:{action12mmApprox:2,bridgeToPluckCmApprox:8},comparison:{targetHz:state.compareHz,matched:comparisonConfigs(),assumptions:sensitivityConfigs()},scope:'plain or homogenized wound string, optional Kirchhoff-Carrier tension OR one/two passive movable endpoints, bridge force monitor'},null,2)],{type:'application/json'}),'string-conditions.json');
function waveBlob(sound){const {samples,sampleRate}=sound,b=new ArrayBuffer(44+2*samples.length),v=new DataView(b),str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);samples.forEach((x,i)=>v.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(1,x))*32767),true));return new Blob([b],{type:'audio/wav'});}
$('wav').onclick=()=>{if(lastAudio)download(waveBlob(lastAudio),'string-v2.wav');};
$('attackAudio').onplay=()=>{stop(true);message('音声プレーヤーで再生中 · 同じ波形と音量');};
function comparisonConfigs(){try{return P.matchedPair(state,state.compareHz);}catch{return null;}}
function updatePair(){
 try{
  const configs=P.matchedPair(state,state.compareHz),[plain,wound]=configs.map(p=>P.model(p));
  const rows=[['基音',plain.modes[0].hz.toFixed(3)+' Hz',wound.modes[0].hz.toFixed(3)+' Hz'],['引く力',plain.p.force.toFixed(3)+' N',wound.p.force.toFixed(3)+' N'],['引く量',(plain.displacement*1000).toFixed(3)+' mm',(wound.displacement*1000).toFixed(3)+' mm'],['張力',plain.p.tension.toFixed(2)+' N',wound.p.tension.toFixed(2)+' N'],['線密度',(plain.mu*1000).toFixed(3)+' g/m',(wound.mu*1000).toFixed(3)+' g/m'],['外径',(plain.cross.diameter*1000).toFixed(3)+' mm',(wound.cross.diameter*1000).toFixed(3)+' mm'],['曲げ剛性',plain.ei.toExponential(3)+' N m²',wound.ei.toExponential(3)+' N m²']];
  for(const n of [3,6,12]){const a=plain.modes[n-1],b=wound.modes[n-1];if(!a||!b)continue;
   rows.push([`モード${n}の減衰`,a.dbPerSecond.toFixed(2)+' dB/秒',b.dbPerSecond.toFixed(2)+' dB/秒']);
   rows.push([`モード${n}の倍音からのずれ`,(1200*Math.log2(a.hz/(n*plain.modes[0].hz))).toFixed(2)+' cent',(1200*Math.log2(b.hz/(n*wound.modes[0].hz))).toFixed(2)+' cent']);
  }
  $('pairMetrics').innerHTML=rows.map(r=>`<tr>${r.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('');
  $('pairNote').textContent='現在の'+state.fret+'フレット / ブリッジから'+state.position+' mm / '+state.pullMm+' mm引く。音程は張力で揃え、音量の自動正規化はしません。'+(configs.some(p=>p.tension>150||p.tension<5)?' 比較張力が通常の操作範囲5〜150 Nを外れています。':'');
  $('playPlain').disabled=false;$('playWound').disabled=false;
  graph('pairSpectrum',(g,w,h)=>{
   const sets=[plain,wound].map(s=>s.modes.slice(0,24).map(m=>Math.abs((state.releaseMs===0?m.q:m.releasedAmplitude)*m.bridge)*Math.exp(-m.sigma*.2))),max=Math.max(...sets.flat(),1e-30),count=Math.max(...sets.map(s=>s.length)),dx=(w-65)/count;
   g.fillStyle='#6b7d72';for(const db of [0,-20,-40,-60]){const y=25-db/60*(h-60);g.strokeStyle='#e1e6da';g.beginPath();g.moveTo(40,y);g.lineTo(w-10,y);g.stroke();g.fillText(db+'',5,y+4);}
   sets.forEach((values,si)=>values.forEach((v,i)=>{const db=Math.max(-60,20*Math.log10(Math.max(v/max,1e-30))),bh=(60+db)/60*(h-60);g.fillStyle=si?'#b87739':'#538169';g.fillRect(45+i*dx+si*dx*.38,h-35-bh,Math.max(1,dx*.34),bh);}));
   g.fillStyle='#68796c';for(let i=0;i<count;i++)g.fillText(i+1+'',45+i*dx,h-12);
  });
  updateSensitivity();
 }catch(e){$('pairNote').textContent=e.message;$('playPlain').disabled=true;$('playWound').disabled=true;updateSensitivity();}
}
$('construction').onchange=e=>{state.construction=e.target.value;if(state.construction==='wound')$('woundDetails').open=true;sync();update();};
$('compareHz').oninput=e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<40||v>1000){$('playPlain').disabled=true;$('playWound').disabled=true;for(const b of $('sensitivityButtons').children)b.disabled=true;return;}state.compareHz=v;updatePair();};
$('playPlain').onclick=()=>{try{play(P.matchedPair(state,state.compareHz)[0],'単線（音程一致）');}catch(e){message(e.message,true);}};
$('playWound').onclick=()=>{try{play(P.matchedPair(state,state.compareHz)[1],'巻弦（音程一致）');}catch(e){message(e.message,true);}};
$('structureOnly').onclick=()=>{state.coreCoupling=0;state.windingParticipation=0;sync();update();};
function sensitivityConfigs(){try{return P.assumptionCases(state,state.compareHz);}catch{return null;}}
function updateSensitivity(){
 const cases=sensitivityConfigs();
 if(!cases){$('sensitivityRows').innerHTML='';$('sensitivityNote').textContent='比較条件を確認してください。';for(const b of $('sensitivityButtons').children)b.disabled=true;return;}
 try{
  const models=cases.map(c=>P.model(c.config));
  $('sensitivityRows').innerHTML=models.map((s,i)=>{const m6=s.modes[5],m12=s.modes[11];return `<tr><th scope="row">${cases[i].label}</th><td>${s.modes[0].hz.toFixed(3)}</td><td>${s.p.tension.toFixed(2)}</td><td>${m6?m6.dbPerSecond.toFixed(2):'—'}</td><td>${m12?(1200*Math.log2(m12.hz/(12*s.modes[0].hz))).toFixed(2):'—'}</td></tr>`;}).join('');
  const flags=[];if(models.some(s=>s.displacement>.01*s.L))flags.push('変位が弦長の1%を超える条件があります');if(models.some(s=>s.modes.slice(0,12).some(m=>m.sigma/m.w>.05)))flags.push('高いモードで低損失近似の精度に注意');
  $('sensitivityNote').textContent='仮定を変えた比較で、実物の取り得る範囲を保証するものではありません。'+(flags.length?' '+flags.join('。')+'。':'');
  for(const b of $('sensitivityButtons').children)b.disabled=false;
 }catch(e){$('sensitivityNote').textContent=e.message;for(const b of $('sensitivityButtons').children)b.disabled=true;}
}
for(const c of P.assumptionCases(state,state.compareHz)){
 const b=document.createElement('button');b.textContent=c.label;b.id='assumption-'+c.id;
 b.onclick=()=>{try{const chosen=P.assumptionCases(state,state.compareHz).find(x=>x.id===c.id);play(chosen.config,chosen.label+'（同音程）');}catch(e){message(e.message,true);}};
 $('sensitivityButtons').append(b);
}
$('e2').onclick=()=>{state.compareHz=82.406889;state.fret=0;sync();update();message('E2（約82.41 Hz）・開放弦の比較にしました。');};
function sympatheticKey(config,sampleRate){return JSON.stringify({config:{...config,sympatheticId:'shared',guidedPreset:undefined},sampleRate});}
function bodyKey(config,sampleRate){return JSON.stringify({config:{...config,bodyView:'sum'},sampleRate});}
function renderNonlinear(config,sampleRate){
 if(config.bodyView&&bodyCache.has(bodyKey(config,sampleRate)))return Promise.resolve((config.assembly?StringAssembly:config.classicalAttackDiagnostic?StringClassicalAttack:config.plateEigenDiagnostic?StringPlateEigen:config.plateBandDiagnostic?StringPlateBand:config.plateModes?StringPlate:StringBody).select(bodyCache.get(bodyKey(config,sampleRate)),config));
 if(config.sympatheticId&&config.sympatheticId!=='independent'&&sympatheticCache.has(sympatheticKey(config,sampleRate)))return Promise.resolve(StringSympathetic.select(sympatheticCache.get(sympatheticKey(config,sampleRate)),config));
 if(config.sequenceId&&sequenceVoiceCache.has(sampleRate))return Promise.resolve(StringPolyphony.mix(config,sequenceVoiceCache.get(sampleRate),sampleRate));
 const key=JSON.stringify({config,sampleRate});if(nonlinearCache.has(key))return Promise.resolve(nonlinearCache.get(key));
 return new Promise((resolve,reject)=>{const worker=new Worker('render-worker.js?v=57');renderJob={worker,reject};
  worker.onmessage=e=>{if(e.data.phase){$('calculationTitle').textContent='弦とボディの音を計算しています';$('calculationDetail').textContent='データの読み込みが完了しました。計算が終わると再生します。';return;}worker.terminate();renderJob=null;if(e.data.error)reject(new Error(e.data.error));else{if(config.bodyView){bodyCache.set(bodyKey(config,sampleRate),e.data.result);if(bodyCache.size>8)bodyCache.delete(bodyCache.keys().next().value);}if(e.data.result.sympathetic?.shared)sympatheticCache.set(sympatheticKey(config,sampleRate),e.data.result);if(e.data.result.stems)sequenceVoiceCache.set(sampleRate,e.data.result.stems);nonlinearCache.set(key,e.data.result);if(nonlinearCache.size>12)nonlinearCache.delete(nonlinearCache.keys().next().value);resolve(e.data.result);}};
  worker.onerror=()=>{worker.terminate();renderJob=null;reject(new Error('物理計算を起動できませんでした。ページを再読み込みしてください。'));};
  worker.postMessage({config,sampleRate});
 });
}
function showNonlinear(sound){
 const n=sound.nonlinear,f0=sound.spec.modes[0].hz;
 $('nlResult').textContent=`初期の追加張力 ${n.initialDelta.toFixed(3)} N / 初期張力 ${sound.spec.p.tension.toFixed(2)} N / 引く力 ${sound.spec.p.force.toFixed(3)} N / 初期エネルギー ${(n.initialEnergy*1000).toFixed(3)} mJ。グラフは第1モードの周期から測った小振幅基音との差です。`;
 graph('nlPitch',(g,w,h)=>{const values=n.pitch.filter(v=>v.t<=3&&v.hz>0).map(v=>({t:v.t,c:1200*Math.log2(v.hz/f0)}));if(!values.length)return;
  const max=Math.max(2,...values.map(v=>v.c)),min=Math.min(0,...values.map(v=>v.c)),range=max-min||1;
  g.strokeStyle='#dce2d5';g.fillStyle='#617464';for(let i=0;i<=4;i++){const c=min+range*i/4,y=h-30-(c-min)/range*(h-55);g.beginPath();g.moveTo(45,y);g.lineTo(w-10,y);g.stroke();g.fillText(c.toFixed(1)+'¢',0,y+4);}g.strokeStyle='#b87739';g.beginPath();values.forEach((v,i)=>{const x=45+v.t/3*(w-60),y=h-30-(v.c-min)/range*(h-55);if(i===0)g.moveTo(x,y);else g.lineTo(x,y);});g.stroke();for(let t=0;t<=3;t++)g.fillText(t+'s',45+t/3*(w-60),h-8);
 });
}
$('nonlinear').onchange=e=>{state.nonlinear=e.target.checked;if(state.nonlinear)state.supportEnabled=false;sync();update();};
$('nlConstruction').onchange=e=>{state.construction=e.target.value;sync();update();};
for(const on of [false,true])$(on?'playNlOn':'playNlOff').onclick=()=>{try{const c=P.matchedPair(state,state.compareHz)[state.construction==='wound'?1:0];play({...c,nonlinear:on,supportEnabled:false},'追加張力 '+(on?'オン':'オフ'));}catch(e){message(e.message,true);}};
function updateSupportParameters(){
 const mass=state.supportMassG/1000,hz=Math.sqrt(state.supportStiffness/mass)/(2*Math.PI),Q=state.supportDamping>0?mass*2*Math.PI*hz/state.supportDamping:Infinity;
 $('supportParameters').textContent=`支持部単独の固有周波数 ${hz.toFixed(1)} Hz / Q ${Number.isFinite(Q)?Q.toFixed(2):'∞'}。弦を結合すると共振位置も変わります。`;
}
function supportMode(n){
 try{const c=P.matchedPair(state,state.compareHz)[state.construction==='wound'?1:0],m=P.model(c).modes[n-1];if(!m)throw Error('このモードは計算範囲外です');const K=state.supportMassG/1000*m.w*m.w;if(K>1e8||K<1000)throw Error('計算した硬さが操作範囲を外れます');state.supportStiffness=K;sync();update();message('支持部単独の共振を、固定支持の第'+n+'モード付近に合わせました。');}catch(e){message(e.message,true);}
}
$('supportEnabled').onchange=e=>{state.supportEnabled=e.target.checked;if(state.supportEnabled)state.nonlinear=false;sync();update();};
$('supportSide').onchange=e=>{state.supportSide=e.target.value;sync();update();};
$('supportConstruction').onchange=e=>{state.construction=e.target.value;sync();update();};
$('supportE2').onclick=()=>{state.compareHz=82.406889;state.fret=0;state.construction='wound';state.pullMm=2.5;state.nonlinear=false;sync();supportMode(6);};
for(const n of [3,6,9])$('supportMode'+n).onclick=()=>supportMode(n);
for(const on of [false,true])$(on?'playSupportOn':'playSupportOff').onclick=()=>{try{const c=P.matchedPair(state,state.compareHz)[state.construction==='wound'?1:0];play({...c,supportEnabled:on,nonlinear:false},on?'動く支持':'固定支持');}catch(e){message(e.message,true);}};
function showSupport(sound){
 const s=sound.support,spec=sound.spec;
 $('supportResult').textContent=`${s.side==='both'?'両端がそれぞれ':s.side==='bridge'?'ブリッジ側':'ナット／押弦側'}が動く / 支持部単独 ${s.resonanceHz.toFixed(1)} Hz / 初期エネルギー ${(s.initialEnergy*1000).toFixed(3)} mJ / 必要力 ${spec.p.force.toFixed(3)} N。色線は支持部との連成から計算した弦モード座標のエネルギー、点線は固定支持の第6モードの目安です。`;
 const ns=[1,3,6,9],colors=['#225f49','#c18135','#587dba','#a46476'];
 graph('supportDecay',(g,w,h)=>{const top=Math.max(0,Math.ceil(Math.max(...s.trace.filter(p=>p.t<=4).flatMap(p=>p.modal.map(m=>m.db??-60)))/10)*10),range=top+60;g.fillStyle='#617464';g.strokeStyle='#dce2d5';for(const db of [top,0,-20,-40,-60].filter((v,i,a)=>a.indexOf(v)===i)){const y=20+(top-db)/range*(h-55);g.beginPath();g.moveTo(40,y);g.lineTo(w-10,y);g.stroke();g.fillText(db+'',0,y+4);}for(let t=0;t<=4;t++)g.fillText(t+'s',40+t/4*(w-55),h-8);
  ns.forEach((n,i)=>{g.strokeStyle=colors[i];g.beginPath();let started=false;for(const p of s.trace){if(p.t>4)break;const value=p.modal.find(m=>m.n===n)?.db;if(value===null||value===undefined)continue;const x=40+p.t/4*(w-55),y=20+(top-Math.max(-60,value))/range*(h-55);if(!started){g.moveTo(x,y);started=true;}else g.lineTo(x,y);}g.stroke();});
  const m=spec.modes[5];if(m){g.strokeStyle='#708077';g.setLineDash([5,4]);g.beginPath();g.moveTo(40,20+top/range*(h-55));const t=Math.min(4,60/m.dbPerSecond);g.lineTo(40+t/4*(w-55),20+(top+Math.min(60,m.dbPerSecond*t))/range*(h-55));g.stroke();g.setLineDash([]);}
 });
}
function addGuidedRow(note,profile,target,prefix){
 const row=document.createElement('div');row.className='guided-row';
 const label=document.createElement('strong');label.textContent=(profile==='soft'?'基準調弦 ':'')+note.label+' · '+note.hz.toFixed(2)+' Hz';row.append(label);
 for(const variant of [{id:'fixed',enabled:false,side:'nut',label:'両端固定'},{id:'moving',enabled:true,side:'nut',label:'ナット側が動く'},{id:'bridge',enabled:true,side:'bridge',label:'ブリッジ側が動く'},{id:'both',enabled:true,side:'both',label:'両端が同時に動く'}]){
  const button=document.createElement('button');button.id=prefix+'-'+note.id+'-'+variant.id;button.textContent=variant.label;button.setAttribute('aria-label',(profile==='soft'?'軽く柔らかい支持 ':'')+note.label+' '+button.textContent);
  button.onclick=()=>{const config=StringGuided.config(note.id,variant.enabled,variant.side,profile);const title=(profile==='soft'?'軽く柔らかい支持 / ':'')+note.label+' / '+variant.label;$('guidedCurrent').textContent=title+'：条件固定で試聴';play(config,title,true);};row.append(button);
 }
 $(target).append(row);
}
for(const note of StringGuided.notes)addGuidedRow(note,'standard','guidedButtons','guided');
addGuidedRow(StringGuided.notes.find(n=>n.id==='e3'),'soft','contrastButtons','contrast');
for(const side of [{id:'nut',label:'ナット側が動く'},{id:'bridge',label:'ブリッジ側が動く'},{id:'both',label:'両端が同時に動く'}]){
 const row=document.createElement('div');row.className='guided-row damping-row';const title=document.createElement('strong');title.textContent=side.label;row.append(title);
 for(const level of StringGuided.lossLevels){const button=document.createElement('button');button.id='loss-'+side.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label','E3 '+side.label+' '+level.label);button.onclick=()=>{const label='損失比較 / '+side.label+' / '+level.label;$('guidedCurrent').textContent=label+' N s/m：条件固定で試聴';play(StringGuided.lossConfig(side.id,level.id),label,true);};row.append(button);}
 $('lossButtons').append(row);
}

for(const side of [{id:'nut',label:'ナット側が動く'},{id:'bridge',label:'ブリッジ側が動く'},{id:'both',label:'両端が同時に動く'}]){
 const row=document.createElement('div');row.className='guided-row damping-row';const title=document.createElement('strong');title.textContent=side.label;row.append(title);
 for(const level of StringGuided.stiffnessLevels){const button=document.createElement('button');button.id='stiffness-'+side.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label','E3 '+side.label+' '+level.label);button.onclick=()=>{const label='硬さ比較 / '+side.label+' / '+level.label;$('guidedCurrent').textContent=label+'：条件固定で試聴';play(StringGuided.stiffnessConfig(side.id,level.id),label,true);};row.append(button);}
 $('stiffnessButtons').append(row);
}

for(const level of StringGuided.lossLevels){const button=document.createElement('button');button.id='attack-loss-'+level.id;button.textContent=level.label;button.onclick=()=>{const title='柔らかいナット側 / '+level.label;$('guidedCurrent').textContent=title;play(StringGuided.attackLossConfig(level.id),title,true);};$('attackLossButtons').append(button);}
for(const view of StringAttack.views){const button=document.createElement('button');button.id='attack-view-'+view.id;button.textContent=view.label;button.onclick=()=>{const title='アタック分解 / '+view.label;$('guidedCurrent').textContent=title;play(StringGuided.attackConfig(view.id),title,true);};$('attackViewButtons').append(button);}

for(const side of [{id:'nut',label:'ナット側が動く'},{id:'bridge',label:'ブリッジ側が動く'},{id:'both',label:'両端が同時に動く'}]){
 const row=document.createElement('div');row.className='guided-row damping-row';const title=document.createElement('strong');title.textContent=side.label;row.append(title);
 for(const level of StringGuided.massLevels){const button=document.createElement('button');button.id='mass-'+side.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label','E3 '+side.label+' '+level.label);button.onclick=()=>{const label='質量比較 / '+side.label+' / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.massConfig(side.id,level.id),label,true);};row.append(button);}
 $('massButtons').append(row);
}

for(const side of [{id:'nut',label:'ナット側が動く'},{id:'bridge',label:'ブリッジ側が動く'},{id:'both',label:'両端が同時に動く'}]){
 const row=document.createElement('div');row.className='guided-row mass-fine-row';const title=document.createElement('strong');title.textContent=side.label;row.append(title);
 for(const level of StringGuided.nearMassLevels){const button=document.createElement('button');button.id='mass-fine-'+side.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label','E3 '+side.label+' '+level.label);button.onclick=()=>{const label='8 g近傍 / '+side.label+' / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.nearMassConfig(side.id,level.id),label,true);};row.append(button);}
 $('massFineButtons').append(row);
}

for(const id of ['g6','g10']){const row=document.createElement('div');row.className='guided-row mass-fine-row';const title=document.createElement('strong');title.textContent='両端可動 · 各端'+id.slice(1)+' g';row.append(title);for(const view of StringAttack.bothViews(id)){const button=document.createElement('button');button.id='both-analysis-'+id+'-'+view.id;button.textContent=view.label;button.setAttribute('aria-label',title.textContent+' '+view.label);button.onclick=()=>{const label=title.textContent+' / '+view.label;$('guidedCurrent').textContent=label;play(StringGuided.bothMassAnalysisConfig(id,view.id),label,true);};row.append(button);}$('bothMassButtons').append(row);}

for(const level of StringGuided.positionLevels){const button=document.createElement('button');button.id='position-'+level.id;button.textContent=level.label;button.setAttribute('aria-label','両端固定 ブリッジから'+level.position+' mmで弾く');button.onclick=()=>{const label='両端固定 / ブリッジから'+level.position+' mm';$('guidedCurrent').textContent=label;play(StringGuided.positionConfig(level.id),label,true);};$('positionButtons').append(button);}

for(const level of StringGuided.positionLevels){const button=document.createElement('button');button.id='position-history-'+level.id;button.textContent=level.label;button.onclick=()=>play(StringGuided.positionSupportConfig(level.id),'履歴：両端8 g / '+level.position+' mm',true);$('positionSupportButtons').append(button);}

for(const level of StringGuided.fretLevels){const button=document.createElement('button');button.id='fret-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.fretConfig(level.id),label='弦長比較 / '+level.label+' / '+P.model(config).modes[0].hz.toFixed(1)+' Hz';$('guidedCurrent').textContent=label;play(config,label,true);};$('fretButtons').append(button);}

for(const level of StringGuided.tensionLevels){const button=document.createElement('button');button.id='tension-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.tensionConfig(level.id),label='張力比較 / '+level.label+' / '+config.tension.toFixed(1)+' N / '+config.compareHz.toFixed(1)+' Hz';$('guidedCurrent').textContent=label;play(config,label,true);};$('tensionButtons').append(button);}

for(const level of StringGuided.diameterLevels){const button=document.createElement('button');button.id='diameter-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.diameterConfig(level.id),label='単線の太さ比較 / '+level.label+' / E3 / '+config.tension.toFixed(1)+' N';$('guidedCurrent').textContent=label;play(config,label,true);};$('diameterButtons').append(button);}

for(const level of StringGuided.diameterLevels){const button=document.createElement('button');button.id='diameter-force-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.diameterForceConfig(level.id),label='同じ力で太さ比較 / '+level.label+' / '+config.force.toFixed(3)+' N';$('guidedCurrent').textContent=label;play(config,label,true);};$('diameterForceButtons').append(button);}

for(const level of StringGuided.diameterLevels){const button=document.createElement('button');button.id='density-'+level.id;const config=StringGuided.densityConfig(level.id);button.textContent=level.label+' / '+Math.round(config.density)+' kg/m³';button.onclick=()=>{const label='同じ質量・張力・力 / '+level.label+' / 密度'+Math.round(config.density)+' kg/m³';$('guidedCurrent').textContent=label;play(config,label,true);};$('densityButtons').append(button);}

for(const level of StringGuided.youngLevels){const button=document.createElement('button');button.id='young-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='材料のYoung率 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.youngConfig(level.id),label,true);};$('youngButtons').append(button);}

for(const level of StringGuided.materialLossLevels){const button=document.createElement('button');button.id='material-loss-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='弦の内部損失 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.materialLossConfig(level.id),label,true);};$('materialLossButtons').append(button);}

for(const level of StringGuided.youngLevels){const button=document.createElement('button');button.id='bending-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='曲げ損失の寄与を共有 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.bendingConfig(level.id),label,true);};$('bendingButtons').append(button);}

for(const level of StringGuided.windingLevels){const button=document.createElement('button');button.id='winding-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='巻線の曲げ寄与 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.windingConfig(level.id),label,true);};$('windingButtons').append(button);}

for(const level of StringGuided.contactLevels){const button=document.createElement('button');button.id='contact-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='引く範囲 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.contactConfig(level.id),label,true);};$('contactButtons').append(button);}

for(const level of StringGuided.airLevels){const button=document.createElement('button');button.id='air-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='空気による減衰 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.airConfig(level.id),label,true);};$('airButtons').append(button);}

for(const size of StringGuided.airDiameterLevels){const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=size.label;row.append(title);for(const level of StringGuided.airLevels){const button=document.createElement('button');button.id='air-diameter-'+size.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label',size.label+' '+level.label);button.onclick=()=>{const label='太さと空気抵抗 / '+size.label+' / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.airDiameterConfig(size.id,level.id),label,true);};row.append(button);}$('airDiameterButtons').append(row);}

for(const level of StringGuided.pitchLengthLevels){const button=document.createElement('button');button.id='pitch-length-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.pitchLengthConfig(level.id),label='同じ音程の弦長比較 / '+level.label+' / '+config.tension.toFixed(1)+' N';$('guidedCurrent').textContent=label;play(config,label,true);};$('pitchLengthButtons').append(button);}

for(const level of StringGuided.sameNoteLevels){const button=document.createElement('button');button.id='same-note-'+level.id;button.textContent=level.label;button.onclick=()=>{const config=StringGuided.sameNoteConfig(level.id),label='同じE4を別の弦で / '+level.label;$('guidedCurrent').textContent=label;play(config,label,true);};$('sameNoteButtons').append(button);}

for(const string of StringGuided.sameNoteLevels.filter(v=>v.id!=='s2')){const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=string.label;row.append(title);for(const level of StringGuided.dynamicLevels){const button=document.createElement('button');button.id='dynamic-'+string.id+'-'+level.id;button.textContent=level.label;button.setAttribute('aria-label',string.label+' '+level.label);button.onclick=()=>{const label='同じE4の強弱 / '+string.label+' / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.dynamicConfig(string.id,level.id),label,true);};row.append(button);}$('dynamicButtons').append(row);}

for(const level of StringGuided.sequenceLevels){const button=document.createElement('button');button.id='sequence-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='3本の開放弦 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.sequenceConfig(level.id),label,true);};$('sequenceButtons').append(button);}

for(const level of StringGuided.sympatheticLevels){const button=document.createElement('button');button.id='sympathetic-'+level.id;button.textContent=level.label;button.onclick=()=>{const label='ブリッジを介した2弦の共鳴 / '+level.label;$('guidedCurrent').textContent=label;play(StringGuided.sympatheticConfig(level.id),label,true);};$('sympatheticButtons').append(button);}

sync();update();

for(const [id,label] of [['dry','弦のみ · 支持力'],['plate','前板だけ'],['air','前板＋内部の空気']]){const b=document.createElement('button');b.id='body-'+id;b.textContent=label;b.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0};if(id!=='dry')config.bodyId=id;play(config,'ボディ試作 / '+label,true);};$('bodyButtons').append(b);}

for(const [view,label] of [['velocity','これまでの前板の動き'],['sum','前板＋穴から出る音'],['top','前板から出る音だけ'],['hole','穴から出る音だけ']]){const button=document.createElement('button');button.id='radiation-'+view;button.textContent=label;button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view};$('guidedCurrent').textContent='前板と穴の放射音 / '+label;play(config,'前板と穴の放射音 / '+label,true);};$('radiationButtons').append(button);}

for(const [id,label] of [['reference','参考 · これまでの前板＋穴'],['one','板のたわみ方を1つ'],['nine','板のたわみ方を9つ']]){const button=document.createElement('button');button.id='plate-'+id;button.textContent=label;button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:'sum',bodyPressureGain:2};if(id!=='reference')config.plateModes=id;$('guidedCurrent').textContent='前板の複数の振動 / '+label;play(config,'前板の複数の振動 / '+label,true);};$('plateButtons').append(button);}
for(const mode of StringPlate.plateModes().modes){const row=document.createElement('tr');for(const value of [mode.m+' × '+mode.n,mode.hz.toFixed(1)+' Hz',mode.bridge.toFixed(3),mode.effectiveArea.toFixed(4)+' m²']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('plateModeRows').append(row);}

function plateAttackButton(view,label,parent){const button=document.createElement('button');button.id='plate-attack-'+view;button.textContent=label;button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view,bodyPressureGain:2,plateModes:'nine',plateDiagnostic:true};$('guidedCurrent').textContent='9つの板振動のアタック診断 / '+label;play(config,'アタック診断 / '+label,true);};parent.append(button);}
for(const [view,label] of [['sum','元の9つ · 前板＋穴'],['top','前板の音だけ'],['hole','穴の音だけ']])plateAttackButton(view,label,$('plateAttackButtons'));
for(const mode of StringPlate.plateModes().modes.filter(v=>v.effectiveArea!==0)){const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=mode.m+' × '+mode.n+' の形（板単独 '+mode.hz.toFixed(1)+' Hz）';row.append(title);plateAttackButton('mode-'+mode.m+'-'+mode.n,'この形の音だけ',row);plateAttackButton('without-mode-'+mode.m+'-'+mode.n,'この形の音を除く',row);$('plateAttackModeButtons').append(row);}

for(const profile of StringPlate.startupProfiles){const button=document.createElement('button');button.id='plate-startup-'+profile.id;button.textContent=profile.label;button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:profile.id,bodyPressureGain:2,plateModes:'nine',plateStartDiagnostic:true};$('guidedCurrent').textContent='開始処理の比較 / '+profile.label;play(config,'開始処理の比較 / '+profile.label,true);};$(profile.id==='start-linear3'||profile.id==='start-none'?'plateStartupButtons':'plateStartupMoreButtons').append(button);}

for(const side of ['plate','hole'])for(const [id,label,value] of [['baseline','A：基準',.02],['low','B：損失 小',.005],['high','C：損失 大',.08]]){const button=document.createElement('button');button.id='plate-loss-'+side+'-'+id;button.textContent=label;const title=side==='plate'?'前板の損失':'穴の損失';button.setAttribute('aria-label',title+' '+label);button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:'sum',bodyPressureGain:2,plateModes:'nine',plateParameters:{lossAngle:side==='plate'?value:.02},plateHoleDamping:side==='hole'?value:.02};$('guidedCurrent').textContent=title+' / '+label;play(config,title+' / '+label,true);};$(side==='plate'?'plateLossPlateButtons':'plateLossHoleButtons').append(button);}

for(const [id,label,scale] of [['baseline','A：基準の硬さ',1],['soft','B：柔らかい',.25],['hard','C：硬い',4]]){const button=document.createElement('button');button.id='plate-stiffness-'+id;button.textContent=label;button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:'sum',bodyPressureGain:2,plateModes:'nine',plateStiffnessScale:scale,plateFixDamping:true};$('guidedCurrent').textContent='板の硬さと「コッ」の高さ / '+label;play(config,'板の硬さ / '+label,true);};$('plateStiffnessButtons').append(button);}

for(const [id,title,scale] of [['baseline','基準の板',1],['hard','硬い板',4]]){const row=document.createElement('div');row.className='guided-row';const heading=document.createElement('strong');heading.textContent=title;row.append(heading);for(const [view,label] of [['band-whole','元の音'],['band-only','約165 Hz付近だけ'],['band-rest','約165 Hz付近を除く']]){const button=document.createElement('button');button.id='plate-band-'+id+'-'+view;button.textContent=label;button.setAttribute('aria-label',title+' '+label);button.onclick=()=>{const config={...StringGuided.positionConfig('mm80'),excitation:'force',force:StringGuided.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view,bodyPressureGain:2,plateModes:'nine',plateStiffnessScale:scale,plateFixDamping:true,plateBandDiagnostic:true};$('guidedCurrent').textContent='約165 Hzの診断 / '+title+' / '+label;play(config,'約165 Hzの診断 / '+title+' / '+label,true);};row.append(button);}$('plateBandButtons').append(row);}

for(const [id,title,scale] of [['baseline','基準の板',1],['hard','硬い板',4]]){const row=document.createElement('div');row.className='guided-row';const heading=document.createElement('strong');heading.textContent=title;row.append(heading);for(const [view,label] of [['eigen-all','元の音'],['eigen-ring','短い共鳴だけ'],['eigen-rest','その共鳴を除く']]){const button=document.createElement('button');button.id='plate-eigen-'+id+'-'+view;button.textContent=label;button.setAttribute('aria-label',title+' '+label);button.onclick=()=>{const config=StringPlateEigen.config(scale,view);$('guidedCurrent').textContent='結合した共振の診断 / '+title+' / '+label;play(config,'共振の診断 / '+title+' / '+label,true);};row.append(button);}$('plateEigenButtons').append(row);const data=StringPlateEigenData.find(v=>v.scale===scale&&v.sampleRate===48000);for(const [j,index] of data.selected.entries()){const c=data.components[index],button=document.createElement('button');button.id='plate-eigen-'+id+'-eigen-mode-'+j;button.textContent=title+' · 約'+Math.round(c.hz)+' Hzだけ';button.onclick=()=>play(StringPlateEigen.config(scale,'eigen-mode-'+j),button.textContent,true);$('plateEigenSingleButtons').append(button);}}

for(const item of StringPlatePosition.cases){const button=document.createElement('button');button.id='plate-position-'+item.id+'-sum';button.textContent=item.label;button.onclick=()=>{const config=StringPlatePosition.config(item.id);$('guidedCurrent').textContent='ブリッジが板を押す位置 / '+item.label;play(config,'ブリッジ位置 / '+item.label,true);};$('platePositionButtons').append(button);const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=item.label;row.append(title);for(const [view,label] of [['top','前板だけ'],['hole','穴だけ']]){const b=document.createElement('button');b.id='plate-position-'+item.id+'-'+view;b.textContent=label;b.setAttribute('aria-label',item.label+' '+label);b.onclick=()=>play(StringPlatePosition.config(item.id,view),item.label+' / '+label,true);row.append(b);}$('platePositionParts').append(row);}

for(const [view,label] of [['sum','前板＋穴を聴く'],['top','前板だけ'],['hole','穴だけ']]){const b=document.createElement('button');b.id='classical-'+view;b.textContent=label;b.onclick=()=>{$('guidedCurrent').textContent='クラシックギター形の基準 / '+label;play(StringClassicalPlate.config(view),'クラシックギター形 / '+label,true);};$('classicalButtons').append(b);}
{const C=StringClassicalPlate,D=C.data,points=[];for(let j=0;j<=196;j++){const x=D.length*j/196;points.push([215+1000*C.halfWidth(x),55+1000*x]);}for(let j=196;j>=0;j--){const x=D.length*j/196;points.push([215-1000*C.halfWidth(x),55+1000*x]);}const node=$('classicalOutline');node.setAttribute('d','M'+points.map(p=>p.map(v=>v.toFixed(3)).join(',')).join('L')+'Z');$('classicalCavityVolume').textContent=(D.cavityVolume*1000).toFixed(2)+' L';}

for(const [view,label] of [['attack-all','元の音'],['attack-pair','291・302 Hzの共振だけ'],['attack-rest','その共振を除く']]){const b=document.createElement('button');b.id='classical-attack-'+view;b.textContent=label;b.onclick=()=>{$('guidedCurrent').textContent='クラシック形のアタック比較 / '+label;play(StringClassicalAttack.config(view),'アタック比較 / '+label,true);};$('classicalAttackButtons').append(b);}

for(const item of StringPlateBridge.cases){const b=document.createElement('button');b.id='bridge-attachment-'+item.id+'-sum';b.textContent=item.label;b.onclick=()=>{$('guidedCurrent').textContent='ブリッジの質量と面積 / '+item.label;play(StringPlateBridge.config(item.id),'ブリッジ / '+item.label,true);};$('bridgeAttachmentButtons').append(b);const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=item.label;row.append(title);for(const [view,label] of [['top','前板だけ'],['hole','穴だけ']]){const p=document.createElement('button');p.id='bridge-attachment-'+item.id+'-'+view;p.textContent=label;p.setAttribute('aria-label',item.label+' '+label);p.onclick=()=>play(StringPlateBridge.config(item.id,view),item.label+' / '+label,true);row.append(p);}$('bridgeAttachmentParts').append(row);}
{const svg=$('classicalOutline').closest('svg').cloneNode(true);svg.setAttribute('aria-label','クラシックギター形で、ブリッジの接着面18×2.9センチを示す');svg.querySelector('#classicalOutline').id='bridgeAttachmentOutline';const patch=svg.querySelector('rect[x="140"]');patch.setAttribute('x','125');patch.setAttribute('y','365.5');patch.setAttribute('width','180');patch.setAttribute('height','29');patch.setAttribute('fill','#c18135');patch.setAttribute('fill-opacity','.6');$('bridgeAttachmentDrawing').append(svg);}

for(const item of StringClassicalBracing.cases){const b=document.createElement('button');b.id='bracing-'+item.id+'-sum';b.textContent=item.label;b.onclick=()=>{$('guidedCurrent').textContent='扇状の力木 / '+item.label;play(StringClassicalBracing.config(item.id),'力木 / '+item.label,true);};$('bracingButtons').append(b);const row=document.createElement('div');row.className='guided-row';const title=document.createElement('strong');title.textContent=item.label;row.append(title);for(const [view,label] of [['top','前板だけ'],['hole','穴だけ']]){const c=document.createElement('button');c.id='bracing-'+item.id+'-'+view;c.textContent=label;c.setAttribute('aria-label',item.label+' '+label);c.onclick=()=>play(StringClassicalBracing.config(item.id,view),item.label+' / '+label,true);row.append(c);}$('bracingParts').append(row);}
{const svg=$('bridgeAttachmentDrawing').querySelector('svg').cloneNode(true);svg.setAttribute('aria-label','クラシックギターの裏側：7本の扇状力木と穴の上下の横力木2本');svg.querySelector('#bridgeAttachmentOutline').id='bracingOutline';for(const text of svg.querySelectorAll('text'))if(text.textContent.startsWith('ブリッジ：'))text.remove();for(const brace of StringClassicalBracing.data.bracing.beams){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.brace=brace.id;line.setAttribute('x1',215+1000*brace.start[1]);line.setAttribute('y1',55+1000*brace.start[0]);line.setAttribute('x2',215+1000*brace.end[1]);line.setAttribute('y2',55+1000*brace.end[0]);line.setAttribute('stroke',brace.kind==='fan'?'#44815e':'#587dba');line.setAttribute('stroke-width',brace.width*1000);line.setAttribute('stroke-linecap','round');svg.append(line);}$('bracingDrawing').append(svg);$('bracingMass').textContent=(StringClassicalBracing.data.bracing.totalMassKg*1000).toFixed(1)+' g';}

// Independent assembly switches; each playback uses the visible selections.
function assemblySelection(){return ['Back','Neck','Sides'].map(k=>$('assembly'+k).checked);}
function assemblyVoice(){return $('assemblyVoice').value;}
function assemblyLabel(){const a=assemblySelection();return StringAssembly.voices.find(v=>v.id===assemblyVoice()).label+' / '+['裏板','ネック','側板'].map((k,j)=>k+(a[j]?'あり':'なし')).join('・');}
function playAssembly(view='sum'){const a=assemblySelection(),label=assemblyLabel();$('assemblyCurrent').textContent=label;$('guidedCurrent').textContent='組立比較 / '+label;play(StringAssembly.config(...a,view,assemblyVoice()),'組立 / '+label+(view==='sum'?'':' / '+{top:'前板',back:'裏板',sides:'側板',hole:'穴'}[view]),true);}
$('assemblyPlay').onclick=()=>playAssembly();
for(const k of ['Back','Neck','Sides'])$('assembly'+k).onchange=()=>{$('assemblyCurrent').textContent=assemblyLabel()+'（次の再生に適用）';};
for(const [id,a] of [['Baseline',[false,false,false]],['All',[true,true,true]]])$('assembly'+id).onclick=()=>{['Back','Neck','Sides'].forEach((k,j)=>$('assembly'+k).checked=a[j]);playAssembly();};
for(const view of ['top','back','sides','hole'])$('assemblyPart'+view).onclick=()=>playAssembly(view);
for(const name of ['assemblyVoice','backRadiationVoice']){
 for(const v of StringAssembly.voices){const option=document.createElement('option');option.value=v.id;option.textContent=v.label;$(name).append(option);}
 $(name).value='wound-e3';$(name).onchange=()=>{for(const other of ['assemblyVoice','backRadiationVoice'])$(other).value=$(name).value;$('assemblyCurrent').textContent=assemblyLabel()+'（次の再生に適用）';};
}
for(const [id,back,view] of [['Fixed',false,'sum'],['Muted',true,'without-back'],['Full',true,'sum'],['Only',true,'back']])$('backRadiation'+id).onclick=()=>{
 $('assemblyBack').checked=back;$('assemblyNeck').checked=true;$('assemblySides').checked=true;
 const label={Fixed:'A：裏板は固定',Muted:'B：裏板は動く・裏板の放射音なし',Full:'C：裏板は動く・全体の音',Only:'裏板の放射音だけ'}[id];
 $('assemblyCurrent').textContent=assemblyLabel()+' / '+label;$('guidedCurrent').textContent=label;
 play(StringAssembly.config(back,true,true,view,assemblyVoice()),StringAssembly.voices.find(v=>v.id===assemblyVoice()).label+' / '+label,true);
};
$('assemblyCurrent').textContent=assemblyLabel();
