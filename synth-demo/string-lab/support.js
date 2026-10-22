/* One movable endpoint: nut a(1-x/L), or bridge a*x/L, plus sine modes.
   Same bridge-position shear-force monitor in both cases; no acoustic radiation. */
(function(root){
'use strict';
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
function system(input,sampleRate=48000,modeLimit=96){
 if(input.supportSide==='both')return bothSystem(input,sampleRate,modeLimit);
 const spec=P.model({...input,nonlinear:false,releaseMs:0},sampleRate,modeLimit),p=spec.p;
 if(!(p.supportMassG>0)||!(p.supportStiffness>0)||p.supportDamping<0)throw Error('支持部の質量・硬さは正、損失は非負にしてください');
 if(!['nut','bridge'].includes(p.supportSide))throw Error('支持部の位置を確認してください');
 const bridge=p.supportSide==='bridge';
 const mass=p.supportMassG/1000,K0=p.supportStiffness+p.tension/spec.L,C0=p.supportDamping,M0=mass+spec.mu*spec.L/3,n=spec.modes.length;
 const K=new Float64Array(n),C=new Float64Array(n),g=new Float64Array(n),load=new Float64Array(n),q=new Float64Array(n),v=new Float64Array(n);
 const load0=bridge?1-p.position/1000/spec.L:p.position/1000/spec.L;let compliance=load0*load0/K0;
 for(let i=0;i<n;i++){const m=spec.modes[i];K[i]=spec.mass*m.w*m.w;C[i]=2*spec.mass*m.sigma;g[i]=spec.mu/m.k*(bridge?(m.n%2?1:-1):1);load[i]=Math.sin(m.k*(spec.L-p.position/1000));compliance+=load[i]*load[i]/K[i];}
 const force=p.excitation==='displacement'?p.pullMm/1000/compliance:p.force;
 const a=force*load0/K0;for(let i=0;i<n;i++)q[i]=force*load[i]/K[i];
 spec.p.force=force;spec.displacement=force*compliance;
 const result={spec,mass,K0,C0,M0,K,C,g,q,v,a,av:0,bridgeCoefficient:(bridge?1:-1)*p.tension/spec.L};
 spec.energy=energy(result);spec.modes.forEach((mode,i)=>{mode.q=q[i];mode.releasedQ=q[i];mode.releasedV=0;mode.releasedAmplitude=mode.w>mode.sigma?Math.abs(q[i])*mode.w/Math.sqrt(mode.w*mode.w-mode.sigma*mode.sigma):Math.abs(q[i]);});
 return result;
}
function energy(s,q=s.q,v=s.v,a=s.a,av=s.av){
 if(s.endpointCount===2)return bothEnergy(s);
 let E=.5*(s.M0*av*av+s.K0*a*a);for(let i=0;i<q.length;i++)E+=.5*(s.spec.mass*v[i]*v[i]+s.K[i]*q[i]*q[i])+av*s.g[i]*v[i];return E;
}
function stepper(s,sampleRate,oversample=8){
 if(s.endpointCount===2)return bothStepper(s,sampleRate,oversample);
 const h=1/(sampleRate*oversample),h2=h*h/4,m=s.spec.mass,n=s.q.length,A=new Float64Array(n),R=new Float64Array(n),r=new Float64Array(n);
 let schur=s.M0+h*s.C0/2+h2*s.K0;
 for(let i=0;i<n;i++){A[i]=m+h*s.C[i]/2+h2*s.K[i];R[i]=m-h*s.C[i]/2-h2*s.K[i];schur-=s.g[i]*s.g[i]/A[i];}
 if(!(schur>0))throw Error('支持部の質量行列を確認してください');
 const R0=s.M0-h*s.C0/2-h2*s.K0;
 return ()=>{
  const oldA=s.a,oldV=s.av;let rhs0=R0*oldV-h*s.K0*oldA;
  for(let i=0;i<n;i++){r[i]=R[i]*s.v[i]+s.g[i]*oldV-h*s.K[i]*s.q[i];rhs0+=s.g[i]*s.v[i]-s.g[i]*r[i]/A[i];}
  const nextV=rhs0/schur;let power=s.C0*((oldV+nextV)/2)**2;
  for(let i=0;i<n;i++){const next=(r[i]-s.g[i]*nextV)/A[i],mid=(s.v[i]+next)/2;s.q[i]+=h*mid;s.v[i]=next;power+=s.C[i]*mid*mid;}
  s.a=oldA+h*(oldV+nextV)/2;s.av=nextV;return h*power;
 };
}
function bothSystem(input,sampleRate,modeLimit){
 const spec=P.model({...input,nonlinear:false,releaseMs:0},sampleRate,modeLimit),p=spec.p;
 if(!(p.supportMassG>0)||!(p.supportStiffness>0)||p.supportDamping<0)throw Error('支持部の物理条件を確認してください');
 const mass=p.supportMassG/1000,n=spec.modes.length,K0=p.supportStiffness+p.tension/spec.L,Kcross=-p.tension/spec.L,M0=mass+spec.mu*spec.L/3,Mcross=spec.mu*spec.L/6;
 const K=new Float64Array(n),C=new Float64Array(n),g=new Float64Array(n),gR=new Float64Array(n),q=new Float64Array(n),v=new Float64Array(n),unit=new Float64Array(n);
 const left=p.position/1000/spec.L,right=1-left,det=K0*K0-Kcross*Kcross;
 const aL=(K0*left-Kcross*right)/det,aR=(K0*right-Kcross*left)/det;let compliance=left*aL+right*aR;
 for(let i=0;i<n;i++){const m=spec.modes[i],shape=Math.sin(m.k*(spec.L-p.position/1000));K[i]=spec.mass*m.w*m.w;C[i]=2*spec.mass*m.sigma;g[i]=spec.mu/m.k;gR[i]=g[i]*(m.n%2?1:-1);unit[i]=shape/K[i];compliance+=shape*unit[i];}
 const force=p.excitation==='displacement'?p.pullMm/1000/compliance:p.force;for(let i=0;i<n;i++)q[i]=force*unit[i];
 const s={endpointCount:2,spec,mass,K0,Kcross,M0,Mcross,C0:p.supportDamping,K,C,g,gR,q,v,ends:Float64Array.of(force*aL,force*aR),endV:new Float64Array(2)};
 spec.p.force=force;spec.displacement=force*compliance;spec.energy=bothEnergy(s);
 spec.modes.forEach((m,i)=>{m.q=q[i];m.releasedQ=q[i];m.releasedV=0;m.releasedAmplitude=m.w>m.sigma?Math.abs(q[i])*m.w/Math.sqrt(m.w*m.w-m.sigma*m.sigma):Math.abs(q[i]);});return s;
}
function bothEnergy(s){
 const a=s.ends,v=s.endV;let E=.5*(s.M0*(v[0]*v[0]+v[1]*v[1])+s.K0*(a[0]*a[0]+a[1]*a[1]))+s.Mcross*v[0]*v[1]+s.Kcross*a[0]*a[1];
 for(let i=0;i<s.q.length;i++)E+=.5*(s.spec.mass*s.v[i]*s.v[i]+s.K[i]*s.q[i]*s.q[i])+(v[0]*s.g[i]+v[1]*s.gR[i])*s.v[i];return E;
}
function bothStepper(s,sampleRate,oversample){
 const h=1/(sampleRate*oversample),h2=h*h/4,n=s.q.length,m=s.spec.mass,A=new Float64Array(n),R=new Float64Array(n),r=new Float64Array(n);
 let diag=s.M0+h*s.C0/2+h2*s.K0,off=s.Mcross+h2*s.Kcross;
 for(let i=0;i<n;i++){A[i]=m+h*s.C[i]/2+h2*s.K[i];R[i]=m-h*s.C[i]/2-h2*s.K[i];diag-=s.g[i]*s.g[i]/A[i];off-=s.g[i]*s.gR[i]/A[i];}
 const det=diag*diag-off*off;if(!(det>0))throw Error('両端支持の質量行列を確認してください');
 const R0=s.M0-h*s.C0/2-h2*s.K0,Rcross=s.Mcross-h2*s.Kcross;
 return ()=>{
  const vL=s.endV[0],vR=s.endV[1],aL=s.ends[0],aR=s.ends[1];let l=R0*vL+Rcross*vR-h*(s.K0*aL+s.Kcross*aR),rr=R0*vR+Rcross*vL-h*(s.K0*aR+s.Kcross*aL);
  for(let i=0;i<n;i++){r[i]=R[i]*s.v[i]+s.g[i]*vL+s.gR[i]*vR-h*s.K[i]*s.q[i];l+=s.g[i]*(s.v[i]-r[i]/A[i]);rr+=s.gR[i]*(s.v[i]-r[i]/A[i]);}
  const nextL=(diag*l-off*rr)/det,nextR=(diag*rr-off*l)/det,midL=(vL+nextL)/2,midR=(vR+nextR)/2;let power=s.C0*(midL*midL+midR*midR);
  for(let i=0;i<n;i++){const next=(r[i]-s.g[i]*nextL-s.gR[i]*nextR)/A[i],mid=(s.v[i]+next)/2;s.q[i]+=h*mid;s.v[i]=next;power+=s.C[i]*mid*mid;}
  s.ends[0]+=h*midL;s.ends[1]+=h*midR;s.endV[0]=nextL;s.endV[1]=nextR;return h*power;
 };
}
function render(input,sampleRate=48000,options={}){
 if(input.nonlinear)throw Error('支持部の試作は追加張力オフで比較してください');
 const s=system(input,sampleRate,options.modeLimit||96),spec=s.spec,n=s.q.length,oversample=options.oversample||8,step=stepper(s,sampleRate,oversample);
 const duration=options.autoTail?60:(options.duration||spec.p.duration),size=Math.ceil(sampleRate*duration),samples=new Float32Array(size),initialEnergy=energy(s);
 const gain=.1*10**(spec.p.gain/20),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate),trace=[],indices=[1,3,6,9].filter(v=>v<=n);
 const initialModal=indices.map(n=>{const i=n-1;return .5*s.K[i]*s.q[i]*s.q[i];});
 let coefficient=s.endpointCount===2?2*(spec.p.tension/spec.L)**2/(s.K0-s.Kcross):s.bridgeCoefficient**2/s.K0;for(let i=0;i<n;i++)coefficient+=spec.modes[i].bridge**2/s.K[i];
 let y=0,peak=0,used=size,quiet=false,dissipated=0,maxBalanceError=0,maxEnergy=initialEnergy;
 for(let j=0;j<size;j++){
  let force=s.endpointCount===2?spec.p.tension/spec.L*(s.ends[1]-s.ends[0]):s.bridgeCoefficient*s.a;for(let i=0;i<n;i++)force+=spec.modes[i].bridge*s.q[i];
  y+=alpha*(force-y);samples[j]=gain*y*Math.min(1,j/(sampleRate*.003));peak=Math.max(peak,Math.abs(samples[j]));
  if(j%Math.max(1,Math.round(sampleRate*.01))===0){
   const E=energy(s),supportEnergy=s.endpointCount===2?.5*(s.mass*(s.endV[0]**2+s.endV[1]**2)+spec.p.supportStiffness*(s.ends[0]**2+s.ends[1]**2)):.5*(s.mass*s.av*s.av+spec.p.supportStiffness*s.a*s.a);maxEnergy=Math.max(maxEnergy,E);
   maxBalanceError=Math.max(maxBalanceError,Math.abs(E+dissipated-initialEnergy));
   trace.push({t:j/sampleRate,energy:E,supportEnergy,modal:indices.map((n,k)=>{const i=n-1,e=.5*(spec.mass*s.v[i]*s.v[i]+s.K[i]*s.q[i]*s.q[i]);return {n,db:initialModal[k]>1e-30?10*Math.log10(Math.max(e/initialModal[k],1e-20)):null};})});
   if(options.autoTail&&j/sampleRate>=spec.p.duration&&gain*Math.sqrt(2*E*coefficient)<1e-5&&Math.abs(gain*y)<1e-5){used=j+1;quiet=true;break;}
  }
  for(let sub=0;sub<oversample;sub++)dissipated+=step();
 }
 const capped=!!options.autoTail&&!quiet,fade=capped?2:.02,output=samples.slice(0,used);
 for(let j=Math.max(0,used-Math.ceil(fade*sampleRate));j<used;j++)output[j]*=Math.max(0,Math.min(1,(used-1-j)/(fade*sampleRate)));
 return {samples:output,sampleRate,spec,peak,tail:{duration:used/sampleRate,capped,fadeSeconds:fade},support:{side:spec.p.supportSide,endpointCount:s.endpointCount||1,massKg:s.mass,stiffness:spec.p.supportStiffness,damping:s.C0,resonanceHz:Math.sqrt(spec.p.supportStiffness/s.mass)/(2*Math.PI),initialEnergy,finalEnergy:energy(s),dissipated,maxBalanceError,maxEnergy,oversample,trace}};
}
root.StringSupport={system,energy,stepper,render};if(typeof module!=='undefined')module.exports=root.StringSupport;
})(globalThis);
