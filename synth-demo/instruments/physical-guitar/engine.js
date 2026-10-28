/** Float64 coupled modal engine. No samples, EQ, mode removal or output envelope.
 * Linear body/air/Maxwell propagation is exact; nonlinear force is integrated
 * with exponential midpoint at a configurable substep. Reference mode uses the
 * original sample-wise symmetric kicks. Both retain every exported mode/port.
 */
export class PhysicalGuitarEngine {
 static async create(bytes, kernel, rate=48000, options={}) {
  if(!Number.isFinite(rate)||rate<32000||rate>96000)throw Error('Unsupported sample rate');
  const {instance}=await WebAssembly.instantiate(kernel);return new this(bytes,instance,rate,options);
 }
 constructor(bytes,instance,rate,{block=4,reference=false,scale=1,sparseTolerance=0,linearAfter=Infinity}={}) {
  const header=new DataView(bytes);this.n=header.getInt32(0,true);this.d=header.getInt32(4,true);
  if(this.n<1||this.n>4096||this.d!==125||bytes.byteLength!==8+16*(3*this.n+2*this.n*this.d)+8*(this.d+this.d*this.d+1)+16*this.n)throw Error('Invalid model dimensions');
  if(!Number.isInteger(block)||block<1||block>64||!Number.isFinite(scale)||scale<=0||scale>3)throw Error('Invalid integration options');
  this.wasm=instance.exports;this.rate=rate;this.block=block;this.reference=reference;this.linearAfter=linearAfter;this.age=0;this.phase=0;this.failed=false;this.dt=1/rate;this.gain=.4286610858558977;this.next=0;
  const allocate=count=>{const ptr=this.next;this.next+=count*8;return {ptr,data:new Float64Array(this.wasm.memory.buffer,ptr,count)};};this.alloc=allocate;
  const n=this.n,d=this.d,nd=2*n,padded=d+1;let offset=8;
  const read=count=>{const a=new Float64Array(bytes,offset,count);offset+=count*8;return a;};
  this.p=read(nd).slice();const initial=read(nd),q=read(nd*d),b=read(nd*d),out=read(nd);
  this.a=read(d).slice();this.h=read(d*d).slice();this.ea=read(1)[0];this.linearInitial=read(nd).slice();
  for(const a of [this.p,initial,q,b,out,this.a,this.h,this.linearInitial])if(!a.every(Number.isFinite))throw Error('Nonfinite model');
  if(!Number.isFinite(this.ea)||this.ea<=0)throw Error('Invalid axial stiffness');
  this.initial=initial.slice();this.z=allocate(nd);this.z.data.set(initial);for(let i=0;i<nd;i++)this.z.data[i]*=scale;
  this.mid=allocate(nd);this.q=allocate(nd*d);this.b=allocate(nd*padded);this.out=allocate(nd);this.out.data.set(out);
  for(let j=0;j<d;j++)for(let k=0;k<n;k++){const i=2*(j*n+k);this.q.data[i]=q[i];this.q.data[i+1]=-q[i+1];this.b.data[(2*k)*padded+j]=b[i];this.b.data[(2*k+1)*padded+j]=b[i+1];}
  this.r=allocate(d);this.force=allocate(padded);this.f0=allocate(nd);this.fm=allocate(nd);this.zero=allocate(nd);
  this.e=allocate(nd);this.c=allocate(nd);this.ehalf=allocate(nd);this.chalf=allocate(nd);this.coef(this.dt,this.e.data,this.c.data);this.coef(block*this.dt/2,this.ehalf.data,this.chalf.data);
  if(sparseTolerance){
   if(!Number.isFinite(sparseTolerance)||sparseTolerance<0||sparseTolerance>.1)throw Error('Invalid sparsity tolerance');
   const mask=new Uint8Array(d*n);
   for(let j=0;j<d;j++){let qm=0,bm=0;for(let k=0;k<n;k++){const i=2*(j*n+k);qm=Math.max(qm,Math.hypot(q[i],q[i+1]));bm=Math.max(bm,Math.hypot(b[i],b[i+1]));}for(let k=0;k<n;k++){const i=2*(j*n+k);mask[j*n+k]=Math.hypot(q[i],q[i+1])>=qm*sparseTolerance||Math.hypot(b[i],b[i+1])>=bm*sparseTolerance;}}
   this.qs=this.sparsify(this.q.data,d,nd,(j,k)=>mask[j*n+(k>>1)]);
   this.bs=this.sparsify(this.b.data,nd,padded,(j,k)=>k<d&&mask[k*n+(j>>1)]);
  }
  this.energyScratch=new Float64Array(d);this.lastDeltaT=0;this.linearOnly=false;
  if(reference){this.gradient(this.z,this.f0);this.kick(.5*this.dt,this.f0);this.firstPressure=this.pressure(initial,scale);}
 }
 reset(scale=1){if(!Number.isFinite(scale)||scale<=0||scale>2)throw Error('Invalid displacement scale');for(let i=0;i<this.z.data.length;i++)this.z.data[i]=this.initial[i]*scale;this.age=0;this.phase=0;this.failed=false;this.lastDeltaT=0;if(this.reference){this.gradient(this.z,this.f0);this.kick(.5*this.dt,this.f0);this.firstPressure=this.pressure(this.initial,scale);}}
 sparsify(matrix,rows,cols,keep){const values=[],columns=[],offsets=[0];for(let j=0;j<rows;j++){for(let k=0;k<cols;k+=2)if((keep(j,k)&&matrix[j*cols+k]!==0)||(keep(j,k+1)&&matrix[j*cols+k+1]!==0)){values.push(keep(j,k)?matrix[j*cols+k]:0,keep(j,k+1)?matrix[j*cols+k+1]:0);columns.push(k);}offsets.push(columns.length);}
  const v=this.alloc(values.length),ix=this.alloc(Math.ceil(columns.length/2)),o=this.alloc(Math.ceil(offsets.length/2));v.data.set(values);new Uint32Array(this.wasm.memory.buffer,ix.ptr,columns.length).set(columns);new Uint32Array(this.wasm.memory.buffer,o.ptr,offsets.length).set(offsets);return {v:v.ptr,ix:ix.ptr,o:o.ptr,rows,nonzeros:values.length};}
 dot(sparse,matrix,vector,result,rows,cols){if(sparse)this.wasm.csr(sparse.v,sparse.ix,sparse.o,vector.ptr,result.ptr,rows);else this.wasm.dot(matrix.ptr,vector.ptr,result.ptr,rows,cols);}
 coef(h,e,c) {for(let k=0;k<this.n;k++){const pr=this.p[2*k],pi=this.p[2*k+1],amp=Math.exp(pr*h)>1e-200?Math.exp(pr*h):0,er=amp*Math.cos(pi*h),ei=amp*Math.sin(pi*h),den=pr*pr+pi*pi;e[2*k]=er;e[2*k+1]=ei;c[2*k]=((er-1)*pr+ei*pi)/den;c[2*k+1]=(ei*pr-(er-1)*pi)/den;}}
 pressure(z,scale=1){let y=0;for(let k=0;k<this.n;k++)y+=this.out.data[2*k]*z[2*k]-this.out.data[2*k+1]*z[2*k+1];return y*scale;}
 gradient(state,result) {
  this.dot(this.qs,this.q,state,this.r,this.d,2*this.n);const r=this.r.data,hr=this.energyScratch,f=this.force.data;let axial=0,g=0;
  for(let j=0;j<this.d;j++){let v=0;if(j<3){for(let k=0;k<3;k++)v+=this.h[j*this.d+k]*r[k];}else v=this.h[j*this.d+j]*r[j];hr[j]=v;axial+=this.a[j]*r[j];g+=.5*r[j]*v;}
  const extension=axial+g;this.lastDeltaT=this.ea*extension;
  for(let j=0;j<this.d;j++)f[j]=this.ea*(g*this.a[j]+extension*hr[j]);f[this.d]=0;
  this.dot(this.bs,this.b,this.force,result,2*this.n,this.d+1);
 }
 kick(h,f){const z=this.z.data;for(let k=0;k<z.length;k++)z[k]-=h*f.data[k];}
 beginBlock(){this.gradient(this.z,this.f0);this.mid.data.set(this.z.data);this.wasm.flow(this.mid.ptr,this.ehalf.ptr,this.chalf.ptr,this.f0.ptr,this.out.ptr,this.n);this.gradient(this.mid,this.fm);}
 render(output) {
  if(this.failed)throw Error('Engine has stopped');
  for(let i=0;i<output.length;i++) {
   let y;
   if(this.age/this.rate>=this.linearAfter){y=this.wasm.flow(this.z.ptr,this.e.ptr,this.zero.ptr,this.zero.ptr,this.out.ptr,this.n);}
   else if(this.reference){if(this.age===0)y=this.firstPressure;else{this.wasm.flow(this.z.ptr,this.e.ptr,this.zero.ptr,this.zero.ptr,this.out.ptr,this.n);y=this.pressure(this.z.data);this.gradient(this.z,this.f0);this.kick(this.dt,this.f0);}}
   else {if(this.phase===0)this.beginBlock();y=this.wasm.flow(this.z.ptr,this.e.ptr,this.c.ptr,this.fm.ptr,this.out.ptr,this.n);this.phase=(this.phase+1)%this.block;}
   const v=y*this.gain;if(!Number.isFinite(v)||Math.abs(v)>2){this.failed=true;output.fill(0);throw Error('Physical state exceeded safe output range');}output[i]=v;this.age++;
  }
  return output;
 }
}
