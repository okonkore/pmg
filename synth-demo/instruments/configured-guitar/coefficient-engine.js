/** C++/Eigen coefficient preparation. One body instance per preparation worker. */
import {prepareSettings} from './settings.js?v=coeff-cpp-1';
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
  if(!bytes){const r=await fetch(new URL('./coefficients.wasm?v=coeff-cpp-1',import.meta.url));if(!r.ok)throw Error('係数計算WASMを取得できません');bytes=await r.arrayBuffer();}
  const {instance}=await WebAssembly.instantiate(bytes,wasiImports());instance.exports._initialize?.();return new this(body,instance.exports);
 }
 constructor(body,exports){
  if(!body.fullObserver)throw Error('放射音を含むボディデータが必要です');
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
  const params=Float64Array.of(spec.lengthM,spec.tensionN,sec.mu,sec.ei,sec.bondedEI??sec.ei,sec.EA,s.diameterMm/1000,s.lossAngle,s.construction==='wound'?1:0,spec.pluckPositionM,config.forceN,total,sampleRate);
  const w=this.wasm,ptr=w.allocate(params.byteLength);if(!ptr)throw Error('係数計算用メモリを確保できません');const started=performance.now();
  try{new Float64Array(w.memory.buffer,ptr,params.length).set(params);if(!w.prepare_coefficients(ptr))throw Error(this.error());}finally{w.deallocate(ptr);}
  const binary=w.memory.buffer.slice(w.result_data(),w.result_data()+w.result_size()),m=new Float64Array(w.memory.buffer,w.result_metadata(),12);this.builds++;
  return {binary,physics:{...spec,states:m[0],modes:m[1],stringModes:m[2],bodyStates:this.body.size,observerStates:0,initialReconstructionRelativeError:m[3],initialStaticResidual:m[4],forceN:m[5],forceLimited:m[5]<config.forceN,initialDeltaT:m[6],pullMm:m[7],totalTensionN:total,fullPressureModes:m[9],minObserverPoleSeparation:m[8],coefficientBackend:'cpp-eigen-wasm',coefficientMs:performance.now()-started}};
 }
 get statistics(){return {bodyInitializations:this.bodyInitializations,settingsInitializations:this.settingsInitializations,noteBuilds:this.builds,wasmMemoryBytes:this.wasm.memory.buffer.byteLength};}
}
