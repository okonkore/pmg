// Post-instrument room effect. No instrument parameters or sample caches are changed.
(function(root){
 class RoomReverb{
  static createOutputGuard(context){
   const node=context.createWaveShaper(),curve=new Float32Array(65537);
   // Identity in the normal range; gently bound boosted peaks below digital full scale.
   for(let i=0;i<curve.length;i++){const x=i/32768-1,a=Math.abs(x);curve[i]=a<=.9?x:Math.sign(x)*(.9+.08*(1-Math.exp(-(a-.9)/.08)))}
   node.curve=curve;node.oversample='none';return node;
  }
  static createOutput(context,master){
   const output=context.createGain(),direct=context.createGain(),protectedGain=context.createGain(),guard=this.createOutputGuard(context);
   direct.gain.value=1;protectedGain.gain.value=0;
   master.connect(direct).connect(output);master.connect(guard).connect(protectedGain).connect(output);
   return {output,set(volume,amount,immediate=false){
    const now=context.currentTime,protect=volume>.22||amount>0;
    // Crossfade protection before raising level; remove it only after the gain settles.
    const start=now+(!immediate&&protect ? .03 : 0);
    const fadeStart=now+(!immediate&&!protect ? .12 : 0);
    for(const [param,value] of [[direct.gain,protect?0:1],[protectedGain.gain,protect?1:0]]){
     param.cancelAndHoldAtTime(now);if(immediate)param.setValueAtTime(value,now);else{param.setValueAtTime(param.value,fadeStart);param.linearRampToValueAtTime(value,fadeStart+.03)}
    }
    master.gain.cancelAndHoldAtTime(now);if(immediate)master.gain.setValueAtTime(volume/.22,now);else master.gain.setTargetAtTime(volume/.22,start,.015);
    return start;
   }};
  }
  constructor(context){
   this.context=context;this.input=context.createGain();this.output=context.createGain();this.dry=context.createGain();this.wet=context.createGain();this.amount=0;
   this.wet.gain.value=0;this.input.connect(this.dry).connect(this.output);this.wet.connect(this.output);
   // Deterministic stereo room impulse: no network asset and no random change on reload.
   const rate=context.sampleRate;this.impulse=context.createBuffer(2,Math.ceil(rate*1.4),rate);let seed=173;
   for(let channel=0;channel<2;channel++){const data=this.impulse.getChannelData(channel);for(let i=Math.floor(rate*.015);i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.exp(-6*i/data.length);}}
   this.replaceConvolver();
  }
  replaceConvolver(){
   if(this.convolver){try{this.input.disconnect(this.convolver)}catch{}this.convolver.disconnect()}
   this.convolver=this.context.createConvolver();this.convolver.buffer=this.impulse;this.convolver.connect(this.wet);this.connected=false;
   if(this.amount>0){this.input.connect(this.convolver);this.connected=true}
  }
  setAmount(value,immediate=false,startTime=this.context.currentTime){
   if(!Number.isFinite(value))return;this.amount=Math.min(1,Math.max(0,value));
   if(this.amount>0&&!this.connected){this.input.connect(this.convolver);this.connected=true}
   if(this.amount===0&&this.connected){this.input.disconnect(this.convolver);this.connected=false}
   const now=this.context.currentTime,mix=this.amount*.35;
   for(const [param,target] of [[this.dry.gain,1-mix],[this.wet.gain,mix]]){param.cancelAndHoldAtTime(now);if(immediate)param.setValueAtTime(target,now);else{param.setValueAtTime(param.value,Math.max(now,startTime));param.linearRampToValueAtTime(target,Math.max(now,startTime)+.03)}}
  }
  clear(){this.replaceConvolver()}
 }
 root.RoomReverb=RoomReverb;
})(globalThis);
