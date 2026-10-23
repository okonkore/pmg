/* Diagnostic linear-phase FIR split. All views share one physical trajectory.
   band + residual = delayed whole. No normalization of individual sounds. */
(function(root){
'use strict';
const Plate=root.StringPlate||(typeof require!=='undefined'?require('./plate.js'):null),kernels=new Map();
function fft(re,im,inverse=false){
 const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
 for(let size=2;size<=n;size<<=1){const angle=(inverse?2:-2)*Math.PI/size,wr0=Math.cos(angle),wi0=Math.sin(angle),half=size>>1;for(let offset=0;offset<n;offset+=size){let wr=1,wi=0;for(let j=0;j<half;j++){const a=offset+j,b=a+half,tr=wr*re[b]-wi*im[b],ti=wr*im[b]+wi*re[b];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=next;}}}
 if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
}
function kernel(sampleRate){
 if(!(Number.isFinite(sampleRate)&&sampleRate>=8000&&sampleRate<=192000))throw Error('Invalid diagnostic sample rate');
 if(kernels.has(sampleRate))return kernels.get(sampleRate);
 const centerHz=165,lowHz=140,highHz=190,half=Math.round(.085*sampleRate),length=2*half+1,taps=new Float64Array(length);let gain=0;
 for(let j=0;j<length;j++){const m=j-half,ideal=m===0?2*(highHz-lowHz)/sampleRate:(Math.sin(2*Math.PI*highHz*m/sampleRate)-Math.sin(2*Math.PI*lowHz*m/sampleRate))/(Math.PI*m),window=.42-.5*Math.cos(2*Math.PI*j/(length-1))+.08*Math.cos(4*Math.PI*j/(length-1));taps[j]=ideal*window;gain+=taps[j]*Math.cos(2*Math.PI*centerHz*m/sampleRate);}
 for(let j=0;j<length;j++)taps[j]/=gain;
 const result={taps,half,centerHz,lowHz,highHz};kernels.set(sampleRate,result);return result;
}
function convolve(samples,taps){
 let size=32768;while(size<2*taps.length)size*=2;
 const hop=size-taps.length+1,kr=new Float64Array(size),ki=new Float64Array(size);kr.set(taps);fft(kr,ki);
 const re=new Float64Array(size),im=new Float64Array(size),output=new Float64Array(samples.length+taps.length-1);
 for(let offset=0;offset<samples.length;offset+=hop){re.fill(0);im.fill(0);const count=Math.min(hop,samples.length-offset);re.set(samples.subarray(offset,offset+count));fft(re,im);for(let j=0;j<size;j++){const real=re[j]*kr[j]-im[j]*ki[j];im[j]=re[j]*ki[j]+im[j]*kr[j];re[j]=real;}fft(re,im,true);const used=count+taps.length-1;for(let j=0;j<used;j++)output[offset+j]+=re[j];}
 return Float32Array.from(output);
}
function split(samples,sampleRate){
 const k=kernel(sampleRate),band=convolve(samples,k.taps),whole=new Float32Array(band.length);whole.set(samples,k.half);
 const residual=Float32Array.from(whole,(v,j)=>v-band[j]);
 return {whole,band,residual,metadata:{centerHz:k.centerHz,lowHz:k.lowHz,highHz:k.highHz,type:'Blackman-windowed sinc FIR; linear phase; complementary residual',taps:k.taps.length,commonDelaySamples:k.half,commonDelaySeconds:k.half/sampleRate,normalization:'unity gain at 165 Hz; no per-sound level normalization',scope:'Frequency-band diagnosis, not an isolated mechanical eigenmode; filtering can reshape transients'}};
}
function select(result,input){
 const view=input.bodyView||'band-whole';if(!['band-whole','band-only','band-rest'].includes(view))throw Error('Unknown frequency diagnostic view');
 const selected=Plate.select(result,{...input,bodyView:view});return {...selected,body:{...selected.body,frequencyDiagnostic:{...selected.body.frequencyDiagnostic,selectedView:view}}};
}
function render(input,sampleRate=48000,options={}){
 const original=Plate.render({...input,bodyView:'sum',plateStartDiagnostic:false,plateDiagnostic:false},sampleRate,options),s=split(original.samples,sampleRate);
 const channels={...original.channels,'band-whole':s.whole,'band-only':s.band,'band-rest':s.residual};
 const result={...original,channels,tail:{...original.tail,duration:s.whole.length/sampleRate},body:{...original.body,frequencyDiagnostic:s.metadata}};
 return select(result,input);
}
root.StringPlateBand={fft,kernel,convolve,split,select,render};if(typeof module!=='undefined')module.exports=root.StringPlateBand;
})(globalThis);
