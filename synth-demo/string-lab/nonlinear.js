/* Kirchhoff-Carrier modal tension coupling. Independent of the linear renderer. */
(function(root){
'use strict';
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
function initial(input,sampleRate=48000,modeLimit=96){
 const s=P.model({...input,releaseMs:0},sampleRate,modeLimit),m=s.mass,EA=s.cross.axialEA;
 const shapes=s.modes.map(a=>Math.sin(a.k*(s.L-s.p.position/1000)));
 function candidate(delta){
  const units=s.modes.map((a,i)=>shapes[i]/(m*(a.w*a.w+delta*a.k*a.k/s.mu)));
  const compliance=units.reduce((sum,q,i)=>sum+q*shapes[i],0);
  const force=s.p.excitation==='displacement'?s.p.pullMm/1000/compliance:s.p.force;
  const q=units.map(v=>force*v),S=q.reduce((sum,v,i)=>sum+s.modes[i].k**2*v*v,0);
  return {q,force,delta:EA*S/4};
 }
 let lo=0,hi=Math.max(1,candidate(0).delta);while(candidate(hi).delta>hi)hi*=2;
 for(let j=0;j<60;j++){const mid=(lo+hi)/2;if(candidate(mid).delta>mid)lo=mid;else hi=mid;}
 const state=candidate((lo+hi)/2);s.p.force=state.force;
 s.displacement=state.q.reduce((sum,q,i)=>sum+q*shapes[i],0);
 s.modes.forEach((mode,i)=>{mode.q=state.q[i];mode.releasedQ=state.q[i];mode.releasedV=0;mode.releasedAmplitude=mode.w>mode.sigma?Math.abs(state.q[i])*mode.w/Math.sqrt(mode.w*mode.w-mode.sigma*mode.sigma):Math.abs(state.q[i]);});
 s.energy=energy(s,state.q,new Float64Array(state.q.length));
 return {spec:s,q:Float64Array.from(state.q),v:new Float64Array(state.q.length),initialDelta:state.delta};
}
function energy(s,q,v){let e=0,S=0;for(let i=0;i<q.length;i++){const a=s.modes[i];e+=s.mass*(v[i]*v[i]+a.w*a.w*q[i]*q[i])/2;S+=a.k*a.k*q[i]*q[i];}return e+s.cross.axialEA*s.L*S*S/32;}
function render(input,sampleRate=48000,options={}){
 const init=initial(input,sampleRate,options.modeLimit||96),s=init.spec,q=init.q,v=init.v,n=q.length,EA=s.cross.axialEA;
 const requested=options.duration||s.p.duration,maxSeconds=options.autoTail?60:requested,maxSamples=Math.ceil(maxSeconds*sampleRate);
 const maximumKick=Math.sqrt(Math.max(init.initialDelta,0)/s.mu)*s.modes[n-1].k;
 const oversample=options.oversample||Math.max(4,Math.ceil(maximumKick/(.2*sampleRate)));
 if(oversample>32)throw Error('この条件は時間刻みの精度範囲を超えます。引く量か硬さを下げてください。');
 const dt=1/(sampleRate*oversample),a=new Float64Array(n),b=new Float64Array(n),d=new Float64Array(n),k2=new Float64Array(n),w2=new Float64Array(n),bridge0=new Float64Array(n),bridgeK=new Float64Array(n);
 for(let i=0;i<n;i++){const mode=s.modes[i],p=P.freeState(mode,dt,1,0),r=P.freeState(mode,dt,0,1);a[i]=p.q;b[i]=r.q;d[i]=r.v;k2[i]=mode.k**2;w2[i]=mode.w*mode.w;bridgeK[i]=mode.k*(mode.n%2?-1:1);bridge0[i]=mode.bridge;}
 let delta=init.initialDelta,peak=0,y=0,used=maxSamples,endedQuietly=false,lastQ=q[0],lastCross=null,maxEnergy=0;
 const initialEnergy=energy(s,q,v),samples=new Float32Array(maxSamples),trace=[],pitch=[];
 const gain=.1*10**(s.p.gain/20),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate),threshold=1e-5;
 let sumDelta=0,countDelta=0;
 for(let j=0;j<maxSamples;j++){
  let force=0;for(let i=0;i<n;i++)force+=(bridge0[i]+delta*bridgeK[i])*q[i];
  y+=alpha*(force-y);samples[j]=y*gain*Math.min(1,j/(.003*sampleRate));peak=Math.max(peak,Math.abs(samples[j]));
  const t=j/sampleRate;
  if(j>0&&lastQ<0&&q[0]>=0){const cross=(j-1+(-lastQ)/(q[0]-lastQ))/sampleRate;if(lastCross!==null&&cross-lastCross>0)pitch.push({t:cross,hz:1/(cross-lastCross)});lastCross=cross;}lastQ=q[0];
  sumDelta+=delta;countDelta++;
  if(j%Math.max(1,Math.round(sampleRate*.02))===0){
   const E=energy(s,q,v);maxEnergy=Math.max(maxEnergy,E);trace.push({t,delta:sumDelta/countDelta,energy:E});sumDelta=0;countDelta=0;
   if(initialEnergy>0&&E>initialEnergy*1.001)throw Error('非線形計算のエネルギー誤差が大きくなりました。引く量を下げてください。');
   // Conservative maximum force from the remaining mechanical energy.
   const maxDelta=Math.sqrt(Math.max(0,2*EA*E/s.L));let coeff=0;
   for(let i=0;i<n;i++){const mode=s.modes[i],B=(s.p.tension+maxDelta)*mode.k+s.ei*mode.k**3;coeff+=B*B/(s.mass*mode.w*mode.w);}
   const bound=gain*Math.sqrt(2*E*coeff);
   if(options.autoTail&&t>=requested&&bound<threshold&&Math.abs(y*gain)<threshold){used=j+1;endedQuietly=true;break;}
  }
  for(let sub=0;sub<oversample;sub++){
   const kick=.5*dt*delta/s.mu;
   let S=0;
   for(let i=0;i<n;i++){const qi=q[i],vi=v[i]-kick*k2[i]*qi,next=a[i]*qi+b[i]*vi;q[i]=next;v[i]=-w2[i]*b[i]*qi+d[i]*vi;S+=k2[i]*next*next;}
   delta=EA*S/4;const kick2=.5*dt*delta/s.mu;
   for(let i=0;i<n;i++)v[i]-=kick2*k2[i]*q[i];
  }
 }
 const capped=!!options.autoTail&&!endedQuietly,fade=capped?2:.02;
 const output=samples.slice(0,used);for(let j=Math.max(0,used-Math.ceil(fade*sampleRate));j<used;j++)output[j]*=Math.max(0,Math.min(1,(used-1-j)/(fade*sampleRate)));
 const result={samples:output,sampleRate,spec:s,peak,tail:{duration:used/sampleRate,capped,threshold,fadeSeconds:fade},nonlinear:{initialDelta:init.initialDelta,initialEnergy,finalEnergy:energy(s,q,v),maxEnergy,oversample,trace,pitch: pitch.filter((_,i)=>i%Math.max(1,Math.floor(pitch.length/250))===0)}};
 return result;
}
root.StringNonlinear={initial,energy,render};if(typeof module!=='undefined')module.exports=root.StringNonlinear;
})(globalThis);
