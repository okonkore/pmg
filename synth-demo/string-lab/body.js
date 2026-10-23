/* Passive string/top/cavity/port model. Coordinates: top and port outward.
   Observer is top velocity, not calibrated microphone radiation. */
(function(root){
'use strict';
const S=root.StringSupport||(typeof require!=='undefined'?require('./support.js'):null);
function system(input,sr=48000,limit=96){
 if(!['plate','air'].includes(input.bodyId))throw Error('Unknown body comparison');
 const s=S.system({...input,supportEnabled:true,supportSide:'bridge',supportMassG:50,supportStiffness:60000,supportDamping:1.5},sr,limit);
 const rho=1.2,c=343,area=.03,volume=.012,radius=.04,wall=.003;
 const hole=Math.PI*radius*radius,length=wall+1.46*radius,compress=rho*c*c/volume;
 s.body={topMass:.05,topStiffness:60000,topDamping:1.5,effectiveArea:area,volume,holeRadius:radius,wallThickness:wall,endCorrectionRadii:1.46,airDensity:rho,soundSpeed:c};
 s.airMass=rho*hole*length;s.airC=.02;s.cross=0;s.airK=1;s.u=0;s.uv=0;
 if(input.bodyId==='air'){
  s.K0+=compress*area*area;s.cross=compress*area*hole;s.airK=compress*hole*hole;
  s.u=-s.cross*s.a/s.airK;
 }
 s.spec.energy=energy(s);return s;
}
function energy(s){return S.energy(s)+.5*(s.airMass*s.uv*s.uv+s.airK*s.u*s.u)+s.cross*s.a*s.u;}
function stepper(s,sr,oversample=8){
 const h=1/(sr*oversample),h2=h*h/4,m=s.spec.mass,n=s.q.length,A=new Float64Array(n),R=new Float64Array(n),r=new Float64Array(n);
 let aa=s.M0+h*s.C0/2+h2*s.K0;const bb=s.airMass+h*s.airC/2+h2*s.airK,ab=h2*s.cross;
 for(let i=0;i<n;i++){A[i]=m+h*s.C[i]/2+h2*s.K[i];R[i]=m-h*s.C[i]/2-h2*s.K[i];aa-=s.g[i]*s.g[i]/A[i];}
 const det=aa*bb-ab*ab;if(!(det>0&&aa>0))throw Error('Body mass matrix must be positive');
 return ()=>{
  const av=s.av,uv=s.uv;
  let ra=(s.M0-h*s.C0/2-h2*s.K0)*av-h2*s.cross*uv-h*(s.K0*s.a+s.cross*s.u);
  const rb=(s.airMass-h*s.airC/2-h2*s.airK)*uv-h2*s.cross*av-h*(s.airK*s.u+s.cross*s.a);
  for(let i=0;i<n;i++){r[i]=R[i]*s.v[i]+s.g[i]*av-h*s.K[i]*s.q[i];ra+=s.g[i]*(s.v[i]-r[i]/A[i]);}
  const na=(bb*ra-ab*rb)/det,nu=(aa*rb-ab*ra)/det,ma=(av+na)/2,mu=(uv+nu)/2;
  let power=s.C0*ma*ma+s.airC*mu*mu;
  for(let i=0;i<n;i++){const nv=(r[i]-s.g[i]*na)/A[i],mv=(s.v[i]+nv)/2;s.q[i]+=h*mv;s.v[i]=nv;power+=s.C[i]*mv*mv;}
  s.a+=h*ma;s.u+=h*mu;s.av=na;s.uv=nu;return h*power;
 };
}
function render(input,sr=48000,options={}){
 const s=system(input,sr,options.modeLimit||96),oversample=options.oversample||8,step=stepper(s,sr,oversample),initialEnergy=energy(s);
 const size=Math.ceil(sr*(options.duration||30)),samples=new Float32Array(size),gain=2,alpha=1-Math.exp(-2*Math.PI*8000/sr);
 let y=0,peak=0,dissipated=0,maxBalanceError=0,used=size,quiet=false;
 for(let j=0;j<size;j++){
  y+=alpha*(s.av-y);samples[j]=gain*y*Math.min(1,j/(sr*.003));peak=Math.max(peak,Math.abs(samples[j]));
  if(j%480===0){const E=energy(s);maxBalanceError=Math.max(maxBalanceError,Math.abs(E+dissipated-initialEnergy));
   if(j>sr*4&&gain*Math.sqrt(2*E/s.body.topMass)<1e-5&&Math.abs(gain*y)<1e-5){used=j+1;quiet=true;break;}}
  for(let k=0;k<oversample;k++)dissipated+=step();
 }
 const output=samples.slice(0,used),fade=quiet?.02:2;
 for(let j=Math.max(0,used-Math.ceil(sr*fade));j<used;j++)output[j]*=(used-1-j)/(sr*fade);
 return {samples:output,sampleRate:sr,spec:s.spec,peak,tail:{duration:used/sr,capped:!quiet,fadeSeconds:fade},body:{...s.body,kind:input.bodyId,observer:'top velocity; 2 FS per m/s; fixed 8 kHz lowpass',airMass:s.airMass,airDamping:s.airC,initialEnergy,finalEnergy:energy(s),dissipated,maxBalanceError,oversample}};
}
root.StringBody={system,energy,stepper,render};if(typeof module!=='undefined')module.exports=root.StringBody;
})(globalThis);
