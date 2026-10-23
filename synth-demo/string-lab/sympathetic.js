/* Two passive strings, fixed nuts and one shared movable bridge.
 y_s(x)=a*x/L_s + sum q_sn sin(n*pi*x/L_s).
 Diagonal potential/damping and the full bridge/modal mass coupling. */
(function(root){'use strict';
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null),G=root.StringGuided||(typeof require!=='undefined'?require('./guided.js'):null);
function system(input,sampleRate=48000,modeLimit=96){
 if(!G.sympatheticLevels.some(v=>v.id===input.sympatheticId)||input.nonlinear||input.releaseMs!==0||input.contactWidthMm>0)throw Error('2弦の連成は点荷重・瞬時離脱・追加張力オフで比較してください');
 if(!Number.isFinite(input.supportMassG)||input.supportMassG<=0||!Number.isFinite(input.supportStiffness)||input.supportStiffness<=0||!Number.isFinite(input.supportDamping)||input.supportDamping<0)throw Error('共通ブリッジの物理条件を確認してください');
 const specs=G.sympatheticVoices(input).map(p=>P.model(p,sampleRate,modeLimit)),shared=input.sympatheticId!=='independent',active=shared?specs:specs.slice(0,1);
 const n=active.reduce((v,s)=>v+s.modes.length,0),s={spec:specs[0],specs,shared,mass:input.supportMassG/1000,M0:input.supportMassG/1000,K0:input.supportStiffness,C0:input.supportDamping,geometry:0,a:0,av:0,K:new Float64Array(n),C:new Float64Array(n),g:new Float64Array(n),m:new Float64Array(n),bridge:new Float64Array(n),owner:new Uint8Array(n),q:new Float64Array(n),v:new Float64Array(n)};
 let offset=0;for(let j=0;j<active.length;j++){const p=active[j];s.M0+=p.mu*p.L/3;s.K0+=p.p.tension/p.L;s.geometry+=p.p.tension/p.L;for(const mode of p.modes){const i=offset++;s.m[i]=p.mass;s.K[i]=p.mass*mode.w*mode.w;s.C[i]=2*p.mass*mode.sigma;s.g[i]=p.mu/mode.k*(mode.n%2?1:-1);s.bridge[i]=mode.bridge;s.owner[i]=j;}}
 const driver=specs[0],load0=1-driver.p.position/1000/driver.L,F=driver.p.force;s.a=F*load0/s.K0;let compliance=load0*load0/s.K0;
 for(let i=0;i<driver.modes.length;i++){const load=Math.sin(driver.modes[i].k*(driver.L-driver.p.position/1000));s.q[i]=F*load/s.K[i];compliance+=load*load/s.K[i];}
 s.spec.displacement=F*compliance;s.spec.energy=energy(s);return s;
}
function energy(s){let e=.5*(s.M0*s.av*s.av+s.K0*s.a*s.a);for(let i=0;i<s.q.length;i++)e+=.5*(s.m[i]*s.v[i]*s.v[i]+s.K[i]*s.q[i]*s.q[i])+s.av*s.g[i]*s.v[i];return e;}
function receiverEnergy(s){let e=0;for(let i=0;i<s.q.length;i++)if(s.owner[i]===1)e+=.5*(s.m[i]*s.v[i]*s.v[i]+s.K[i]*s.q[i]*s.q[i]);return e;}
function stepper(s,sampleRate,oversample=8){
 if(!Number.isInteger(oversample)||oversample<1)throw Error('時間刻みを確認してください');
 const h=1/(sampleRate*oversample),h2=h*h/4,n=s.q.length,A=new Float64Array(n),R=new Float64Array(n),r=new Float64Array(n);let schur=s.M0+h*s.C0/2+h2*s.K0;
 for(let i=0;i<n;i++){A[i]=s.m[i]+h*s.C[i]/2+h2*s.K[i];R[i]=s.m[i]-h*s.C[i]/2-h2*s.K[i];schur-=s.g[i]*s.g[i]/A[i];}if(!(schur>0))throw Error('2弦の質量行列を確認してください');
 const R0=s.M0-h*s.C0/2-h2*s.K0;
 return ()=>{const oldV=s.av;let rhs=R0*oldV-h*s.K0*s.a;for(let i=0;i<n;i++){r[i]=R[i]*s.v[i]+s.g[i]*oldV-h*s.K[i]*s.q[i];rhs+=s.g[i]*(s.v[i]-r[i]/A[i]);}const nextV=rhs/schur;let power=s.C0*((oldV+nextV)/2)**2;
 for(let i=0;i<n;i++){const next=(r[i]-s.g[i]*nextV)/A[i],mid=(s.v[i]+next)/2;s.q[i]+=h*mid;s.v[i]=next;power+=s.C[i]*mid*mid;}s.a+=h*(oldV+nextV)/2;s.av=nextV;return h*power;};
}
function select(result,config){if(!G.sympatheticLevels.some(v=>v.id===config.sympatheticId))throw Error('2弦の聴く成分を確認してください');if((config.sympatheticId==='independent')!==!result.sympathetic.shared)throw Error('ブリッジ条件の異なる音は再利用できません');const samples=config.sympatheticId==='receiver'?result.channels.receiver:result.channels.total;return {...result,samples,peak:config.sympatheticId==='receiver'?result.sympathetic.receiverPeak:result.sympathetic.totalPeak,spec:{...result.spec,p:{...config}},sympathetic:{...result.sympathetic,view:config.sympatheticId}};}
function render(input,sampleRate=48000,options={}){
 const s=system(input,sampleRate,options.modeLimit||96),oversample=options.oversample||8,step=stepper(s,sampleRate,oversample),duration=options.autoTail?60:(options.duration||input.duration),size=Math.ceil(duration*sampleRate),total=new Float32Array(size),receiver=new Float32Array(size),initialEnergy=energy(s),gain=.1*10**(input.gain/20),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate);
 let bound=s.geometry*s.geometry/s.K0,receiverBound=0;for(let i=0;i<s.q.length;i++){const v=s.bridge[i]**2/s.K[i];bound+=v;if(s.owner[i]===1)receiverBound+=v;}
 let y=0,z=0,totalPeak=0,receiverPeak=0,used=size,quiet=false,dissipated=0,maxBalanceError=0,maxEnergy=initialEnergy,maxReceiverEnergy=0;const trace=[];
 for(let j=0;j<size;j++){let force=s.geometry*s.a,relative=0;for(let i=0;i<s.q.length;i++){const f=s.bridge[i]*s.q[i];force+=f;if(s.owner[i]===1)relative+=f;}y+=alpha*(force-y);z+=alpha*(relative-z);const fade=Math.min(1,j/(sampleRate*.003));total[j]=gain*y*fade;receiver[j]=gain*z*fade;totalPeak=Math.max(totalPeak,Math.abs(total[j]));receiverPeak=Math.max(receiverPeak,Math.abs(receiver[j]));
 if(j%Math.max(1,Math.round(sampleRate*.01))===0){const E=energy(s),B=receiverEnergy(s);maxEnergy=Math.max(maxEnergy,E);maxReceiverEnergy=Math.max(maxReceiverEnergy,B);maxBalanceError=Math.max(maxBalanceError,Math.abs(E+dissipated-initialEnergy));trace.push({t:j/sampleRate,energy:E,receiverModalEnergy:B,bridgeDisplacement:s.a});
 if(options.autoTail&&j/sampleRate>=input.duration&&gain*Math.sqrt(2*E*Math.max(bound,receiverBound))<1e-5&&Math.max(Math.abs(gain*y),Math.abs(gain*z))<1e-5){quiet=true;used=j+1;break;}}
 for(let sub=0;sub<oversample;sub++)dissipated+=step();}
 const capped=!!options.autoTail&&!quiet,fade=capped?2:.02,channels={total:total.slice(0,used),receiver:receiver.slice(0,used)};for(const samples of Object.values(channels))for(let j=Math.max(0,used-Math.ceil(fade*sampleRate));j<used;j++)samples[j]*=Math.max(0,Math.min(1,(used-1-j)/(fade*sampleRate)));
 const result={samples:channels.total,channels,sampleRate,spec:s.spec,peak:totalPeak,tail:{duration:used/sampleRate,capped,fadeSeconds:fade},sympathetic:{shared:s.shared,view:input.sympatheticId,bridge:{massKg:s.mass,stiffness:input.supportStiffness,damping:s.C0},voices:s.specs.map(v=>({conditions:v.p,fixedReferenceHz:v.modes[0].hz})),totalPeak,receiverPeak,initialEnergy,finalEnergy:energy(s),maxEnergy,dissipated,maxBalanceError,initialReceiverModalEnergy:0,maxReceiverModalEnergy:maxReceiverEnergy,oversample,receiverMonitor:'relative sine-mode bridge force; affine endpoint motion excluded',trace}};return select(result,input);
}
root.StringSympathetic={system,energy,receiverEnergy,stepper,select,render};if(typeof module!=='undefined')module.exports=root.StringSympathetic;
})(globalThis);
