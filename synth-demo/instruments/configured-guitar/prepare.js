import './vendor/ml-matrix-6.12.1.js';
import {appendFullObserver} from './observer.js';
import {validateSettings,noteConditions,section} from './settings.js';
const {Matrix,LuDecomposition,CholeskyDecomposition,EigenvalueDecomposition}=globalThis.mlMatrix;
const zeros=(r,c)=>Matrix.zeros(r,c),eye=n=>Matrix.eye(n),mm=(a,b)=>a.mmul(b),transpose=a=>a.transpose();
function put(target,source,row,col){for(let i=0;i<source.rows;i++)for(let j=0;j<source.columns;j++)target.set(row+i,col+j,source.get(i,j));}
function symmetric(a){for(let i=0;i<a.rows;i++)for(let j=0;j<i;j++){const v=(a.get(i,j)+a.get(j,i))/2;a.set(i,j,v);a.set(j,i,v);}return a;}
const norm=a=>Math.sqrt(a.to1DArray().reduce((s,x)=>s+x*x,0));
function gradient(r,a,H,kEA){const hr=mm(H,r);let axial=0,g=0;for(let j=0;j<125;j++){axial+=a.get(j,0)*r.get(j,0);g+=.5*r.get(j,0)*hr.get(j,0);}const e=axial+g,f=zeros(125,1),u=Matrix.add(a,hr);for(let j=0;j<125;j++)f.set(j,0,kEA*(g*a.get(j,0)+e*hr.get(j,0)));const h=Matrix.sub(mm(u,transpose(u)),mm(a,transpose(a))).add(H.clone().mul(e)).mul(kEA);return {f,h,extension:e};}
export function buildModel(input,midi,body,{debug=false,sampleRate=48000,stringNumber}={}) {
 const config=validateSettings(input),spec=noteConditions(config,midi,stringNumber),s=config.strings[spec.string-1],sec=spec.section,L=spec.lengthM,T=spec.tensionN,b=body.size;let modeCount=0;for(let n=1;n<=61;n++){const k=n*Math.PI/L,w=Math.sqrt((T*k*k+(sec.bondedEI??sec.ei)*k**4)/sec.mu);if(w/(2*Math.PI)>=sampleRate*.45)break;modeCount=n;}if(!modeCount)throw Error('この条件では基音を再現できません');const d=2*modeCount,relax=s.construction==='wound'?d:0,mechanicalSize=b+2*d+relax,q0=b,v0=b+d,z0=b+2*d;
 let size=mechanicalSize;
 const ABody=new Matrix(body.A),B=new Matrix(body.B),Q=new Matrix(body.Q),basis=body.transverseBasis,dir=body.direction;
 const diff=zeros(3,6);for(let j=0;j<3;j++){diff.set(j,j,1);diff.set(j,j+3,-1);}const deltaQ=mm(diff,Q),endDiff=mm(B,transpose(diff));
 let totalT=0;for(const row of config.strings)totalT+=noteConditions(config,row.openMidi).tensionN;if(midi<40)totalT+=T-noteConditions(config,40).tensionN;
 const perp=zeros(3,3),axial=zeros(3,3);for(let j=0;j<3;j++)for(let k=0;k<3;k++){perp.set(j,k,((j===k?1:0)-dir[j]*dir[k])*(totalT-body.baselineTotalTensionN)/body.chordLength);axial.set(j,k,sec.EA/L*dir[j]*dir[k]);}
 const Ke=mm(transpose(diff),mm(Matrix.add(perp,axial),diff)),mass=sec.mu*L,mn=mass/2,sqrtM=Math.sqrt(mn),Mee=zeros(6,6),Men=zeros(6,d),omega=new Float64Array(d),sqrtK=new Float64Array(d),sigma=new Float64Array(d),alpha=new Float64Array(d),waveNumber=new Float64Array(d);
 for(let j=0;j<3;j++){Mee.set(j,j,mass/3);Mee.set(j+3,j+3,mass/3);Mee.set(j,j+3,mass/6);Mee.set(j+3,j,mass/6);}
 for(let n=1;n<=modeCount;n++)for(let pol=0;pol<2;pol++){const i=2*(n-1)+pol,k=n*Math.PI/L,w=Math.sqrt((T*k*k+sec.ei*k**4)/sec.mu),hz=w/(2*Math.PI);waveNumber[i]=k;omega[i]=w;sqrtK[i]=Math.sqrt(mn)*w;
  const drag=2*Math.PI*1.8e-5+2*Math.PI*(s.diameterMm/1000)*Math.sqrt(Math.PI*1.8e-5*1.2*hz);sigma[i]=drag/(2*sec.mu)+4*Math.PI**3*sec.mu*sec.ei/T**2*hz**3*s.lossAngle;
  if(relax)alpha[i]=Math.sqrt(Math.max(0,(sec.bondedEI-sec.ei)*k**4*L/2)/mn);
  for(let j=0;j<3;j++){Men.set(j,i,mass/(n*Math.PI)*(n%2?1:-1)*basis[j][pol]/sqrtM);Men.set(j+3,i,mass/(n*Math.PI)*basis[j][pol]/sqrtM);}
 }
 const BM=mm(B,Men),massDynamic=eye(b+d);put(massDynamic,mm(B,mm(Mee,transpose(B))).add(eye(b)),0,0);put(massDynamic,BM,0,b);put(massDynamic,transpose(BM),b,0);
 const massSolve=new CholeskyDecomposition(symmetric(massDynamic)),rhs=zeros(b+d,size);put(rhs,Matrix.sub(ABody,mm(B,mm(Ke,Q))),0,0);
 for(let i=0;i<d;i++){rhs.set(b+i,q0+i,-omega[i]);rhs.set(b+i,v0+i,-2*sigma[i]);if(relax)rhs.set(b+i,z0+i,-alpha[i]);}
 const solved=massSolve.solve(rhs);let A=zeros(size,size);put(A,solved.subMatrix(0,b-1,0,size-1),0,0);put(A,solved.subMatrix(b,b+d-1,0,size-1),v0,0);
 for(let i=0;i<d;i++){A.set(q0+i,v0+i,omega[i]);if(relax){A.set(z0+i,v0+i,alpha[i]);A.set(z0+i,z0+i,-2*Math.PI*1000);}}
 let R=zeros(125,size);put(R,deltaQ,0,0);for(let i=0;i<d;i++)R.set(3+i,q0+i,1/sqrtK[i]);
 const portForce=zeros(b+d,125);put(portForce,endDiff,0,0);for(let i=0;i<d;i++)portForce.set(b+i,3+i,1/sqrtM);const forceSolved=massSolve.solve(portForce);let BF=zeros(size,125);put(BF,forceSolved.subMatrix(0,b-1,0,124),0,0);put(BF,forceSolved.subMatrix(b,b+d-1,0,124),v0,0);
 // Same force and bridge distance; cap the static displacement at 5 mm.
 const external=zeros(b+d,1),fraction=spec.pluckPositionM/L,fe=zeros(6,1);for(let j=0;j<3;j++){fe.set(j,0,(1-fraction)*basis[j][1]);fe.set(j+3,0,fraction*basis[j][1]);}put(external,mm(B,fe),0,0);
 for(let n=1;n<=modeCount;n++)external.set(b+2*(n-1)+1,0,Math.sin(n*Math.PI*(1-fraction))/sqrtM);
 let fullForce=zeros(size,1);const fs=massSolve.solve(external);put(fullForce,fs.subMatrix(0,b-1,0,0),0,0);put(fullForce,fs.subMatrix(b,b+d-1,0,0),v0,0);
 let observationStart=-1;
 if(body.observerSize){
  const no=body.observerSize,Ao=new Matrix(body.observerA),Bo=new Matrix(body.observerB),Qfull=zeros(6,mechanicalSize);put(Qfull,Q,0,0);
  const load=mm(Mee,mm(transpose(B),A.subMatrix(0,b-1,0,mechanicalSize-1))).add(mm(Men,A.subMatrix(v0,v0+d-1,0,mechanicalSize-1))).mul(-1).sub(mm(Ke,Qfull));
  const direct=zeros(6,125);put(direct,transpose(diff),0,0);
  const forceLoad=direct.sub(mm(Mee,mm(transpose(B),BF.subMatrix(0,b-1,0,124)))).sub(mm(Men,BF.subMatrix(v0,v0+d-1,0,124)));
  const externalLoad=fe.clone().sub(mm(Mee,mm(transpose(B),fullForce.subMatrix(0,b-1,0,0)))).sub(mm(Men,fullForce.subMatrix(v0,v0+d-1,0,0)));
  size=mechanicalSize+no;const aa=zeros(size,size),bb=zeros(size,125),rr=zeros(125,size),ff=zeros(size,1);put(aa,A,0,0);put(aa,mm(Bo,load),mechanicalSize,0);put(aa,Ao,mechanicalSize,mechanicalSize);put(bb,BF,0,0);put(bb,mm(Bo,forceLoad),mechanicalSize,0);put(rr,R,0,0);put(ff,fullForce,0,0);put(ff,mm(Bo,externalLoad),mechanicalSize,0);A=aa;BF=bb;R=rr;fullForce=ff;observationStart=mechanicalSize;
 }
 const staticSolver=new LuDecomposition(A.clone().mul(-1)),unit=staticSolver.solve(fullForce);let pull=0;for(let n=1;n<=modeCount;n++)pull+=Math.sin(n*Math.PI*(1-fraction))*unit.get(q0+2*(n-1)+1,0)/sqrtK[2*(n-1)+1];const unitEnds=mm(Q,unit.subMatrix(0,b-1,0,0));for(let j=0;j<3;j++)pull+=basis[j][1]*((1-fraction)*unitEnds.get(j,0)+fraction*unitEnds.get(j+3,0));if(!(pull>0))throw Error('静的な引く量を計算できません');const actualForce=Math.min(config.forceN,.005/pull),linear=unit.mul(actualForce),compliance=staticSolver.solve(BF),G=mm(R,compliance),rLinear=mm(R,linear),a=zeros(125,1),H=zeros(125,125),kEA=sec.EA/L;
 for(let j=0;j<3;j++){a.set(j,0,dir[j]);for(let k=0;k<3;k++)H.set(j,k,((j===k?1:0)-dir[j]*dir[k])/L);}for(let i=0;i<d;i++)H.set(3+i,3+i,L/2*waveNumber[i]**2);
 let r=rLinear.clone(),stat;for(let iteration=0;iteration<12;iteration++){stat=gradient(r,a,H,kEA);const residual=Matrix.sub(r,rLinear).add(mm(G,stat.f));if(norm(residual)<1e-12)break;const jac=eye(125).add(mm(G,stat.h));r.sub(new LuDecomposition(jac).solve(residual));}
 stat=gradient(r,a,H,kEA);const nonlinear=Matrix.sub(linear,mm(compliance,stat.f)),staticResidual=norm(Matrix.sub(mm(R,nonlinear),r));if(staticResidual>1e-9)throw Error('非線形の初期状態が収束しませんでした');
 const E=eye(size);put(E,mm(B,mm(Mee,transpose(B))).add(mm(transpose(Q),mm(Ke,Q))).add(eye(b)),0,0);put(E,BM,0,v0);put(E,transpose(BM),v0,0);for(let i=mechanicalSize;i<size;i++)E.set(i,i,0);if(!new CholeskyDecomposition(symmetric(E.subMatrix(0,mechanicalSize-1,0,mechanicalSize-1))).isPositiveDefinite())throw Error('この設定では正の振動エネルギーを構成できません');
 const eigen=new EigenvalueDecomposition(A,{assumeSymmetric:false}),pr=eigen.realEigenvalues,pi=eigen.imaginaryEigenvalues,V=eigen.eigenvectorMatrix;
 if(pr.some(x=>!Number.isFinite(x)||x>1e-6))throw Error('この設定では安定な振動モデルを準備できません');
 const inv=new LuDecomposition(V),right=zeros(size,127);put(right,BF,0,0);put(right,nonlinear,0,125);put(right,linear,0,126);const coeff=inv.solve(right),RV=mm(R,V),CV=new Float64Array(size);for(let j=0;j<size;j++){if(observationStart>=0){for(let k=0;k<body.observerSize;k++)CV[j]+=body.observerOutput[k]*V.get(observationStart+k,j);}else for(let k=0;k<b;k++)CV[j]+=body.output[k]*V.get(k,j);}
 const keep=[];for(let i=0;i<size;i++)if(pi[i]>=0)keep.push(i);let N=keep.length,parts={p:new Float64Array(2*N),initial:new Float64Array(2*N),Q:new Float64Array(2*N*125),B:new Float64Array(2*N*125),out:new Float64Array(2*N),a:new Float64Array(a.to1DArray()),H:new Float64Array(H.to1DArray()),ea:Float64Array.of(kEA),linear:new Float64Array(2*N)};
 for(let k=0;k<N;k++){const j=keep[k],pair=pi[j]>0;parts.p[2*k]=pr[j];parts.p[2*k+1]=pi[j];parts.initial[2*k]=coeff.get(j,125);parts.initial[2*k+1]=pair?-coeff.get(j+1,125):0;parts.linear[2*k]=coeff.get(j,126);parts.linear[2*k+1]=pair?-coeff.get(j+1,126):0;parts.out[2*k]=CV[j];parts.out[2*k+1]=pair?CV[j+1]:0;
  for(let row=0;row<125;row++){const i=2*(row*N+k);parts.Q[i]=RV.get(row,j);parts.Q[i+1]=pair?RV.get(row,j+1):0;parts.B[i]=coeff.get(j,row);parts.B[i+1]=pair?-coeff.get(j+1,row):0;}
 }
 let observerInfo={};
 if(body.fullObserver){
  const Qfull=zeros(6,size);put(Qfull,Q,0,0);
  const load=mm(Mee,mm(transpose(B),A.subMatrix(0,b-1,0,size-1))).add(mm(Men,A.subMatrix(v0,v0+d-1,0,size-1))).mul(-1).sub(mm(Ke,Qfull));
  const direct=zeros(6,125);put(direct,transpose(diff),0,0);const forceLoad=direct.sub(mm(Mee,mm(transpose(B),BF.subMatrix(0,b-1,0,124)))).sub(mm(Men,BF.subMatrix(v0,v0+d-1,0,124)));
  const heldNonlinear=fe.clone().mul(actualForce).sub(mm(Ke,mm(Q,nonlinear.subMatrix(0,b-1,0,0)))).sub(mm(transpose(diff),stat.f.subMatrix(0,2,0,0)));
  const heldLinear=fe.clone().mul(actualForce).sub(mm(Ke,mm(Q,linear.subMatrix(0,b-1,0,0))));
  const composed=appendFullObserver(parts,body,{V,pr,pi,coeff,load,forceLoad,heldNonlinear,heldLinear,keep});parts=composed.parts;N=composed.N;observerInfo={fullPressureModes:composed.fullPressureModes,minObserverPoleSeparation:composed.minSeparation};
 }
 const order=['p','initial','Q','B','out','a','H','ea','linear'],bytes=8+order.reduce((s,k)=>s+parts[k].byteLength,0),binary=new ArrayBuffer(bytes),header=new DataView(binary);header.setInt32(0,N,true);header.setInt32(4,125,true);let offset=8;for(const key of order){new Float64Array(binary,offset,parts[key].length).set(parts[key]);offset+=parts[key].byteLength;}
 const reconstructed=mm(V,coeff.subMatrix(0,size-1,125,125)),initialError=norm(Matrix.sub(reconstructed,nonlinear))/Math.max(norm(nonlinear),1e-30);if(initialError>1e-7)throw Error('固有モードの初期状態を再構成できません');
 const physics={...spec,...observerInfo,states:size,modes:N,stringModes:modeCount,bodyStates:b,observerStates:body.observerSize??0,initialReconstructionRelativeError:initialError,initialStaticResidual:staticResidual,forceN:actualForce,forceLimited:actualForce<config.forceN,initialDeltaT:kEA*stat.extension,pullMm:pull*actualForce*1000,totalTensionN:totalT};
 return {binary,physics,...(debug?{debug:{A:A.to2DArray(),E:E.to2DArray(),R:R.to2DArray(),V:V.to2DArray(),keep,initial:nonlinear.to1DArray()}}:{})};
}
