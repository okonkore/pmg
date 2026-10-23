import './physical-string-core.js?v=1';
class PhysicalStringProcessor extends AudioWorkletProcessor{
 constructor(){super();this.engine=new globalThis.StringVoiceCore.Engine(sampleRate,id=>this.port.postMessage({type:'ended',id}));this.port.onmessage=e=>{try{this.engine.enqueue(e.data);}catch(error){this.port.postMessage({type:'error',message:error.message});}};}
 process(_inputs,outputs){try{return this.engine.process(outputs[0][0],currentFrame);}catch(error){outputs[0][0].fill(0);this.port.postMessage({type:'error',message:error.message});return false;}}
}
registerProcessor('physical-string-ver2',PhysicalStringProcessor);
