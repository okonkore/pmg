// Float64 physical guitar coefficient preparation. No fitted tone coefficients.
// Eigen 3.4.0 (MPL-2.0) provides the dense factorizations and real eigensolver.
#include <Eigen/Dense>
#include <Eigen/Eigenvalues>
#include <vector>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <algorithm>
using M = Eigen::MatrixXd;
using V = Eigen::VectorXd;
using RM = Eigen::Matrix<double,Eigen::Dynamic,Eigen::Dynamic,Eigen::RowMajor>;
constexpr int PORTS=125;
constexpr double PI=3.1415926535897932384626433832795;
struct Body {
  int size, observers;
  M A,B,Q,Bt,diff,deltaQ,endDiff,basis,massPattern,massBody;
  M observerR,observerI;
  V direction,por,poi,outputR,outputI;
  double chord,baseline;
};
static Body* body=nullptr;
static std::vector<unsigned char> result;
static double metadata[12];
static const char* error="";
static M take(const double*& p,int r,int c) { M m=Eigen::Map<const RM>(p,r,c);p+=r*c;return m; }
extern "C" {
void* allocate(int bytes) { return std::malloc(bytes); }
void deallocate(void* p) { std::free(p); }
const char* last_error() { return error; }
const void* result_data() { return result.data(); }
int result_size() { return int(result.size()); }
const double* result_metadata() { return metadata; }
int initialize_body(const double* p,int n,int no) {
  if(n<1||n>512||no<1||no>3000){error="Invalid body dimensions";return 0;}
  delete body;body=new Body;auto& b=*body;b.size=n;b.observers=no;
  b.A=take(p,n,n);b.B=take(p,n,6);b.Q=take(p,6,n);b.basis=take(p,3,2);b.direction=take(p,3,1);
  b.chord=*p++;b.baseline=*p++;M poles=take(p,no,2);b.por=poles.col(0);b.poi=poles.col(1);
  b.observerR=take(p,no,6);b.observerI=take(p,no,6);b.outputR=take(p,no,1);b.outputI=take(p,no,1);
  b.Bt=b.B.transpose();b.diff=M::Zero(3,6);b.diff.leftCols(3).setIdentity();b.diff.rightCols(3)=-M::Identity(3,3);
  b.deltaQ=b.diff*b.Q;b.endDiff=b.B*b.diff.transpose();b.massPattern=M::Zero(6,6);
  b.massPattern.topLeftCorner(3,3)=M::Identity(3,3)/3.;b.massPattern.bottomRightCorner(3,3)=M::Identity(3,3)/3.;
  b.massPattern.topRightCorner(3,3)=M::Identity(3,3)/6.;b.massPattern.bottomLeftCorner(3,3)=M::Identity(3,3)/6.;
  b.massBody=b.B*b.massPattern*b.Bt;error="";return 1;
}
}
struct Grad { V f;M h;double extension; };
static Grad gradient(const V& r,const V& a,const M& H,double ea) {
  V hr=H*r;double axial=a.dot(r),g=.5*r.dot(hr),e=axial+g;V u=a+hr;
  return {ea*(g*a+e*hr),ea*(u*u.transpose()-a*a.transpose()+e*H),e};
}
// Parameters: length, tension, mu, EI, bondedEI, EA, diameter, loss,
// wound, pluck position, requested force, total six-string tension, sample rate.
extern "C" int prepare_coefficients(const double* params) {
  error="";result.clear();if(!body){error="Body is not initialized";return 0;}
  const auto& b=*body;const double L=params[0],T=params[1],mu=params[2],ei=params[3],bonded=params[4],EA=params[5],diameter=params[6],loss=params[7],position=params[9],force=params[10],total=params[11],rate=params[12];
  const bool wound=params[8]!=0;int count=0;
  for(int j=1;j<=61;j++){double k=j*PI/L;if(std::sqrt((T*k*k+bonded*k*k*k*k)/mu)/(2*PI)>=rate*.45)break;count=j;}
  if(count==0){error="No resolved string fundamental";return 0;}
  const int nb=b.size,d=2*count,n=nb+2*d+(wound?d:0),q0=nb,v0=nb+d,z0=nb+2*d;
  const double mass=mu*L,mn=mass/2,sqrtM=std::sqrt(mn),ea=EA/L,fraction=position/L;
  M perp=(M::Identity(3,3)-b.direction*b.direction.transpose())*((total-b.baseline)/b.chord);
  M Ke=b.diff.transpose()*(perp+ea*b.direction*b.direction.transpose())*b.diff;
  M Mee=b.massPattern*mass,Men=M::Zero(6,d);V omega(d),sqrtK(d),sigma(d),alpha=V::Zero(d),wave(d);
  for(int j=1;j<=count;j++)for(int pol=0;pol<2;pol++) {
    int i=2*(j-1)+pol;double k=j*PI/L,w=std::sqrt((T*k*k+ei*k*k*k*k)/mu),hz=w/(2*PI);
    wave[i]=k;omega[i]=w;sqrtK[i]=sqrtM*w;
    double drag=2*PI*1.8e-5+2*PI*diameter*std::sqrt(PI*1.8e-5*1.2*hz);
    sigma[i]=drag/(2*mu)+4*PI*PI*PI*mu*ei/(T*T)*hz*hz*hz*loss;
    if(wound)alpha[i]=std::sqrt(std::max(0.,(bonded-ei)*k*k*k*k*L/2)/mn);
    Men.block(0,i,3,1)=mass/(j*PI)*(j%2?1.:-1.)/sqrtM*b.basis.col(pol);
    Men.block(3,i,3,1)=mass/(j*PI)/sqrtM*b.basis.col(pol);
  }
  M BM=b.B*Men,massDynamic=M::Identity(nb+d,nb+d);massDynamic.topLeftCorner(nb,nb)+=mass*b.massBody;
  massDynamic.topRightCorner(nb,d)=BM;massDynamic.bottomLeftCorner(d,nb)=BM.transpose();
  Eigen::LLT<M> massSolve(massDynamic);if(massSolve.info()!=Eigen::Success){error="Non-positive string/body mass";return 0;}
  M rhs=M::Zero(nb+d,n);rhs.topLeftCorner(nb,nb)=b.A-b.B*Ke*b.Q;
  for(int i=0;i<d;i++){rhs(nb+i,q0+i)=-omega[i];rhs(nb+i,v0+i)=-2*sigma[i];if(wound)rhs(nb+i,z0+i)=-alpha[i];}
  M solved=massSolve.solve(rhs),A=M::Zero(n,n);A.topRows(nb)=solved.topRows(nb);A.middleRows(v0,d)=solved.bottomRows(d);
  for(int i=0;i<d;i++){A(q0+i,v0+i)=omega[i];if(wound){A(z0+i,v0+i)=alpha[i];A(z0+i,z0+i)=-2*PI*1000;}}
  M R=M::Zero(PORTS,n);R.topLeftCorner(3,nb)=b.deltaQ;
  for(int i=0;i<d;i++)R(3+i,q0+i)=1/sqrtK[i];
  M portForce=M::Zero(nb+d,PORTS);portForce.topLeftCorner(nb,3)=b.endDiff;
  for(int i=0;i<d;i++)portForce(nb+i,3+i)=1/sqrtM;
  M fs=massSolve.solve(portForce),BF=M::Zero(n,PORTS);BF.topRows(nb)=fs.topRows(nb);BF.middleRows(v0,d)=fs.bottomRows(d);
  V external=V::Zero(nb+d),fe(6);fe.head(3)=(1-fraction)*b.basis.col(1);fe.tail(3)=fraction*b.basis.col(1);external.head(nb)=b.B*fe;
  for(int j=1;j<=count;j++)external[nb+2*(j-1)+1]=std::sin(j*PI*(1-fraction))/sqrtM;
  V fsolve=massSolve.solve(external),fullForce=V::Zero(n);fullForce.head(nb)=fsolve.head(nb);fullForce.segment(v0,d)=fsolve.tail(d);
  Eigen::PartialPivLU<M> staticSolve(-A);V unit=staticSolve.solve(fullForce);double pull=0;
  for(int j=1;j<=count;j++)pull+=std::sin(j*PI*(1-fraction))*unit[q0+2*(j-1)+1]/sqrtK[2*(j-1)+1];
  V ends=b.Q*unit.head(nb);pull+=b.basis.col(1).dot((1-fraction)*ends.head(3)+fraction*ends.tail(3));
  if(!(pull>0)){error="Invalid static pluck displacement";return 0;}
  double actualForce=std::min(force,.005/pull);V linear=unit*actualForce;M compliance=staticSolve.solve(BF),G=R*compliance;V rLinear=R*linear,a=V::Zero(PORTS);a.head(3)=b.direction;M H=M::Zero(PORTS,PORTS);
  H.topLeftCorner(3,3)=(M::Identity(3,3)-b.direction*b.direction.transpose())/L;
  for(int i=0;i<d;i++)H(3+i,3+i)=L/2*wave[i]*wave[i];
  V r=rLinear;
  for(int iteration=0;iteration<12;iteration++){Grad g=gradient(r,a,H,ea);V residual=r-rLinear+G*g.f;if(residual.norm()<1e-12)break;M jac=M::Identity(PORTS,PORTS)+G*g.h;r-=jac.partialPivLu().solve(residual);}
  Grad g=gradient(r,a,H,ea);V nonlinear=linear-compliance*g.f;double residual=(R*nonlinear-r).norm();
  if(!std::isfinite(residual)||residual>1e-9){error="Nonlinear initial state did not converge";return 0;}
  M E=M::Identity(n,n);E.topLeftCorner(nb,nb)+=mass*b.massBody+b.Q.transpose()*Ke*b.Q;E.block(0,v0,nb,d)=BM;E.block(v0,0,d,nb)=BM.transpose();
  Eigen::LLT<M> energyCheck(E);if(energyCheck.info()!=Eigen::Success){error="Non-positive vibration energy";return 0;}
  Eigen::EigenSolver<M> eigen(A,true);if(eigen.info()!=Eigen::Success){error="Real eigensolver did not converge";return 0;}
  M vectors=eigen.pseudoEigenvectors();V pr=eigen.eigenvalues().real(),pi=eigen.eigenvalues().imag();
  if(!pr.allFinite()||!pi.allFinite()||pr.maxCoeff()>1e-6){error="Unstable vibration model";return 0;}
  M right(n,127);right.leftCols(PORTS)=BF;right.col(125)=nonlinear;right.col(126)=linear;
  M coeff=vectors.partialPivLu().solve(right),RV=R*vectors;double initialError=(vectors*coeff.col(125)-nonlinear).norm()/std::max(nonlinear.norm(),1e-30);
  if(!std::isfinite(initialError)||initialError>1e-7){error="Eigenvector reconstruction failed";return 0;}
  std::vector<int> keep;for(int j=0;j<n;j++)if(pi[j]>=0)keep.push_back(j);
  const int oldN=int(keep.size()),N=oldN+b.observers;
  M Qfull=M::Zero(6,n);Qfull.leftCols(nb)=b.Q;
  M load=-Mee*b.Bt*A.topRows(nb)-Men*A.middleRows(v0,d)-Ke*Qfull;
  M direct=M::Zero(6,PORTS);direct.leftCols(3)=b.diff.transpose();
  M forceLoad=direct-Mee*b.Bt*BF.topRows(nb)-Men*BF.middleRows(v0,d);
  V heldNonlinear=fe*actualForce-Ke*b.Q*nonlinear.head(nb)-b.diff.transpose()*g.f.head(3);
  V heldLinear=fe*actualForce-Ke*b.Q*linear.head(nb);
  M fv=load*vectors,fr=b.observerR*fv,fi=b.observerI*fv,xr(b.observers,n),xi(b.observers,n);
  double minSeparation=INFINITY;
  for(int row=0;row<b.observers;row++)for(int j=0;j<n;j++) {
    double dr=pr[j]-b.por[row],di=-b.poi[row],w=pi[j],f0r=fr(row,j),f0i=fi(row,j);
    minSeparation=std::min(minSeparation,std::hypot(dr,w-b.poi[row]));
    if(w>0){
      double f1r=fr(row,j+1),f1i=fi(row,j+1),denr=dr*dr-di*di+w*w,deni=2*dr*di,den=denr*denr+deni*deni;
      if(den<1e-32){error="Unresolved coincident radiation poles";return 0;}
      double nxr=dr*f0r-di*f0i+w*f1r,nxi=dr*f0i+di*f0r+w*f1i,nyr=-w*f0r+dr*f1r-di*f1i,nyi=-w*f0i+dr*f1i+di*f1r;
      xr(row,j)=(nxr*denr+nxi*deni)/den;xi(row,j)=(nxi*denr-nxr*deni)/den;
      xr(row,j+1)=(nyr*denr+nyi*deni)/den;xi(row,j+1)=(nyi*denr-nyr*deni)/den;j++;
    }else{
      double den=dr*dr+di*di;if(den<1e-24){error="Unresolved coincident radiation poles";return 0;}
      xr(row,j)=(f0r*dr+f0i*di)/den;xi(row,j)=(f0i*dr-f0r*di)/den;
    }
  }
  M xcR=xr*coeff,xcI=xi*coeff,bfR=b.observerR*forceLoad,bfI=b.observerI*forceLoad;
  V outMechanical=xr.transpose()*b.outputR-xi.transpose()*b.outputI;
  // Identical binary layout to the existing Float64 waveform integrator.
  const int doubles=8*N+4*PORTS*N+PORTS+PORTS*PORTS+1;
  result.assign(8+8*doubles,0);int header[2]={N,PORTS};std::memcpy(result.data(),header,8);
  double* pp=reinterpret_cast<double*>(result.data()+8),*init=pp+2*N,*qq=init+2*N,*bb=qq+2*PORTS*N,*out=bb+2*PORTS*N,*aa=out+2*N,*hh=aa+PORTS,*ee=hh+PORTS*PORTS,*lin=ee+1;
  std::memcpy(aa,a.data(),PORTS*8);RM hr=H;std::memcpy(hh,hr.data(),PORTS*PORTS*8);*ee=ea;
  for(int k=0;k<oldN;k++){
    int j=keep[k];bool pair=pi[j]>0;pp[2*k]=pr[j];pp[2*k+1]=pi[j];init[2*k]=coeff(j,125);init[2*k+1]=pair?-coeff(j+1,125):0;lin[2*k]=coeff(j,126);lin[2*k+1]=pair?-coeff(j+1,126):0;out[2*k]=outMechanical[j];out[2*k+1]=pair?outMechanical[j+1]:0;
    for(int row=0;row<PORTS;row++){int ix=2*(row*N+k);qq[ix]=RV(row,j);qq[ix+1]=pair?RV(row,j+1):0;bb[ix]=coeff(j,row);bb[ix+1]=pair?-coeff(j+1,row):0;}
  }
  for(int row=0;row<b.observers;row++){
    int k=oldN+row;double por=b.por[row],poi=b.poi[row],den=por*por+poi*poi;pp[2*k]=por;pp[2*k+1]=poi;out[2*k]=b.outputR[row];out[2*k+1]=b.outputI[row];
    for(int column=125;column<=126;column++){
      const V& held=column==125?heldNonlinear:heldLinear;double rr=b.observerR.row(row).dot(held),ii=b.observerI.row(row).dot(held);double* target=column==125?init:lin;
      target[2*k]=-(rr*por+ii*poi)/den-xcR(row,column);target[2*k+1]=-(ii*por-rr*poi)/den-xcI(row,column);
    }
    for(int j=0;j<PORTS;j++){int ix=2*(j*N+k);bb[ix]=bfR(row,j)-xcR(row,j);bb[ix+1]=bfI(row,j)-xcI(row,j);}
  }
  metadata[0]=n;metadata[1]=N;metadata[2]=count;metadata[3]=initialError;metadata[4]=residual;metadata[5]=actualForce;metadata[6]=ea*g.extension;metadata[7]=pull*actualForce*1000;metadata[8]=minSeparation;metadata[9]=b.observers;metadata[10]=double(result.size());metadata[11]=0;
  return 1;
}
