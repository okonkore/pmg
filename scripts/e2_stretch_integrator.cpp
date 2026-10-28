#include <algorithm>
#include <cmath>
#include <complex>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <vector>
using C=std::complex<double>;
template<class T> void read(std::ifstream& f,std::vector<T>& v){f.read((char*)v.data(),v.size()*sizeof(T));if(!f)throw std::runtime_error("Incomplete model");}
int main(int argc,char**argv){try{
 if(argc!=7)throw std::runtime_error("model.bin prefix sampleRate duration nonlinear[0/1] snapshotHz");
 std::ifstream in(argv[1],std::ios::binary);int32_t N=0,D=0;if(!in)throw std::runtime_error("Cannot open model");in.read((char*)&N,4);in.read((char*)&D,4);if(!in||N<1||N>10000||D!=125)throw std::runtime_error("Invalid dimensions");
 std::vector<C>p(N),z0(N),Q(N*D),B(N*D),out(N),zl(N);std::vector<double>a(D),H(D*D),ea(1);read(in,p);read(in,z0);read(in,Q);read(in,B);read(in,out);read(in,a);read(in,H);read(in,ea);read(in,zl);
 int fs=std::stoi(argv[3]),nonlinear=std::stoi(argv[5]),snapshotHz=std::stoi(argv[6]);double duration=std::stod(argv[4]);if(fs<8000||fs>384000||!std::isfinite(duration)||duration<=0||duration>10||snapshotHz<=0)throw std::runtime_error("Invalid integration options");int count=std::lround(fs*duration),snap=std::max(1,fs/snapshotHz);double dt=1./fs;
 if(fs<8000||count<1||nonlinear<0||nonlinear>1)throw std::runtime_error("Invalid integration options");
 std::vector<double>zr(N),zi(N),er(N),ei(N),qr(N*D),qi(N*D),br(N*D),bi(N*D),rr(D),hr(D),force(D);std::vector<C>state(N);
 for(int k=0;k<N;k++){C zz=nonlinear?z0[k]:zl[k];zr[k]=zz.real();zi[k]=zz.imag();C e=std::exp(p[k]*dt);er[k]=e.real();ei[k]=e.imag();}
 for(int k=0;k<N*D;k++){qr[k]=Q[k].real();qi[k]=Q[k].imag();br[k]=B[k].real();bi[k]=B[k].imag();}
 std::string prefix=argv[2];std::ofstream audio(prefix+".f32",std::ios::binary),states(prefix+".states",std::ios::binary),log(prefix+".csv");log<<"time,deltaT,addedLength,nonlinearPotential\n";
 auto pressure=[&](){double v=0;
 #pragma omp simd reduction(+:v)
 for(int k=0;k<N;k++)v+=out[k].real()*zr[k]-out[k].imag()*zi[k];return v;};
 double tension=0,extension=0,unl=0;
 auto gradient=[&](){
 for(int j=0;j<D;j++){double v=0;int o=j*N;
 #pragma omp simd reduction(+:v)
 for(int k=0;k<N;k++)v+=qr[o+k]*zr[k]-qi[o+k]*zi[k];rr[j]=v;}
 double axial=0,g=0;
 for(int j=0;j<D;j++){hr[j]=0;if(j<3){for(int k=0;k<3;k++)hr[j]+=H[j*D+k]*rr[k];}else hr[j]=H[j*D+j]*rr[j];axial+=a[j]*rr[j];g+=.5*rr[j]*hr[j];}
 extension=axial+g;tension=ea[0]*extension;unl=ea[0]*(axial*g+.5*g*g);
 for(int j=0;j<D;j++)force[j]=ea[0]*(g*a[j]+extension*hr[j]);
 };
 auto kick=[&](double h){for(int j=0;j<D;j++){double f=h*force[j];int o=j*N;
 #pragma omp simd
 for(int k=0;k<N;k++){zr[k]-=f*br[o+k];zi[k]-=f*bi[o+k];}}};
 auto save=[&](int step,bool halfBehind){
 for(int k=0;k<N;k++)state[k]=C(zr[k],zi[k]);
 if(halfBehind){for(int j=0;j<D;j++){double f=.5*dt*force[j];int o=j*N;for(int k=0;k<N;k++)state[k]-=f*B[o+k];}}
 states.write((char*)state.data(),N*sizeof(C));log<<double(step)/fs<<","<<tension<<","<<extension<<","<<unl<<"\n";
 };
 gradient();save(0,false);float value=(float)pressure();audio.write((char*)&value,4);if(nonlinear)kick(.5*dt);
 for(int step=1;step<count;step++){
 #pragma omp simd
 for(int k=0;k<N;k++){double r=zr[k],i=zi[k];zr[k]=er[k]*r-ei[k]*i;zi[k]=ei[k]*r+er[k]*i;}
 if(nonlinear||step%snap==0||step==count-1)gradient();
 value=(float)pressure();if(!std::isfinite(value)||!std::isfinite(tension))throw std::runtime_error("Nonfinite state");audio.write((char*)&value,4);
 bool last=step==count-1;
 if(step%snap==0||last)save(step,nonlinear);
 if(nonlinear)kick(last?.5*dt:dt);
 }
 if(!audio||!states||!log)throw std::runtime_error("Output write failure");std::cout<<"DONE "<<N<<" modes "<<fs<<" Hz "<<count<<" samples\n";
 }catch(const std::exception&e){std::cerr<<e.what()<<"\n";return 1;}}
