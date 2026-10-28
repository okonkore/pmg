import {PhysicalGuitarEngine} from './engine.js';
class CoupledGuitarProcessor extends AudioWorkletProcessor {
 constructor(options){super();const p=options.processorOptions;this.bytes=p.bytes;this.module=p.module;this.engine=new PhysicalGuitarEngine(this.bytes,new WebAssembly.Instance(this.module),sampleRate,{block:4,sparseTolerance:.03,linearAfter:12});this.active=false;this.samples=0;this.ending=0;this.generation=0;
  this.port.onmessage=({data})=>{try{
   if(data.type==='on'){this.start(data.scale??1);}
   else if(data.type==='stop'){if(this.active)this.ending=Math.max(1,Math.round(.01*sampleRate));}
   else if(data.type==='dispose'){this.disposed=true;this.active=false;this.port.postMessage({type:'ended'});}
  }catch(e){this.active=false;this.port.postMessage({type:'error',message:e.message});}};if(p.initialScale!==undefined)this.start(p.initialScale);this.port.postMessage({type:'engine-ready'});
 }
 start(scale){this.engine.reset(scale);this.active=true;this.samples=0;this.ending=0;this.port.postMessage({type:'started'});}
 process(_inputs,outputs){if(this.disposed)return false;const out=outputs[0][0];out.fill(0);if(!this.active)return true;
  try {this.engine.render(out);this.samples+=out.length;
   if(this.ending){for(let i=0;i<out.length;i++){out[i]*=Math.max(0,this.ending/(.01*sampleRate));this.ending--;}if(this.ending<=0){this.ending=0;this.active=false;this.port.postMessage({type:'ended'});}}
   else if(this.samples>=50*sampleRate){this.active=false;this.port.postMessage({type:'ended'});}
  }catch(e){out.fill(0);this.active=false;this.port.postMessage({type:'error',message:e.message});}
  return true;
 }
}
registerProcessor('coupled-physical-guitar',CoupledGuitarProcessor);
