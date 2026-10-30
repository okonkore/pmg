/** Opt-in prescribed force release. Not loaded by the published app.
 * create(model, kernel, rate, options) takes the builder result {binary,physics}.
 * The force is embedded in the coefficients, not an independent amplitude knob.
 * releaseSeconds: seconds; shape: linear or cosine. No contact/friction model.
 */
import {PhysicalGuitarEngine} from '../../instruments/physical-guitar/engine.js';
export class FinitePluckEngine extends PhysicalGuitarEngine {
 static async create(model,kernel,rate=48000,options={}) {
  if(!model?.binary||!Number.isFinite(model.physics?.forceN)||model.physics.forceN<=0||'forceN' in options||'heldForceN' in options)throw Error('Pass the coefficient builder result; force is embedded in its equilibrium');
  return super.create(model.binary,kernel,rate,{...options,heldForceN:model.physics.forceN});
 }
 constructor(bytes,instance,rate,options={}) {
  const {releaseSeconds=0,shape='cosine',substeps=1,heldForceN,nonlinearStrength=1,postRelease='fine',instantaneousComparison=false,...base}=options;
  if(typeof instantaneousComparison!=='boolean'||instantaneousComparison&&releaseSeconds<=0)throw Error('Matched instantaneous comparison needs a positive integration window');
  if(!['fine','block'].includes(postRelease)||postRelease==='block'&&nonlinearStrength!==1)throw Error('Block handoff requires the nonlinear model');
  if(!Number.isFinite(releaseSeconds)||releaseSeconds<0||releaseSeconds>.02||!['linear','cosine'].includes(shape)||![1,2,4,8].includes(substeps)||![0,1].includes(nonlinearStrength))throw Error('Invalid finite pluck options');
  if(releaseSeconds>0&&(!(heldForceN>0)||!Number.isFinite(heldForceN)||base.scale!==undefined&&base.scale!==1||base.reference||base.sparseTolerance||base.linearAfter!==undefined&&base.linearAfter!==Infinity))throw Error('Finite release requires actual held force, unit initial scale, dense nonlinear integration');
  // block2 passed the long-window accuracy budget; block4 remains explicit research.
  if(releaseSeconds>0&&postRelease==='block'&&base.block===undefined)base.block=2;
  super(bytes,instance,rate,base);
  this.instantaneousComparison=instantaneousComparison;this.postRelease=postRelease;this.handoffSample=Math.ceil(releaseSeconds*rate);
  this.releaseSeconds=releaseSeconds;this.releaseShape=shape;this.substeps=substeps;this.heldForceN=heldForceN;this.nonlinearStrength=nonlinearStrength;
  if(!releaseSeconds){if(nonlinearStrength!==1)throw Error('Zero-duration path preserves the production model');return;}
  this.drive=new Float64Array(this.p.length);
  for(let k=0;k<this.n;k++){const j=2*k,pr=this.p[j],pi=this.p[j+1],zr=this.linearInitial[j],zi=this.linearInitial[j+1];this.drive[j]=-pr*zr+pi*zi;this.drive[j+1]=-pi*zr-pr*zi;}
  if(!nonlinearStrength)this.z.data.set(this.linearInitial);
  this.stepE=this.alloc(this.p.length);this.stepC=this.alloc(this.p.length);this.halfE=this.alloc(this.p.length);this.halfC=this.alloc(this.p.length);
  this.coef(this.dt/substeps,this.stepE.data,this.stepC.data);this.coef(this.dt/substeps/2,this.halfE.data,this.halfC.data);
 }
 forceFraction(time){if(this.instantaneousComparison)return 0;if(time>=this.releaseSeconds)return 0;const u=time/this.releaseSeconds;return this.releaseShape==='linear'?1-u:(1+Math.cos(Math.PI*u))/2;}
 forceAt(time){if(!Number.isFinite(time)||time<0)throw Error('Invalid force time');return this.releaseSeconds?this.heldForceN*this.forceFraction(time):0;}
 forcedGradient(state,result,time){
  if(this.nonlinearStrength)this.gradient(state,result);else result.data.fill(0);
  const f=this.forceFraction(time);for(let j=0;j<this.drive.length;j++)result.data[j]-=this.drive[j]*f;
 }
 reset(scale=1){
  if(this.releaseSeconds&&scale!==1)throw Error('Finite release requires equilibrium initial scale');
  super.reset(scale);if(this.releaseSeconds&&!this.nonlinearStrength)this.z.data.set(this.linearInitial);
 }
 render(output){
  if(!this.releaseSeconds)return super.render(output);
  if(this.failed)throw Error('Engine has stopped');
  const h=this.dt/this.substeps;
  for(let i=0;i<output.length;i++){
   // End the release on the next sample boundary, including a partial last
   // force interval. All modal coordinates (including radiation) are retained.
   // phase remains zero until super.render starts its first fresh midpoint block.
   if(this.postRelease==='block'&&this.age>=this.handoffSample){super.render(output.subarray(i));return output;}
   let y=0;
   for(let s=0;s<this.substeps;s++){
    const t=(this.age+s/this.substeps)/this.rate;
    this.forcedGradient(this.z,this.f0,t);this.mid.data.set(this.z.data);
    this.wasm.flow(this.mid.ptr,this.halfE.ptr,this.halfC.ptr,this.f0.ptr,this.out.ptr,this.n);
    this.forcedGradient(this.mid,this.fm,t+h/2);
    const before=this.wasm.flow(this.z.ptr,this.stepE.ptr,this.stepC.ptr,this.fm.ptr,this.out.ptr,this.n);
    if(s===0)y=before; // Kernel observes before advancing; preserve the sample time across substeps.
   }
   const v=y*this.gain;if(!Number.isFinite(v)||Math.abs(v)>2){this.failed=true;output.fill(0);throw Error('Physical state exceeded safe output range');}
   output[i]=v;this.age++;
  }
  return output;
 }
}
