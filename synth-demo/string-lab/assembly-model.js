/* Passive reduced assembly. Coordinates: existing front/hole/string, then
   closed back modes, a bending neck with heel rotation, a developed side wall.
   All added terms come from positive kinetic/strain/air-volume energies. */
(function(root){'use strict';
const Plate=root.StringPlate||(typeof require!=='undefined'?require('./plate.js'):null),B=root.StringClassicalBracing||(typeof require!=='undefined'?require('./classical-bracing.js'):null);
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
const voices=Object.freeze([
 {id:'wound-e2',label:'巻弦 E2 · 82.41 Hz',hz:82.406889,construction:'wound',coreDiameter:.75,wireDiameter:.16},
 {id:'wound-e3',label:'巻弦 E3 · 164.81 Hz（これまでの音）',hz:164.813778},
 {id:'plain-g3',label:'ナイロン単線 G3 · 196 Hz',hz:196,construction:'plain',diameter:1.02},
 {id:'plain-e4',label:'ナイロン単線 E4 · 329.63 Hz',hz:329.627557,construction:'plain',diameter:.7}
].map(Object.freeze));
function config(back=false,neck=false,sides=false,view='sum',voice='wound-e3'){
 const choice=voices.find(v=>v.id===voice);if(!choice)throw Error('Unknown assembly voice');
 const c={...B.config('fan7'),assembly:true,assemblyBack:!!back,assemblyNeck:!!neck,assemblySides:!!sides,bodyView:view};
 if(voice!=='wound-e3'){for(const k of ['construction','coreDiameter','wireDiameter','diameter'])if(choice[k]!==undefined)c[k]=choice[k];c.compareHz=choice.hz;c.tension=P.tensionAtPitch(c,choice.hz,0);c.assemblyVoice=voice;c.guidedPreset='assembly-'+voice;}
 return c;
}
function dataKey(c,n){const base=(!c.assemblyVoice||c.assemblyVoice==='wound-e3')?key(c):c.assemblyVoice+'-'+key(c)+'-m'+n;return (c.plateWood?'wood-'+c.plateWood+'-':'')+base;}
function key(c){return [+!!c.assemblyBack,+!!c.assemblyNeck,+!!c.assemblySides].join('');}
function build(input,backData,sr=48000,limit=96){
 const base=Plate.system(input,sr,limit),b=base.nb,n=base.n,nb=b+(input.assemblyBack?9:0)+(input.assemblyNeck?2:0)+(input.assemblySides?1:0),N=nb+n;
 const M=new Float64Array(N*N),K=new Float64Array(N*N),C=new Float64Array(N*N),load=new Float64Array(N),ports={top:new Float64Array(N),back:new Float64Array(N),sides:new Float64Array(N),hole:new Float64Array(N),velocity:new Float64Array(N)},bridge=new Float64Array(N),nut=new Float64Array(N),area=new Float64Array(N);
 const addOuter=(A,u,v,a)=>{for(let i=0;i<N;i++)if(u[i])for(let j=0;j<N;j++)if(v[j])A[i*N+j]+=a*u[i]*v[j];};
 const one=(i)=>{const a=new Float64Array(N);a[i]=1;return a;};
 for(let i=0;i<b;i++){bridge[i]=base.bridge[i];area[i]=base.area[i];M[i*N+i]=base.mass[i];K[i*N+i]=base.stiffness[i];C[i*N+i]=base.damping[i];if(i<b-1)ports.top[i]=base.area[i];else ports.hole[i]=base.area[i];}
 if(base.bridgeAddedMass)for(let i=0;i<b;i++)for(let j=0;j<b;j++)M[i*N+j]+=base.bridgeAddedMass[i*b+j];
 let offset=b;const metadata={back:null,neck:null,sides:null};
 if(input.assemblyBack){
  for(let j=0;j<9;j++){const d=backData.modes[j],i=offset+j,w=2*Math.PI*d.hz;M[i*N+i]=d.mass;K[i*N+i]=d.mass*w*w;C[i*N+i]=backData.lossAngle*d.mass*w;area[i]=ports.back[i]=d.area;}
  offset+=9;metadata.back={thicknessM:backData.thickness,density:backData.density,youngX:backData.youngX,youngY:backData.youngY,braceCount:3,braceMassKg:backData.braceMass,uncoupledHz:backData.modes.map(m=>m.hz),validation:backData.validation};
 }
 if(input.assemblyNeck){
  // f0=u (heel rotation), f1=u²(3-u)/2 (cantilever bending).
  // Rectangular neck/fingerboard composite; uniform section, planar motion.
  const length=.325,width=.056,h=.023,fh=.006,rho=550,frho=700,E=10e9,fE=12e9,headMass=.06,heelLength=.03,heelHeight=.04;
  const A=width*h,FA=width*fh,neutral=(E*A*h/2+fE*FA*(h+fh/2))/(E*A+fE*FA),EI=E*(width*h**3/12+A*(h/2-neutral)**2)+fE*(width*fh**3/12+FA*(h+fh/2-neutral)**2),mu=rho*A+frho*FA,jointRotationalStiffness=E*width*heelHeight**3/(12*heelLength),tau=.02/(2*Math.PI*200);
  const mm=[[1/3,11/40],[11/40,33/140]],kk=[[jointRotationalStiffness/length**2,0],[0,3*EI/length**3]];
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){M[(offset+i)*N+offset+j]=mu*length*mm[i][j]+headMass;K[(offset+i)*N+offset+j]=kk[i][j];C[(offset+i)*N+offset+j]=tau*kk[i][j];}
  nut[offset]=nut[offset+1]=1;offset+=2;metadata.neck={lengthM:length,widthM:width,thicknessM:h,fingerboardThicknessM:fh,density:rho,headMassKg:headMass,bendingRigidityNm2:EI,jointRotationalStiffnessNm:jointRotationalStiffness,lossLaw:'Kelvin-Voigt C=tau*K; loss angle .02 at 200 Hz',relaxationSeconds:tau,scope:'two Ritz shapes; bending plus flexible heel rotation; heel translation fixed; no torsion or axial motion'};
 }
 if(input.assemblySides){
  // Developed wall, clamped at top/back, w(z)=sin²(pi*z/depth).
  // Integrate circumferential length of the existing outline numerically.
  const CP=root.StringClassicalPlate||(typeof require!=='undefined'?require('./classical-plate.js'):null),d=CP.data;let perimeter=0,previous=[0,CP.halfWidth(0)];for(let j=1;j<=4000;j++){const x=d.length*j/4000,y=CP.halfWidth(x);perimeter+=2*Math.hypot(x-previous[0],y-previous[1]);previous=[x,y];}perimeter+=2*(CP.halfWidth(0)+CP.halfWidth(d.length));
  const depth=.1,t=.002,rho=800,Eacross=1e9,nu=.3,D=Eacross*t**3/(12*(1-nu*nu)),m=rho*t*perimeter*3*depth/8,k=D*perimeter*2*Math.PI**4/depth**3,w=Math.sqrt(k/m),i=offset++;
  M[i*N+i]=m;K[i*N+i]=k;C[i*N+i]=.02*m*w;area[i]=ports.sides[i]=perimeter*depth/2;
  metadata.sides={depthM:depth,thicknessM:t,density:rho,youngAcross: Eacross,perimeterM:perimeter,massKg:m,uncoupledHz:w/(2*Math.PI),scope:'one developed-wall transverse bending shape, clamped top/back edges; curvature membrane stiffening and rim/edge motion omitted'};
 }
 // Closed air space is the same for on and off: off means rigid, never absent.
 const volume=base.air.volume,compress=base.air.rho*base.air.c**2/volume;
 addOuter(K,area,area,compress);
 const muL=base.spec.mu*base.spec.L,TbyL=base.affineStiffness;
 addOuter(M,bridge,bridge,muL/3);addOuter(M,nut,nut,muL/3);addOuter(M,bridge,nut,muL/6);addOuter(M,nut,bridge,muL/6);
 const delta=Float64Array.from(bridge,(v,i)=>v-nut[i]);addOuter(K,delta,delta,TbyL);
 const fraction=base.spec.p.position/1000/base.spec.L;
 for(let i=0;i<nb;i++)load[i]=base.spec.p.force*((1-fraction)*bridge[i]+fraction*nut[i]);
 for(let j=0;j<n;j++){const i=nb+j,mode=base.spec.modes[j],e=one(i),gB=base.g[j],gN=base.spec.mu/mode.k;M[i*N+i]=base.spec.mass;K[i*N+i]=base.modalK[j];C[i*N+i]=base.modalC[j];addOuter(M,e,bridge,gB);addOuter(M,bridge,e,gB);addOuter(M,e,nut,gN);addOuter(M,nut,e,gN);load[i]=base.spec.p.force*Math.sin(mode.k*(base.spec.L-base.spec.p.position/1000));}
 ports.velocity.set(bridge);
 return {N,nb,n,M,K,C,load,ports,bridge,nut,area,compress,base,metadata,air:{...base.air,volume},scope:'linear transverse reduced assembly; no fitted spectral weights; compact co-located radiation, no radiation loading'};
}
function signature(s){return ['M','K','C','load'].flatMap(k=>{const a=s[k];let sum=0,square=0,weighted=0;for(let i=0;i<a.length;i++){sum+=a[i];square+=a[i]*a[i];weighted+=(1+i%97)*a[i];}return [sum,square,weighted];});}
const api={config,key,dataKey,voices,build,signature};root.StringAssemblyModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
