/** C++/Eigen coefficient preparation. One body instance per preparation worker. */
import {prepareSettings} from './settings.js?v=stopped-contact-1';
function wasiImports(){
 return {wasi_snapshot_preview1:{
  // These libc endpoints are not used on the successful numerical path.
  // No filesystem, clocks, randomness or network are provided to the module.
  proc_exit(code){throw Error('係数計算が終了しました: '+code);},
  clock_time_get(){return 52;},fd_write(){return 8;},fd_close(){return 8;},fd_seek(){return 8;},
  environ_sizes_get(){return 8;},environ_get(){return 8;}
 }};
}
export class GuitarCoefficients {
 static async create(body,bytes){
  if(!bytes){const r=await fetch(new URL('./coefficients.wasm?v=stopped-contact-1',import.meta.url));if(!r.ok)throw Error('係数計算WASMを取得できません');bytes=await r.arrayBuffer();}
  const {instance}=await WebAssembly.instantiate(bytes,wasiImports());instance.exports._initialize?.();return new this(body,instance.exports);
 }
 constructor(body,exports){
  if(!body.fullObserver)throw Error('放射音を含むボディデータが必要です');
  if(exports.coefficient_abi_version?.()!==2)throw Error('係数エンジンの版が一致しません。ページを再読み込みしてください');
  this.wasm=exports;this.body=body;this.configKey=null;this.settings=null;this.builds=0;this.bodyInitializations=1;this.settingsInitializations=0;
  const packet=body.fullObserver,values=[...body.A.flat(),...body.B.flat(),...body.Q.flat(),...body.transverseBasis.flat(),...body.direction,body.chordLength,body.baselineTotalTensionN,...packet.poles.flat(),...packet.forceReal.flat(),...packet.forceImag.flat(),...packet.outputReal,...packet.outputImag];
  const ptr=exports.allocate(values.length*8);if(!ptr)throw Error('ボディ計算用メモリを確保できません');
  try{new Float64Array(exports.memory.buffer,ptr,values.length).set(values);if(!exports.initialize_body(ptr,body.size,packet.poles.length))throw Error(this.error());}finally{exports.deallocate(ptr);}
 }
 error(){const memory=new Uint8Array(this.wasm.memory.buffer),ptr=this.wasm.last_error();let end=ptr;while(end<memory.length&&memory[end])end++;return new TextDecoder().decode(memory.subarray(ptr,end));}
 configure(input){
  const key=JSON.stringify(input);if(key===this.configKey)return;
  this.settings=prepareSettings(input);this.configKey=key;this.settingsInitializations++;
 }
 build(input,midi,{sampleRate=48000,stringNumber}={}){
  if(!Number.isFinite(sampleRate)||sampleRate<32000||sampleRate>96000)throw Error('サンプルレートを確認してください');
  this.configure(input);const context=this.settings,config=context.config,spec=context.conditions(midi,stringNumber),s=config.strings[spec.string-1],sec=spec.section;
  const total=context.totalTensionN+(midi<40?spec.tensionN-context.sixthTensionN:0);
  const params=Float64Array.of(spec.lengthM,spec.tensionN,sec.mu,sec.ei,sec.bondedEI??sec.ei,sec.EA,s.diameterMm/1000,s.lossAngle,s.construction==='wound'?1:0,spec.pluckPositionM,config.forceN,total,sampleRate,spec.contactDampingNms);
  const w=this.wasm,ptr=w.allocate(params.byteLength);if(!ptr)throw Error('係数計算用メモリを確保できません');const started=performance.now();
  try{new Float64Array(w.memory.buffer,ptr,params.length).set(params);if(!w.prepare_coefficients(ptr,params.length)){
   const reason=this.error(),explanations={'No resolved string fundamental':'このサンプルレートで弦の基本振動を解決できません','Invalid static pluck displacement':'撥弦時の静的変位を解決できません','Nonlinear initial state did not converge':'撥弦時の非線形平衡計算が収束しません','Non-positive vibration energy':'連成モデルの振動エネルギーが正になりません','Non-positive string/body mass':'連成モデルの質量行列が正になりません','Unstable vibration model':'連成モデルが不安定です','Eigenvector reconstruction failed':'固有振動の再構成精度が不足しています','Real eigensolver did not converge':'固有振動計算が収束しません','Unresolved coincident radiation poles':'近接した放射モードを数値的に分離できません'};
   throw Error(`${spec.string}弦・MIDI ${midi}・${sampleRate} Hz：${explanations[reason]||'係数計算を完了できません'}（${reason}）`);
  }}finally{w.deallocate(ptr);}
  const binary=w.memory.buffer.slice(w.result_data(),w.result_data()+w.result_size()),m=new Float64Array(w.memory.buffer,w.result_metadata(),12);this.builds++;
  return {binary,physics:{...spec,states:m[0],modes:m[1],stringModes:m[2],bodyStates:this.body.size,observerStates:0,initialReconstructionRelativeError:m[3],initialStaticResidual:m[4],forceN:m[5],forceLimited:m[5]<config.forceN,initialDeltaT:m[6],pullMm:m[7],totalTensionN:total,fullPressureModes:m[9],minObserverPoleSeparation:m[8],coefficientBackend:'cpp-eigen-wasm',coefficientMs:performance.now()-started}};
 }
 get statistics(){return {bodyInitializations:this.bodyInitializations,settingsInitializations:this.settingsInitializations,noteBuilds:this.builds,wasmMemoryBytes:this.wasm.memory.buffer.byteLength};}
}
