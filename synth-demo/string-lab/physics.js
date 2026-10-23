/* Plain / homogenized wound, simply-supported stiff string. SI internally. No per-note EQ. */
(function(root){
'use strict';
const TAU=2*Math.PI;
const defaults={scale:650,fret:5,diameter:1.02,density:1140,young:2,tension:60.475,position:80,force:.3,lossAngle:.02,thermal:.001,air:true,duration:4,gain:0,construction:"plain",coreDiameter:.65,coreFill:.65,filaments:100,coreCoupling:0,wireDiameter:.11,wireDensity:8900,wireYoung:110,pitchRatio:1,windingParticipation:0,windingLossAngle:.02,compareHz:196,releaseMs:0,excitation:"force",pullMm:1,nonlinear:false,supportEnabled:false,supportMassG:10,supportStiffness:100000,supportDamping:5,supportSide:"nut",contactWidthMm:0};
// Close-packed single-layer round winding; all dimensions below in SI.
// Partial interaction is an explicit hypothesis, not a measured friction law.
function section(input){
 const p={...defaults,...input};
 if(!['plain','wound'].includes(p.construction))throw Error('弦の構造を確認してください');
 const positive=['diameter','density'];
 const nonnegative=['young','lossAngle','thermal'];
 if(p.construction==='wound'){
  positive.push('coreDiameter','coreFill','filaments','wireDiameter','wireDensity','pitchRatio');
  nonnegative.push('wireYoung','windingLossAngle','coreCoupling','windingParticipation');
 }
 for(const key of positive)if(!Number.isFinite(p[key])||p[key]<=0)throw Error('正の値が必要です: '+key);
 for(const key of nonnegative)if(!Number.isFinite(p[key])||p[key]<0)throw Error('非負の値が必要です: '+key);
 if(p.construction==='plain'){
  const d=p.diameter/1000,area=Math.PI*d*d/4,ei=p.young*1e9*Math.PI*d**4/64;
  return {axialEA:p.young*1e9*area,diameter:d,mu:p.density*area,ei,coreMu:p.density*area,wireMu:0,coreEi:ei,wireEi:0,bendingLoss:ei*p.lossAngle,helixRatio:0};
 }
 if(p.coreFill>1||p.coreCoupling>1||p.windingParticipation>1||p.pitchRatio<1||!Number.isInteger(p.filaments))throw Error('充填率・曲げ寄与は0〜1、巻きピッチ比は1以上、繊維数は整数です');
 const dc=p.coreDiameter/1000,dw=p.wireDiameter/1000,D=dc+2*dw;
 const coreArea=p.coreFill*Math.PI*dc*dc/4,wireArea=Math.PI*dw*dw/4;
 const pitch=dw*p.pitchRatio,helixRatio=Math.hypot(1,Math.PI*(dc+dw)/pitch);
 const coreMu=p.density*coreArea,wireMu=p.wireDensity*wireArea*helixRatio;
 // N equal freely sliding circular filaments: sum(E I_f) = E A_c^2/(4 pi N).
 const coreSlip=p.young*1e9*coreArea**2/(4*Math.PI*p.filaments);
 // Uniformly filled bonded bundle reference (no claim of exact packing).
 const coreBonded=p.young*1e9*p.coreFill*Math.PI*dc**4/64;
 const coreEi=coreSlip+p.coreCoupling*(coreBonded-coreSlip);
 // Same winding volume spread uniformly across an annulus, aligned axially.
 // This is only a stiffness reference, not the stiffness of a helical wire.
 const wireReference=p.wireYoung*1e9*(wireMu/p.wireDensity)*(D*D+dc*dc)/16;
 const wireEi=p.windingParticipation*wireReference,ei=coreEi+wireEi;
 return {axialEA:p.young*1e9*coreArea,diameter:D,mu:coreMu+wireMu,ei,coreMu,wireMu,coreEi,wireEi,coreSlip,coreBonded,wireReference,helixRatio,pitch,
 bendingLoss:coreEi*p.lossAngle+wireEi*p.windingLossAngle};
}
function model(input,sampleRate=48000,modeLimit=96){
 if(!Number.isInteger(modeLimit)||modeLimit<1||modeLimit>512)throw Error("モード数を確認してください");
 const p={...defaults,...input};
 for(const key of Object.keys(defaults))if(!['air','construction','excitation','nonlinear','supportEnabled','supportSide'].includes(key)&&!Number.isFinite(p[key]))throw Error('有限の数値を指定してください: '+key);
 if(p.scale<=0||p.diameter<=0||p.density<=0||p.young<0||p.tension<=0||p.force<0||p.fret<0||p.fret>24||p.position<=0||p.duration<=0||p.duration>10||sampleRate<8000||p.lossAngle<0||p.thermal<0||p.releaseMs<0||p.releaseMs>30)throw Error('物理条件の範囲を確認してください');
 const L=p.scale/1000*2**(-p.fret/12),cross=section(p),d=cross.diameter,mu=cross.mu,ei=cross.ei;
 const distance=p.position/1000;if(distance>=L)throw Error('はじく位置は振動する弦長より短くしてください');
 const width=p.contactWidthMm/1000;if(width<0||width/2>=Math.min(distance,L-distance))throw Error('引く範囲が弦の端を越えています');
 if(width>0&&(p.nonlinear||p.supportEnabled))throw Error('広い荷重は固定支持・線形モデルで比較してください');
 // Integral of a normalized uniform load over its centered contact interval.
 const loadShape=k=>Math.sin(k*(L-distance))*(width===0?1:Math.sin(k*width/2)/(k*width/2));
 const x=L-distance,mass=mu*L/2,modes=[];let compliance=0,energy=0;
 if(!['force','displacement'].includes(p.excitation)||p.pullMm<0)throw Error('引く量の条件を確認してください');
 if(p.excitation==='displacement'){
  let c=0;
  for(let n=1;n<=modeLimit;n++){const k=n*Math.PI/L,w2=(p.tension*k*k+ei*k**4)/mu;if(Math.sqrt(w2)/TAU>=sampleRate*.425)break;c+=loadShape(k)**2/(mass*w2);}
  if(!(c>0))throw Error('この条件では引く量を計算できません');
  p.force=p.pullMm/1000/c;
 }
 for(let n=1;n<=modeLimit;n++){
  const k=n*Math.PI/L,w=Math.sqrt((p.tension*k*k+ei*k**4)/mu),hz=w/TAU;
  if(hz>=sampleRate*.425)break;
  const shape=loadShape(k),q=p.force*shape/(mass*w*w);
  const air=p.air?(2*Math.PI*1.8e-5+2*Math.PI*d*Math.sqrt(Math.PI*1.8e-5*1.2*hz))/(2*mu):0;
  const ve=4*Math.PI**3*mu*cross.bendingLoss/p.tension**2*hz**3;
  const thermal=Math.PI*hz*p.thermal,sigma=air+ve+thermal;
  const bridge=(p.tension*k+ei*k**3)*(n%2?-1:1);
  const released=releaseState({w,sigma,q},p.releaseMs/1000,p.releaseMs/1000);
  const wd2=w*w-sigma*sigma;
  const releasedAmplitude=wd2>0?Math.hypot(released.q,(released.v+sigma*released.q)/Math.sqrt(wd2)):Math.abs(released.q)+Math.abs(released.v)/w;
  modes.push({n,k,w,hz,q,bridge,sigma,air,ve,thermal,releasedQ:released.q,releasedV:released.v,releasedAmplitude,dbPerSecond:20/Math.LN10*sigma});
  compliance+=shape*shape/(mass*w*w);energy+=mass*w*w*q*q/2;
 }
 if(!modes.length)throw Error('このサンプルレートでは基音を計算できません');
 return {p,L,mu,ei,cross,mass,modes,displacement:p.force*compliance,energy};
}
function tensionAtPitch(input,hz,fret){
 const p={...defaults,...input};if(!Number.isFinite(hz)||hz<=0)throw Error('正の音程が必要です');
 const L=p.scale/1000*2**(-fret/12),{mu,ei}=section(p),k=Math.PI/L;
 const tension=(mu*(TAU*hz)**2-ei*k**4)/(k*k);
 if(!Number.isFinite(tension)||tension<=0)throw Error('曲げ剛性だけの基音より低い調弦です');return tension;
}
function tune(input,hz){return tensionAtPitch(input,hz,0);}
function matchedPair(input,hz){
 const base={...defaults,...input};
 return ['plain','wound'].map(construction=>{const p={...base,construction};p.tension=tensionAtPitch(p,hz,p.fret);return p;});
}
const assumptionProfiles=[
 {id:'plain',label:'単線',construction:'plain',coreCoupling:0,windingParticipation:0},
 {id:'slip',label:'巻弦：滑り自由',construction:'wound',coreCoupling:0,windingParticipation:0},
 {id:'core',label:'巻弦：芯が結合',construction:'wound',coreCoupling:1,windingParticipation:0},
 {id:'wire',label:'巻弦：巻線1%参加',construction:'wound',coreCoupling:0,windingParticipation:.01},
 {id:'both',label:'巻弦：芯結合＋巻線1%',construction:'wound',coreCoupling:1,windingParticipation:.01}
];
function assumptionCases(input,hz){
 return assumptionProfiles.map(profile=>{
  const config={...defaults,...input,construction:profile.construction,coreCoupling:profile.coreCoupling,windingParticipation:profile.windingParticipation};
  config.tension=tensionAtPitch(config,hz,config.fret);
  return {id:profile.id,label:profile.label,config};
 });
}
// Exact homogeneous transition, including critical/overdamped modes.
function freeState(mode,t,q=mode.q,v=0){
 const {w,sigma:s}=mode;if(t===0)return {q,v};
 let a,b,d;
 if(Math.abs(w-s)<w*1e-9){const e=Math.exp(-s*t);a=e*(1+s*t);b=e*t;d=e*(1-s*t);}
 else if(w>s){const wd=Math.sqrt(w*w-s*s),e=Math.exp(-s*t),sn=Math.sin(wd*t),co=Math.cos(wd*t);a=e*(co+s/wd*sn);b=e*sn/wd;d=e*(co-s/wd*sn);}
 else{const z=Math.sqrt(s*s-w*w),r1=-w*w/(s+z),r2=-s-z,e1=Math.exp(r1*t),e2=Math.exp(r2*t);a=(-r2*e1+r1*e2)/(r1-r2);b=(e1-e2)/(r1-r2);d=(r1*e1-r2*e2)/(r1-r2);}
 return {q:a*q+b*v,v:-w*w*b*q+d*v};
}
// Start in static equilibrium, then remove the external point force linearly.
// q''+2 sigma q'+w² q = w² q0 max(1-t/tau,0).
function releaseState(mode,t,tau){
 if(!Number.isFinite(t)||t<0||!Number.isFinite(tau)||tau<0)throw Error('非負の時間が必要です');
 if(tau===0)return freeState(mode,t);
 if(t===0)return {q:mode.q,v:0};
 const u=Math.min(t,tau),offset=2*mode.sigma*mode.q/(mode.w*mode.w*tau);
 const h=freeState(mode,u,-offset,mode.q/tau);
 const end={q:mode.q*(1-u/tau)+offset+h.q,v:-mode.q/tau+h.v};
 return t<=tau?end:freeState(mode,t-tau,end.q,end.v);
}
function releaseCases(input){
 return [0,.25,1,4,12].map(releaseMs=>({releaseMs,label:releaseMs===0?'瞬時':releaseMs+' ms',config:{...defaults,...input,releaseMs}}));
}
// Bound the signed support-force sum by the sum of modal envelopes.
function tailPlan(spec,threshold=1e-5,maxSeconds=60){
 const gain=.1*10**(spec.p.gain/20),tau=spec.p.releaseMs/1000;
 const envelope=t=>{let sum=0;const u=Math.max(0,t-tau);
  for(const m of spec.modes){const {w,sigma:s,releasedQ:q,releasedV:v}=m;let a;
   if(Math.abs(w-s)<w*1e-9)a=Math.exp(-s*u)*(Math.abs(q)+Math.abs(v+s*q)*u);
   else if(w>s)a=m.releasedAmplitude*Math.exp(-s*u);
   else{const z=Math.sqrt(s*s-w*w),r1=-w*w/(s+z),r2=-s-z,c1=(v-r2*q)/(r1-r2),c2=(r1*q-v)/(r1-r2);a=Math.abs(c1)*Math.exp(r1*u)+Math.abs(c2)*Math.exp(r2*u);}
   sum+=Math.abs(m.bridge)*a;
  }return gain*sum;};
 const capped=envelope(maxSeconds-.1)>threshold;
 let lo=Math.min(spec.p.duration,maxSeconds),hi=maxSeconds-.1;
 if(!capped){for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(envelope(mid)>threshold)lo=mid;else hi=mid;}}
 const duration=capped?maxSeconds:Math.max(spec.p.duration,hi+.1);
 return {duration,capped,threshold,endEnvelope:envelope(duration),fadeSeconds:capped?2:.02};
}
function render(input,sampleRate=48000,options={}){
 const spec=model(input,sampleRate),tail=options.autoTail?tailPlan(spec):{duration:spec.p.duration,capped:false,fadeSeconds:.02},dt=1/sampleRate,size=Math.ceil(tail.duration*sampleRate),raw=new Float64Array(size);
 for(const mode of spec.modes){
  const {w,sigma,q,bridge}=mode;let a,b,q1;
  if(Math.abs(w-sigma)<w*1e-9){const r=Math.exp(-sigma*dt);a=2*r;b=-r*r;q1=q*r*(1+sigma*dt);}
  else if(w>sigma){const wd=Math.sqrt(w*w-sigma*sigma),r=Math.exp(-sigma*dt);a=2*r*Math.cos(wd*dt);b=-r*r;q1=q*r*(Math.cos(wd*dt)+sigma/wd*Math.sin(wd*dt));}
  else{const z=Math.sqrt(sigma*sigma-w*w),r1=-w*w/(sigma+z),r2=-sigma-z,e1=Math.exp(r1*dt),e2=Math.exp(r2*dt);a=e1+e2;b=-e1*e2;q1=q*(-r2*e1+r1*e2)/(r1-r2);}
  const tau=spec.p.releaseMs/1000;
  let start=0,prev=q,now=q1;
  if(tau>0){
   start=Math.min(size,Math.ceil(tau*sampleRate));
   for(let j=0;j<start;j++)raw[j]+=bridge*releaseState(mode,j*dt,tau).q;
   if(start<size){const end=releaseState(mode,tau,tau),offset=start*dt-tau;prev=freeState(mode,offset,end.q,end.v).q;now=freeState(mode,offset+dt,end.q,end.v).q;}
  }
  if(start<size)raw[start]+=bridge*prev;
  if(start+1<size)raw[start+1]+=bridge*now;
  for(let j=start+2;j<size;j++){const next=a*now+b*prev;raw[j]+=bridge*next;prev=now;now=next;}
 }
 // Fixed monitoring filter/gain only; neither participates in string decay.
 const alpha=1-Math.exp(-TAU*8000/sampleRate),gain=.1*10**(spec.p.gain/20),samples=new Float32Array(size);let y=0,peak=0;
 for(let j=0;j<size;j++){y+=alpha*(raw[j]-y);const fade=Math.min(1,j/(.003*sampleRate),(size-1-j)/(tail.fadeSeconds*sampleRate));samples[j]=y*gain*Math.max(0,fade);peak=Math.max(peak,Math.abs(samples[j]));}
 return {samples,sampleRate,spec,peak,tail};
}
const api={defaults,section,model,tune,tensionAtPitch,matchedPair,assumptionCases,freeState,releaseState,releaseCases,tailPlan,render};root.StringPhysics=api;
if(typeof module!=='undefined')module.exports=api;
})(globalThis);
