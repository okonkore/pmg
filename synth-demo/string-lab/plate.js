/* Orthotropic plate + string + open cavity.
   Analytic simply-supported rectangle or computed clamped classical outline.
   Positive mechanical matrices; compact-monopole observer without radiation loading. */
(function(root){
'use strict';
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
const defaults=Object.freeze({length:.45,width:.35,thickness:.0025,density:420,youngX:10e9,youngY:.8e9,shear:.6e9,poissonXY:.3,lossAngle:.02,bridgeX:.31,bridgeY:.175});
const startupProfiles=Object.freeze([{id:'start-linear3',label:'A：これまでの開始',milliseconds:3,shape:'linear'},{id:'start-none',label:'B：開始処理なし',milliseconds:0,shape:'none'},{id:'start-cosine3',label:'C：同じ3 msをなめらかに',milliseconds:3,shape:'half-cosine'},{id:'start-cosine10',label:'D：10 msかけて開始',milliseconds:10,shape:'half-cosine'}].map(Object.freeze));
function startupGain(seconds,milliseconds,shape){if(seconds<0)return 0;if(milliseconds===0)return 1;const x=Math.min(1,seconds/(milliseconds/1000));return shape==='linear'?x:(1-Math.cos(Math.PI*x))/2;}
const dot=(a,b)=>{let x=0;for(let i=0;i<a.length;i++)x+=a[i]*b[i];return x;};
function inverse(matrix,n){
 const L=new Float64Array(n*n),out=new Float64Array(n*n),y=new Float64Array(n),x=new Float64Array(n);
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let v=matrix[i*n+j];for(let k=0;k<j;k++)v-=L[i*n+k]*L[j*n+k];if(i===j){if(!(v>0))throw Error('Plate matrix is not positive definite');L[i*n+j]=Math.sqrt(v);}else L[i*n+j]=v/L[j*n+j];}
 for(let col=0;col<n;col++){for(let i=0;i<n;i++){let v=i===col?1:0;for(let j=0;j<i;j++)v-=L[i*n+j]*y[j];y[i]=v/L[i*n+i];}for(let i=n-1;i>=0;i--){let v=y[i];for(let j=i+1;j<n;j++)v-=L[j*n+i]*x[j];x[i]=v/L[i*n+i];out[i*n+col]=x[i];}}
 return out;
}
function multiply(A,x,out=new Float64Array(x.length)){const n=x.length;for(let i=0;i<n;i++){let v=0;for(let j=0;j<n;j++)v+=A[i*n+j]*x[j];out[i]=v;}return out;}
function plateModes(parameters={},count='nine'){
 const p={...defaults,...parameters};for(const [k,v] of Object.entries(p))if(!Number.isFinite(v))throw Error('Invalid plate parameter: '+k);
 for(const k of ['length','width','thickness','density','youngX','youngY','shear'])if(!(p[k]>0))throw Error('Positive plate properties required');
 const nuYX=p.poissonXY*p.youngY/p.youngX,den=1-p.poissonXY*nuYX;
 if(!(den>0)||p.lossAngle<0||!(p.bridgeX>0&&p.bridgeX<p.length&&p.bridgeY>0&&p.bridgeY<p.width))throw Error('Invalid plate material or bridge position');
 if(!['one','nine'].includes(count))throw Error('Unknown plate basis');
 const D11=p.youngX*p.thickness**3/(12*den),D22=p.youngY*p.thickness**3/(12*den),D12=p.poissonXY*D22,D66=p.shear*p.thickness**3/12,mass=p.density*p.thickness*p.length*p.width/4,modes=[];
 const limit=count==='one'?1:3;
 for(let m=1;m<=limit;m++)for(let n=1;n<=limit;n++){
  const ax=m*Math.PI/p.length,ay=n*Math.PI/p.width,w=Math.sqrt((D11*ax**4+2*(D12+2*D66)*ax*ax*ay*ay+D22*ay**4)/(p.density*p.thickness));
  let bridge=Math.sin(ax*p.bridgeX)*Math.sin(ay*p.bridgeY);if(Math.abs(bridge)<1e-14)bridge=0;
  const area=m%2&&n%2?4*p.length*p.width/(m*n*Math.PI**2):0;
  modes.push({m,n,w,hz:w/(2*Math.PI),mass,stiffness:mass*w*w,damping:p.lossAngle*mass*w,bridge,effectiveArea:area});
 }
 modes.sort((a,b)=>a.w-b.w);return {parameters:p,D11,D22,D12,D66,modes};
}
function system(input,sr=48000,modeLimit=96){
 if(input.nonlinear||input.contactWidthMm>0)throw Error('Plate experiment requires linear point excitation');
 const scale=input.plateStiffnessScale??1;if(!(Number.isFinite(scale)&&scale>0))throw Error('Plate stiffness scale must be positive and finite');
 if(input.plateGeometry&&!['rectangle','classical'].includes(input.plateGeometry))throw Error('Unknown plate geometry');
 if(input.plateBracing!==undefined&&!['none','fan7'].includes(input.plateBracing))throw Error('Unknown bracing pattern');
 if(input.plateBracing==='fan7'&&input.plateGeometry!=='classical')throw Error('Fan bracing requires the classical plate');
 if(input.plateWood&&(input.plateGeometry!=='classical'||input.plateBracing!=='fan7'))throw Error('Soundboard wood comparison requires the braced classical plate');
 const factory=input.plateWood?((parameters,count)=>(root.StringWoodPlate||(typeof require!=='undefined'?require('./wood-plate.js'):null)).plateModes(input.plateWood,parameters,count)):input.plateBracing==='fan7'?(root.StringClassicalBracing||(typeof require!=='undefined'?require('./classical-bracing.js'):null)).plateModes:input.plateGeometry==='classical'?(root.StringClassicalPlate||(typeof require!=='undefined'?require('./classical-plate.js'):null)).plateModes:plateModes;
 const reference=factory(input.plateParameters,input.plateModes),rp=reference.parameters;
 const plate=scale===1?reference:factory({...rp,youngX:rp.youngX*scale,youngY:rp.youngY*scale,shear:rp.shear*scale},input.plateModes);
 if(input.plateFixDamping){for(let j=0;j<plate.modes.length;j++){plate.modes[j].damping=reference.modes[j].damping;plate.modes[j].effectiveLossAngle=plate.modes[j].damping/(plate.modes[j].mass*plate.modes[j].w);}plate.dampingReference={law:'fixed modal viscous coefficients at reference material',parameters:{...rp},frequenciesHz:reference.modes.map(v=>v.hz)};}
 if(input.plateStiffnessScale!==undefined)plate.stiffnessScale=scale;
 const attachment=[input.bodyBridgeMassG,input.bodyBridgeWidthMm,input.bodyBridgeLengthMm].some(v=>v!==undefined)?(root.StringPlateBridge||(typeof require!=='undefined'?require('./plate-bridge.js'):null)).attachment(plate,input):null;
 if(attachment){plate.bridgeAttachment=attachment.metadata;plate.modes.forEach((m,j)=>m.bridge=attachment.port[j]);}
 const bridgeAddedMass=attachment?.addedMass||null;
 const spec=P.model({...input,nonlinear:false,supportEnabled:true,supportSide:'bridge',releaseMs:0},sr,modeLimit),nb=plate.modes.length+1,n=spec.modes.length;
 const holeDamping=input.plateHoleDamping??.02;if(!(Number.isFinite(holeDamping)&&holeDamping>=0))throw Error('Hole damping must be finite and nonnegative');
 const rho=1.2,c=343,volume=plate.geometry?.cavityVolume??.012,radius=plate.geometry?.holeRadius??.04,wall=.003,holeArea=Math.PI*radius*radius,airMass=rho*holeArea*(wall+1.46*radius),compress=rho*c*c/volume;
 const mass=new Float64Array(nb),stiffness=new Float64Array(nb),damping=new Float64Array(nb),bridge=new Float64Array(nb),area=new Float64Array(nb);
 plate.modes.forEach((v,j)=>{mass[j]=v.mass;stiffness[j]=v.stiffness;damping[j]=v.damping;bridge[j]=v.bridge;area[j]=v.effectiveArea;});mass[nb-1]=airMass;damping[nb-1]=holeDamping;area[nb-1]=holeArea;
 const affineMass=spec.mu*spec.L/3,affineStiffness=spec.p.tension/spec.L,M=new Float64Array(nb*nb),K=new Float64Array(nb*nb);
 for(let i=0;i<nb;i++)for(let j=0;j<nb;j++){M[i*nb+j]=(i===j?mass[i]:0)+affineMass*bridge[i]*bridge[j];K[i*nb+j]=(i===j?stiffness[i]:0)+affineStiffness*bridge[i]*bridge[j]+compress*area[i]*area[j];}
 if(bridgeAddedMass)for(let j=0;j<M.length;j++)M[j]+=bridgeAddedMass[j];
 const inverseK=inverse(K,nb),modalK=new Float64Array(n),modalC=new Float64Array(n),g=new Float64Array(n),q=new Float64Array(n),v=new Float64Array(n),load=new Float64Array(n),shape0=1-spec.p.position/1000/spec.L,unit=multiply(inverseK,bridge);
 let compliance=shape0*shape0*dot(bridge,unit),schurFactor=affineMass;
 for(let i=0;i<n;i++){const mode=spec.modes[i];modalK[i]=spec.mass*mode.w**2;modalC[i]=2*spec.mass*mode.sigma;g[i]=spec.mu/mode.k*(mode.n%2?1:-1);load[i]=Math.sin(mode.k*(spec.L-spec.p.position/1000));compliance+=load[i]**2/modalK[i];schurFactor-=g[i]**2/spec.mass;}
 const force=spec.p.excitation==='displacement'?spec.p.pullMm/1000/compliance:spec.p.force,z=Float64Array.from(unit,v=>v*force*shape0),velocity=new Float64Array(nb);
 for(let i=0;i<n;i++)q[i]=force*load[i]/modalK[i];
 const schurM=new Float64Array(nb*nb);for(let i=0;i<nb;i++)for(let j=0;j<nb;j++)schurM[i*nb+j]=(i===j?mass[i]:0)+schurFactor*bridge[i]*bridge[j];
 if(bridgeAddedMass)for(let j=0;j<schurM.length;j++)schurM[j]+=bridgeAddedMass[j];
 const inverseSchurM=inverse(schurM,nb);
 const s={spec,plate,bridgeAddedMass,nb,n,mass,stiffness,damping,bridge,area,affineMass,affineStiffness,compress,M,K,inverseK,inverseSchurM,modalK,modalC,g,q,v,z,velocity,air:{rho,c,volume,radius,wall,holeArea,mass:airMass,damping:holeDamping}};
 spec.p.force=force;spec.displacement=force*compliance;spec.energy=energy(s);spec.modes.forEach((mode,i)=>{mode.q=q[i];mode.releasedQ=q[i];mode.releasedV=0;});return s;
}
function energy(s){
 let E=.5*s.affineMass*dot(s.bridge,s.velocity)**2+.5*s.affineStiffness*dot(s.bridge,s.z)**2+.5*s.compress*dot(s.area,s.z)**2;
 for(let j=0;j<s.nb;j++)E+=.5*(s.mass[j]*s.velocity[j]**2+s.stiffness[j]*s.z[j]**2);
 if(s.bridgeAddedMass)E+=.5*dot(s.velocity,multiply(s.bridgeAddedMass,s.velocity));
 let cross=0;for(let i=0;i<s.n;i++){E+=.5*(s.spec.mass*s.v[i]**2+s.modalK[i]*s.q[i]**2);cross+=s.g[i]*s.v[i];}return E+dot(s.bridge,s.velocity)*cross;
}
function stepper(s,sr,oversample=8){
 const h=1/(sr*oversample),h2=h*h/4,m=s.spec.mass,A=new Float64Array(s.n),R=new Float64Array(s.n),r=new Float64Array(s.n),mat=new Float64Array(s.nb*s.nb),rhs=new Float64Array(s.nb),next=new Float64Array(s.nb);let gamma=0;
 for(let i=0;i<s.n;i++){A[i]=m+h*s.modalC[i]/2+h2*s.modalK[i];R[i]=m-h*s.modalC[i]/2-h2*s.modalK[i];gamma+=s.g[i]**2/A[i];}
 for(let i=0;i<s.nb;i++)for(let j=0;j<s.nb;j++)mat[i*s.nb+j]=s.M[i*s.nb+j]+(i===j?h*s.damping[i]/2:0)+h2*s.K[i*s.nb+j]-gamma*s.bridge[i]*s.bridge[j];
 const inv=inverse(mat,s.nb);
 return ()=>{
  const bv=dot(s.bridge,s.velocity),bz=dot(s.bridge,s.z),areaV=dot(s.area,s.velocity),areaZ=dot(s.area,s.z);let stringR=0;
  for(let i=0;i<s.n;i++){r[i]=R[i]*s.v[i]+s.g[i]*bv-h*s.modalK[i]*s.q[i];stringR+=s.g[i]*(s.v[i]-r[i]/A[i]);}
  const bridgeR=(s.affineMass-h2*s.affineStiffness)*bv-h*s.affineStiffness*bz+stringR,airR=-h2*s.compress*areaV-h*s.compress*areaZ;
  for(let j=0;j<s.nb;j++)rhs[j]=(s.mass[j]-h*s.damping[j]/2-h2*s.stiffness[j])*s.velocity[j]-h*s.stiffness[j]*s.z[j]+s.bridge[j]*bridgeR+s.area[j]*airR;
  if(s.bridgeAddedMass)for(let j=0;j<s.nb;j++)for(let k=0;k<s.nb;k++)rhs[j]+=s.bridgeAddedMass[j*s.nb+k]*s.velocity[k];
  multiply(inv,rhs,next);const nextBridge=dot(s.bridge,next);let power=0;
  for(let i=0;i<s.n;i++){const nv=(r[i]-s.g[i]*nextBridge)/A[i],mid=(s.v[i]+nv)/2;s.q[i]+=h*mid;s.v[i]=nv;power+=s.modalC[i]*mid*mid;}
  for(let j=0;j<s.nb;j++){const mid=(s.velocity[j]+next[j])/2;s.z[j]+=h*mid;s.velocity[j]=next[j];power+=s.damping[j]*mid*mid;}return h*power;
 };
}
function observer(s,distance=1,decompose=false){
 if(!(distance>0&&Number.isFinite(distance)))throw Error('Invalid observation distance');
 const factor=s.air.rho/(4*Math.PI*distance),top=Float64Array.from(s.area,(v,j)=>j===s.nb-1?0:factor*v),hole=new Float64Array(s.nb);hole[s.nb-1]=factor*s.air.holeArea;
 function norm(l){
  const w=multiply(s.inverseSchurM,l),wb=dot(w,s.bridge),xb=multiply(s.K,w),vb=Float64Array.from(w,(v,j)=>-v*s.damping[j]);for(let j=0;j<s.nb;j++)xb[j]*=-1;
  let result=dot(xb,multiply(s.inverseK,xb)),cross=0;
  for(let i=0;i<s.n;i++){const x=wb*s.g[i]*s.modalK[i]/s.spec.mass,v=wb*s.g[i]*s.modalC[i]/s.spec.mass;result+=x*x/s.modalK[i]+v*v/s.spec.mass;cross+=s.g[i]*v/s.spec.mass;}
  for(let j=0;j<s.nb;j++)vb[j]-=s.bridge[j]*cross;return result+dot(vb,multiply(s.inverseSchurM,vb));
 }
 const coefficient=Math.max(norm(top),norm(hole),norm(Float64Array.from(top,(v,j)=>v+hole[j])),...(decompose?s.plate.modes.filter(v=>v.effectiveArea!==0).flatMap(mode=>[norm(Float64Array.from(top,(v,j)=>s.plate.modes[j]===mode?v:0)),norm(Float64Array.from(top,(v,j)=>v+hole[j]-(s.plate.modes[j]===mode?v:0)))]):[])),velocityCoefficient=dot(s.bridge,multiply(s.inverseSchurM,s.bridge)),rhs=new Float64Array(s.nb),acceleration=new Float64Array(s.nb);
 return {coefficient,velocityCoefficient,read(decompose=false){
  const bz=dot(s.bridge,s.z),az=dot(s.area,s.z);let reaction=0;for(let i=0;i<s.n;i++)reaction+=s.g[i]*(s.modalC[i]*s.v[i]+s.modalK[i]*s.q[i])/s.spec.mass;
  for(let j=0;j<s.nb;j++)rhs[j]=-s.damping[j]*s.velocity[j]-s.stiffness[j]*s.z[j]-s.bridge[j]*s.affineStiffness*bz-s.area[j]*s.compress*az+s.bridge[j]*reaction;
  multiply(s.inverseSchurM,rhs,acceleration);const p=dot(top,acceleration),h=dot(hole,acceleration);return decompose?[p,h,p+h,...s.plate.modes.map((mode,j)=>factor*s.area[j]*acceleration[j])]:[p,h,p+h];
 }};
}
function select(result,input){
 const view=input.bodyView||'sum';
 if(view.startsWith('without-mode-')&&result.body.plateDiagnostic){const component=view.slice(8);if(!result.channels[component])throw Error('Unknown plate component');if(!result.channels[view])result.channels[view]=Float32Array.from(result.channels.sum,(v,j)=>v-result.channels[component][j]);}
 if(!result.channels[view])throw Error('Unknown plate observer');
 const samples=result.channels[view];let peak=0;for(const v of samples)peak=Math.max(peak,Math.abs(v));
 return {...result,samples,peak,spec:{...result.spec,p:{...result.spec.p,bodyView:view}},body:{...result.body,view,...(result.body.startupDiagnostic?{startupDiagnostic:{...result.body.startupDiagnostic,selectedProfile:startupProfiles.find(v=>v.id===view)||null}}:{}),observer:view==='velocity'?'bridge velocity; 8 FS per m/s':'compact monopole pressure '+view+'; '+result.body.radiation.pressureGainFSPerPa+' FS/Pa'}};
}
function render(input,sr=48000,options={}){
 if(input.plateStartDiagnostic&&input.plateDiagnostic)throw Error('Separate the startup and plate-component experiments');
 const s=system(input,sr,options.modeLimit||96),over=options.oversample||32,step=stepper(s,sr,over),obs=observer(s,1,!!input.plateDiagnostic),initialEnergy=energy(s),gain=input.bodyPressureGain??4;
 if(!(gain>0&&Number.isFinite(gain)))throw Error('Invalid pressure monitor gain');
 const size=Math.ceil(sr*(options.duration||30)),raw={velocity:new Float32Array(size),top:new Float32Array(size),hole:new Float32Array(size),sum:new Float32Array(size)},alpha=1-Math.exp(-2*Math.PI*8000/sr);
 if(input.plateStartDiagnostic)raw['start-none']=new Float32Array(size);
 const parts=input.plateDiagnostic?s.plate.modes.map((mode,j)=>({id:'mode-'+mode.m+'-'+mode.n,index:j,mode})).filter(v=>v.mode.effectiveArea!==0):[];
 const partY=new Float64Array(parts.length);for(const part of parts)raw[part.id]=new Float32Array(size);
 let vy=0,ty=0,hy=0,used=size,quiet=false,dissipated=0,maxBalanceError=0;
 for(let j=0;j<size;j++){
  const p=obs.read(!!input.plateDiagnostic),fade=Math.min(1,j/(sr*.003));vy+=alpha*(dot(s.bridge,s.velocity)-vy);ty+=alpha*(p[0]-ty);hy+=alpha*(p[1]-hy);raw.velocity[j]=8*vy*fade;raw.top[j]=gain*ty*fade;raw.hole[j]=gain*hy*fade;raw.sum[j]=raw.top[j]+raw.hole[j];if(input.plateStartDiagnostic)raw['start-none'][j]=Math.fround(gain*ty)+Math.fround(gain*hy);for(let k=0;k<parts.length;k++){partY[k]+=alpha*(p[3+parts[k].index]-partY[k]);raw[parts[k].id][j]=gain*partY[k]*fade;}
  if(j%480===0){const E=energy(s);maxBalanceError=Math.max(maxBalanceError,Math.abs(E+dissipated-initialEnergy));if(j>sr*4&&gain*Math.sqrt(2*E*obs.coefficient)<1e-5&&8*Math.sqrt(2*E*obs.velocityCoefficient)<1e-5&&gain*Math.max(Math.abs(ty),Math.abs(hy),Math.abs(ty+hy))<1e-5&&8*Math.abs(vy)<1e-5&&gain*Math.max(0,...Array.from(partY,v=>Math.max(Math.abs(v),Math.abs(ty+hy-v))))<1e-5){used=j+1;quiet=true;break;}}
  for(let sub=0;sub<over;sub++)dissipated+=step();
 }
 const delay=Math.round(sr/s.air.c),fade=quiet?.02:2,channels={};for(const [id,data] of Object.entries(raw)){const out=new Float32Array(used+delay);out.set(data.subarray(0,used),delay);for(let j=Math.max(0,used-Math.ceil(sr*fade));j<used;j++)out[j+delay]*=(used-1-j)/(sr*fade);channels[id]=out;}
 if(input.plateStartDiagnostic){channels['start-linear3']=channels.sum;for(const profile of startupProfiles.filter(v=>v.shape==='half-cosine'))channels[profile.id]=Float32Array.from(channels['start-none'],(v,j)=>v*startupGain((j-delay)/sr,profile.milliseconds,profile.shape));}
 const startup=input.plateStartDiagnostic?{scope:'Same mechanical trajectory and pressure filters; only the initial output envelope changes',profiles:startupProfiles,selectedProfile:null,metrics:Object.fromEntries(startupProfiles.map(profile=>{const x=channels[profile.id],baseline=channels.sum;let energy=0,difference=0,lateDifference=0;const start=delay,end=Math.min(x.length,delay+Math.ceil(.01*sr));for(let j=start;j<end;j++){energy+=x[j]*x[j];difference+=(x[j]-baseline[j])**2;}for(let j=end;j<x.length;j++)lateDifference=Math.max(lateDifference,Math.abs(x[j]-baseline[j]));return [profile.id,{first10msRms:Math.sqrt(energy/Math.max(1,end-start)),differenceFromBaselineFirst10msRms:Math.sqrt(difference/Math.max(1,end-start)),maxDifferenceAfter10ms:lateDifference}];}))}:undefined;
 const diagnostics=input.plateDiagnostic?{components:parts.map(v=>({id:v.id,m:v.mode.m,n:v.mode.n,uncoupledHz:v.mode.hz})),scope:'Readout decomposition of the same coupled motion; excluding a component does not remove its mechanical coupling',metrics:Object.fromEntries(Object.entries(channels).filter(([id])=>id!=='velocity').map(([id,x])=>{const rms=(a,b)=>{let E=0;const start=Math.round((a+delay/sr)*sr),end=Math.min(x.length,Math.round((b+delay/sr)*sr));for(let j=start;j<end;j++)E+=x[j]*x[j];return Math.sqrt(E/Math.max(1,end-start));};return [id,{first100msRms:rms(0,.1),next400msRms:rms(.1,.5)}];}))}:undefined;
 const result={samples:channels.sum,channels,sampleRate:sr,spec:s.spec,tail:{duration:(used+delay)/sr,capped:!quiet,fadeSeconds:fade},body:{kind:'air',plate:s.plate,startupDiagnostic:startup,plateDiagnostic:diagnostics,view:'sum',initialEnergy,finalEnergy:energy(s),dissipated,maxBalanceError,oversample:over,radiation:{approximation:'co-located compact monopoles; low frequency; rigid back and sides',distanceM:1,pressureGainFSPerPa:gain,delaySamples:delay,delaySeconds:delay/sr,radiationLoading:false},air:s.air}};
 return select(result,input);
}
root.StringPlate={defaults,startupProfiles,startupGain,plateModes,system,energy,stepper,observer,select,render};if(typeof module!=='undefined')module.exports=root.StringPlate;
})(globalThis);
