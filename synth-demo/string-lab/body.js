/* Passive string/top/cavity/port model. Coordinates: top and port outward.
   Observers: top velocity and optional low-frequency compact-monopole pressure. */
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
// Compact monopole approximation: p(r,t)=rho/(4*pi*r)*dQ(t-r/c)/dt.
// One-way observer: radiation loading is NOT added to the mechanical equations.
function radiationObserver(s,distance=1){
 if(!(distance>0&&Number.isFinite(distance)))throw Error('Observation distance must be positive');
 const m=s.spec.mass,n=s.q.length,rho=s.body.airDensity,A=s.body.effectiveArea,Sarea=Math.PI*s.body.holeRadius**2;
 let schur=s.M0;for(let i=0;i<n;i++)schur-=s.g[i]**2/m;
 const topFactor=rho*A/(4*Math.PI*distance),holeFactor=rho*Sarea/(4*Math.PI*distance);
 function norm(top,hole){
  const t=top*topFactor/schur,u=hole*holeFactor/s.airMass;
  const xa=-t*s.K0-u*s.cross,xu=-t*s.cross-u*s.airK,va=-t*s.C0,vu=-u*s.airC;
  const det=s.K0*s.airK-s.cross**2;
  let result=(s.airK*xa*xa-2*s.cross*xa*xu+s.K0*xu*xu)/det+vu*vu/s.airMass,cross=va;
  for(let i=0;i<n;i++){const x=t*s.g[i]*s.K[i]/m,v=t*s.g[i]*s.C[i]/m;result+=x*x/s.K[i]+v*v/m;cross-=s.g[i]*v/m;}
  return result+cross*cross/schur;
 }
 return {distance,coefficient:Math.max(norm(1,0),norm(0,1),norm(1,1)),read(){
  let force=-s.C0*s.av-s.K0*s.a-s.cross*s.u;
  for(let i=0;i<n;i++)force+=s.g[i]*(s.C[i]*s.v[i]+s.K[i]*s.q[i])/m;
  const top=topFactor*force/schur,hole=holeFactor*(-s.airC*s.uv-s.airK*s.u-s.cross*s.a)/s.airMass;
  return [top,hole,top+hole];
 }};
}
function select(result,input){
 const view=input.bodyView||'velocity';if(!['velocity','top','hole','sum'].includes(view))throw Error('Unknown body observer');
 if(!result.channels)return result;
 const samples=result.channels[view];let peak=0;for(const v of samples)peak=Math.max(peak,Math.abs(v));
 return {...result,samples,peak,spec:{...result.spec,p:{...result.spec.p,bodyView:view}},body:{...result.body,view,observer:view==='velocity'?'top velocity; 8 FS per m/s; fixed 8 kHz lowpass':'compact monopole pressure '+view+'; 4 FS/Pa; fixed 8 kHz lowpass'}};
}
function render(input,sr=48000,options={}){
 const s=system(input,sr,options.modeLimit||96),oversample=options.oversample||8,step=stepper(s,sr,oversample),initialEnergy=energy(s);
 const radiation=!!input.bodyView;if(radiation&&input.bodyId!=='air')throw Error('Radiation comparison requires the open cavity');
 const observer=radiation?radiationObserver(s):null;
 const size=Math.ceil(sr*(options.duration||30)),samples=new Float32Array(size),gain=8,pressureGain=4,alpha=1-Math.exp(-2*Math.PI*8000/sr);
 const raw=radiation?{velocity:samples,top:new Float32Array(size),hole:new Float32Array(size),sum:new Float32Array(size)}:null;
 let y=0,topY=0,holeY=0,peak=0,dissipated=0,maxBalanceError=0,used=size,quiet=false;
 for(let j=0;j<size;j++){
  const start=Math.min(1,j/(sr*.003));
  y+=alpha*(s.av-y);samples[j]=gain*y*start;peak=Math.max(peak,Math.abs(samples[j]));
  if(observer){const pressure=observer.read();topY+=alpha*(pressure[0]-topY);holeY+=alpha*(pressure[1]-holeY);raw.top[j]=pressureGain*topY*start;raw.hole[j]=pressureGain*holeY*start;raw.sum[j]=raw.top[j]+raw.hole[j];}
  if(j%480===0){const E=energy(s);maxBalanceError=Math.max(maxBalanceError,Math.abs(E+dissipated-initialEnergy));
   const velocityQuiet=gain*Math.sqrt(2*E/s.body.topMass)<1e-5&&Math.abs(gain*y)<1e-5;
   const pressureQuiet=!observer||(pressureGain*Math.sqrt(2*E*observer.coefficient)<1e-5&&pressureGain*Math.max(Math.abs(topY),Math.abs(holeY),Math.abs(topY+holeY))<1e-5);
   if(j>sr*4&&velocityQuiet&&pressureQuiet){used=j+1;quiet=true;break;}}
  for(let k=0;k<oversample;k++)dissipated+=step();
 }
 const fade=quiet?.02:2,delay=observer?Math.round(sr/s.body.soundSpeed):0;
 function finish(data){const output=new Float32Array(used+delay);output.set(data.subarray(0,used),delay);for(let j=Math.max(0,used-Math.ceil(sr*fade));j<used;j++)output[j+delay]*=(used-1-j)/(sr*fade);return output;}
 const channels=raw?Object.fromEntries(Object.entries(raw).map(([id,data])=>[id,finish(data)])):undefined;
 const output=channels?channels.velocity:finish(samples);
 const result={samples:output,channels,sampleRate:sr,spec:s.spec,peak,tail:{duration:output.length/sr,capped:!quiet,fadeSeconds:fade},body:{...s.body,kind:input.bodyId,observer:'top velocity; 8 FS per m/s; fixed 8 kHz lowpass',airMass:s.airMass,airDamping:s.airC,initialEnergy,finalEnergy:energy(s),dissipated,maxBalanceError,oversample,
  ...(observer?{radiation:{approximation:'co-located compact monopoles; low frequency; rigid back and sides',distanceM:1,pressureGainFSPerPa:pressureGain,delaySamples:delay,delaySeconds:delay/sr,radiationLoading:false,coefficient:observer.coefficient}}:{})}};
 return select(result,input);
}
root.StringBody={system,energy,stepper,radiationObserver,select,render};if(typeof module!=='undefined')module.exports=root.StringBody;
})(globalThis);
