/* Diagnostic partition of the unchanged aperture-viscosity B sound. No model change. */
(function(root){'use strict';
const R=root.StringHoleViscous||(typeof require!=='undefined'?require('./hole-viscous.js'):null);
const views=Object.freeze(['original','component','remainder']);
function config(voice='plain-e4',view='original'){if(!views.includes(view))throw Error('Unknown knock identity view');return {...R.config(voice,'viscous'),bodyView:view,holeKnockIdentityDiagnostic:true};}
function select(result,input){const view=input.bodyView||'original',samples=result.channels[view];if(!views.includes(view)||!samples)throw Error('成分確認の音を選べません');let peak=0;for(const v of samples)peak=Math.max(peak,Math.abs(v));return {...result,samples,peak,spec:{...result.spec,p:{...result.spec.p,...input}},body:{...result.body,view,holeKnockIdentity:{...result.body.holeKnockIdentity,selected:view}}};}
function render(input,sr=48000,options={}){
 const baseInput={...input,bodyView:'viscous'},base=R.render(baseInput,sr,options),{d}=R.dataset(baseInput,sr),candidates=d['viscous'].components.filter(c=>!c.realPole&&Math.abs(c.hz-223)<10);if(candidates.length!==1)throw Error('223 Hz付近の対象共振を一意に選べません');
 const c=candidates[0],h=1/(sr*32),u=-c.sigma*h/2,v=Math.PI*c.hz*h,den=(1-u)**2+v*v,zr=(1-u*u-v*v)/den,zi=2*v/den,rr=Math.hypot(zr,zi)**32,angle=Math.atan2(zi,zr)*32,a=rr*Math.cos(angle),b=rr*Math.sin(angle),delay=base.body.radiation.delaySamples,n=base.samples.length-delay,alpha=1-Math.exp(-2*Math.PI*8000/sr),gain=input.bodyPressureGain;
 const component=new Float32Array(base.samples.length),remainder=new Float32Array(base.samples.length);let [re,im]=c.residue,y=0;
 for(let j=0;j<n;j++){y+=alpha*(2*re-y);const fadeIn=Math.min(1,j/(sr*.003)),fadeOut=options.duration?1:Math.min(1,(n-1-j)/(sr*base.tail.fadeSeconds));component[j+delay]=gain*y*fadeIn*fadeOut;const next=a*re-b*im;im=b*re+a*im;re=next;}
 const original=base.channels['viscous'];let reconstructionError=0;for(let j=0;j<original.length;j++){remainder[j]=original[j]-component[j];reconstructionError=Math.max(reconstructionError,Math.abs(original[j]-component[j]-remainder[j]));}
 return select({...base,channels:{original,component,remainder},body:{...base.body,kind:'hole-knock-identity-diagnostic',holeKnockIdentity:{voice:input.assemblyVoice||'wound-e3',frequencyHz:c.hz,T60Seconds:Math.log(1000)/c.sigma,reference:'viscous',reconstructionMaxErrorFS:reconstructionError,scope:'One complete damped conjugate pole pair, not a bandpass or harmonic EQ. Original=component+remainder within Float32 rounding. Same fixed gain, delay, LPF and fades. Diagnostic readout only; original coupled motion and energy unchanged. Removal is not a physical repair.'}}},input);
}
const api={config,select,render,views};root.StringHoleKnockIdentity=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
