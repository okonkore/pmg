// Capture the final mix with exact frame boundaries; output silence on this parallel branch.
class PMGWavCapture extends AudioWorkletProcessor{
 constructor(){super();this.active=false;this.closed=false;this.port.onmessage=({data:d})=>{
  if(d.type==='cancel'){this.closed=true;this.active=false;return}
  if(d.type!=='start'||this.active)return;
  if(!Number.isSafeInteger(d.start)||!Number.isSafeInteger(d.end)||d.start<currentFrame||d.end<=d.start||(d.end-d.start)*4>64*1024*1024-44){this.port.postMessage({type:'error',message:'記録開始が間に合わないか、音声の長さが上限を超えました。再試行してください。'});this.closed=true;return}
  this.start=d.start;this.end=d.end;this.frames=0;this.clipped=0;this.lastPeak=0;this.used=0;this.buffer=new ArrayBuffer(8192*4);this.view=new DataView(this.buffer);this.active=true;
 }}
 flush(){if(!this.used)return;const bytes=this.buffer.slice(0,this.used*4);this.port.postMessage({type:'chunk',buffer:bytes,frames:this.used},[bytes]);this.used=0}
 process(inputs,outputs){
  if(this.closed)return false;if(!this.active)return true;
  const input=inputs[0],length=outputs?.[0]?.[0]?.length??input[0]?.length??128;
  for(let i=0;i<length;i++){
   const frame=currentFrame+i;if(frame<this.start)continue;
   if(frame>=this.end){this.flush();this.port.postMessage({type:'done',frames:this.frames,clipped:this.clipped,lastPeak:this.lastPeak});this.closed=true;return false}
   for(let c=0;c<2;c++){
    const value=input[c]?.[i]??input[0]?.[i]??0;
    if(!Number.isFinite(value)){this.port.postMessage({type:'error',message:'有限でない音声値が検出されたため書き出しを中止しました。'});this.closed=true;return false}
    if(frame>=this.end-Math.ceil(sampleRate*.1))this.lastPeak=Math.max(this.lastPeak,Math.abs(value));
    if(Math.abs(value)>1)this.clipped++;
    const x=Math.max(-1,Math.min(1,value));this.view.setInt16((this.used*2+c)*2,Math.round(x*(x<0?32768:32767)),true);
   }
   this.used++;this.frames++;if(this.used===8192)this.flush();
  }
  return true;
 }
}
registerProcessor('pmg-wav-capture',PMGWavCapture);
