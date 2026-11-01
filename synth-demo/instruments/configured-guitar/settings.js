/** Shared serializable settings for either preparation backend.
 * Geometry and material coefficients are physical inputs; no tone-fit parameters.
 */
export const VERSION=1;
export const MIDI_RANGE=Object.freeze(Array.from({length:88},(_,i)=>21+i));
export function validateSettings(input){
 if(!input||input.version!==VERSION||!Array.isArray(input.strings)||input.strings.length!==6)throw Error('6本の弦を設定してください');
 const numeric=(value,min,max,label)=>{if(!Number.isFinite(value)||value<min||value>max)throw Error(label+'の範囲を確認してください');return value;};
 const strings=input.strings.map((s,i)=>{
  if(s.number!==i+1||!['plain','wound'].includes(s.construction))throw Error('弦の構造を確認してください');
  const row={number:i+1,openMidi:[64,59,55,50,45,40][i],construction:s.construction,diameterMm:numeric(s.diameterMm,.1,2,'弦の外径'),densityKgM3:numeric(s.densityKgM3,500,20000,'芯・単線の密度'),youngGPa:numeric(s.youngGPa,.1,250,'ヤング率'),lossAngle:numeric(s.lossAngle,.00001,.2,'内部損失率')};
  if(s.construction==='wound'){
   row.coreDiameterMm=numeric(s.coreDiameterMm,.05,1.9,'芯の直径');row.wireDiameterMm=numeric(s.wireDiameterMm,.01,.8,'巻線の直径');
   if(Math.abs(row.coreDiameterMm+2*row.wireDiameterMm-row.diameterMm)>.00001)throw Error((i+1)+'弦：外径は芯径＋巻線径×2に揃えてください');
   row.wireDensityKgM3=numeric(s.wireDensityKgM3,1000,22000,'巻線の密度');row.wireYoungGPa=numeric(s.wireYoungGPa,1,250,'巻線のヤング率');row.coreFill=numeric(s.coreFill,.1,1,'芯の充填率');row.filaments=numeric(s.filaments,1,1000,'芯の繊維数');if(!Number.isInteger(row.filaments))throw Error('芯の繊維数は整数にしてください');
  }
  return row;
 });
 if(!Number.isFinite(input.scaleMm)||input.scaleMm<=0)throw Error('弦長は0より大きい有限の値で指定してください');
 return {version:VERSION,scaleMm:input.scaleMm,pluckPositionMm:numeric(input.pluckPositionMm,10,160,'弾く位置'),forceN:numeric(input.forceN,.05,4,'引く力'),strings};
}
export function signature(input){return JSON.stringify(validateSettings(input));}
export function section(s){
 const d=s.diameterMm/1000,E=s.youngGPa*1e9,A=Math.PI*d*d/4;
 if(s.construction==='plain')return {mu:s.densityKgM3*A,ei:E*Math.PI*d**4/64,EA:E*A};
 const dc=s.coreDiameterMm/1000,dw=s.wireDiameterMm/1000,core=s.coreFill*Math.PI*dc*dc/4,wire=Math.PI*dw*dw/4,helix=Math.hypot(1,Math.PI*(dc+dw)/dw);
 return {mu:s.densityKgM3*core+s.wireDensityKgM3*wire*helix,ei:E*core*core/(4*Math.PI*s.filaments),EA:E*core,bondedEI:E*s.coreFill*Math.PI*dc**4/64};
}
// Zero-tension boundary of the same stiff-string formula, not a UI minimum.
export function zeroTensionLengthMm(sec,hz){return 1000*Math.pow(sec.ei*Math.PI*Math.PI/(4*sec.mu*hz*hz),.25);}
function requireTension(T,s,sec,hz,midi){
 if(!Number.isFinite(T))throw Error(`${s.number}弦・MIDI ${midi}：張力計算が有限の数値範囲を超えました。弦長・太さ・物性を確認してください`);
 if(T<=0)throw Error(`${s.number}弦・MIDI ${midi}：この弦長と剛性では指定音程の張力が正になりません（張力0の境界は約${zeroTensionLengthMm(sec,hz).toPrecision(7)} mm）。弦長・太さ・物性を変更してください`);
}
/** Shared preparation context: validate and calculate each string section once. */
export function prepareSettings(input){
 const config=validateSettings(input),sections=config.strings.map(section),opens=config.strings.map((s,i)=>{const sec=sections[i],L=config.scaleMm/1000,k=Math.PI/L,w=2*Math.PI*440*2**((s.openMidi-69)/12);return (sec.mu*w*w-sec.ei*k**4)/(k*k);});
 for(let i=0;i<6;i++){const sec=sections[i],s=config.strings[i];if(Object.values(sec).some(x=>!Number.isFinite(x)||x<=0))throw Error(`${i+1}弦：物性値が正の有限値になりません`);requireTension(opens[i],s,sec,440*2**((s.openMidi-69)/12),s.openMidi);}
 const totalTensionN=opens.reduce((sum,T)=>sum+T,0);
 if(!Number.isFinite(totalTensionN))throw Error('6本の弦の合計張力が有限の数値範囲を超えました');
 function conditions(midi,stringNumber){
  if(!Number.isInteger(midi)||midi<21||midi>108)throw Error('音域はA0〜C8です');
  if(stringNumber!==undefined&&(!Number.isInteger(stringNumber)||stringNumber<1||stringNumber>6))throw Error('弦番号を確認してください');
  const s=stringNumber===undefined?([...config.strings].reverse().filter(s=>s.openMidi<=midi).at(-1)||config.strings[5]):config.strings[stringNumber-1];
  if(stringNumber!==undefined&&(midi<s.openMidi||midi-s.openMidi>19))throw Error('指定弦の0〜19フレットで演奏できない音程です');
  const sec=sections[s.number-1],L0=config.scaleMm/1000,k0=Math.PI/L0,T0=opens[s.number-1],hz=440*2**((midi-69)/12);let length=L0,tension=T0;
  if(midi<s.openMidi)tension=(sec.mu*(2*Math.PI*hz)**2-sec.ei*k0**4)/(k0*k0);
  // Positive bending stiffness requires a length >= the flexible-string length.
  // Half that length brackets the root; retain the old endpoint where it is valid.
  else {let lo=Math.min(.01,L0*2**(-(midi-s.openMidi)/12)/2),hi=L0*1.01;for(let j=0;j<64;j++){const x=(lo+hi)/2,k=Math.PI/x,f=Math.sqrt((T0*k*k+sec.ei*k**4)/sec.mu)/(2*Math.PI);if(f>hz)lo=x;else hi=x;}length=(lo+hi)/2;}
  requireTension(tension,s,sec,hz,midi);
  if(!Number.isFinite(length)||length<=0)throw Error(`${s.number}弦・MIDI ${midi}：振動長を有限の精度で解決できません`);
  const k=Math.PI/length,solvedHz=Math.sqrt((tension*k*k+sec.ei*k**4)/sec.mu)/(2*Math.PI);
  if(!Number.isFinite(solvedHz)||Math.abs(solvedHz/hz-1)>1e-10)throw Error(`${s.number}弦・MIDI ${midi}：振動長の計算精度が不足しています`);
  return {midi,string:s.number,fret:Math.max(0,midi-s.openMidi),hz,lengthM:length,tensionN:tension,section:sec,pluckPositionM:Math.min(config.pluckPositionMm/1000,length*.9),positionLimited:config.pluckPositionMm/1000>length*.9};
 }
 return {config,sections,totalTensionN,sixthTensionN:opens[5],conditions};
}
export function noteConditions(input,midi,stringNumber){return prepareSettings(input).conditions(midi,stringNumber);}
