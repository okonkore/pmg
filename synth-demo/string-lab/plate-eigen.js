/* Fixed-condition damped eigenmode diagnosis; poles/residues derived from M,K,C.
   Uses the SAME implicit midpoint step map as the physical renderer. No audio fit. */
(function(root){
'use strict';
const Plate=root.StringPlate||(typeof require!=='undefined'?require('./plate.js'):null),G=root.StringGuided||(typeof require!=='undefined'?require('./guided.js'):null),D=root.StringPlateEigenData||(typeof require!=='undefined'?require('./plate-eigen-data.js'):null);
function config(scale,view='eigen-all'){if(![1,4].includes(scale))throw Error('Unknown eigenmode case');return {...G.positionConfig('mm80'),excitation:'force',force:G.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view,bodyPressureGain:2,plateModes:'nine',plateStiffnessScale:scale,plateFixDamping:true,plateEigenDiagnostic:true};}
function close(actual,expected){if(typeof expected==='number')return Number.isFinite(actual)&&Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected));return actual===expected;}
function dataset(input,sampleRate){
 const state=Plate.system(input,sampleRate),data=D.find(v=>v.scale===input.plateStiffnessScale&&v.modeCount===state.n&&v.sampleRate===sampleRate)||D.find(v=>v.scale===input.plateStiffnessScale&&v.modeCount===state.n);
 if(!data)throw Error('このサンプルレートの共振分解には対応していません');
 for(const [key,value] of Object.entries(data.conditions))if(!['bodyView','guidedPreset'].includes(key)&&!close(input[key],value))throw Error('共振の診断は固定条件で使用してください：'+key);
 for(const [key,expected] of Object.entries(data.reference)){const actual=key==='specMass'?state.spec.mass:key==='initialEnergy'?state.spec.energy:state[key];if(Array.isArray(expected)){if(!actual||actual.length!==expected.length||!expected.every((v,j)=>close(actual[j],v)))throw Error('共振データと現在の物理モデルが一致しません：'+key);}else if(!close(actual,expected))throw Error('共振データと現在の物理モデルが一致しません：'+key);}
 return data;
}
function synthesize(components,sampleRate,length,delay,fadeSeconds,oversample=32){
 const size=length-delay,raw=new Float64Array(size),h=1/(sampleRate*oversample);
 for(const c of components){const u=-c.sigma*h/2,v=Math.PI*c.hz*h,den=(1-u)**2+v*v,zr=(1-u*u-v*v)/den,zi=2*v/den,amplitude=Math.hypot(zr,zi)**oversample,angle=Math.atan2(zi,zr)*oversample,a=amplitude*Math.cos(angle),b=amplitude*Math.sin(angle),factor=c.realPole?1:2;let re=c.residueReal,im=c.residueImag;
  for(let j=0;j<size;j++){raw[j]+=factor*re;const next=a*re-b*im;im=b*re+a*im;re=next;}
 }
 const samples=new Float32Array(length),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate),fadeStart=Math.max(0,size-Math.ceil(sampleRate*fadeSeconds));let y=0;
 for(let j=0;j<size;j++){y+=alpha*(raw[j]-y);samples[j+delay]=2*y*Math.min(1,j/(sampleRate*.003));if(j>=fadeStart)samples[j+delay]*=(size-1-j)/(sampleRate*fadeSeconds);}
 return samples;
}
function select(result,input){const view=input.bodyView||'eigen-all';if(!result.channels[view]||!view.startsWith('eigen-'))throw Error('Unknown coupled resonance view');const selected=Plate.select(result,input);return {...selected,body:{...selected.body,eigenDiagnostic:{...selected.body.eigenDiagnostic,selectedView:view}}};}
function render(input,sampleRate=48000,options={}){
 const data=dataset(input,sampleRate),original=Plate.render({...input,bodyView:'sum',plateStartDiagnostic:false,plateDiagnostic:false},sampleRate,options),delay=original.body.radiation.delaySamples,over=original.body.oversample,channels={...original.channels,'eigen-all':original.samples};
 const chosen=data.selected.map(i=>data.components[i]),argumentsForSound=[sampleRate,original.samples.length,delay,original.tail.fadeSeconds,over];
 channels['eigen-ring']=synthesize(chosen,...argumentsForSound);channels['eigen-rest']=Float32Array.from(original.samples,(v,j)=>v-channels['eigen-ring'][j]);
 chosen.forEach((c,j)=>channels['eigen-mode-'+j]=synthesize([c],...argumentsForSound));
 const reconstruction=synthesize(data.components,...argumentsForSound);let maxError=0,difference=0,power=0;
 for(let j=0;j<reconstruction.length;j++){const delta=reconstruction[j]-original.samples[j];maxError=Math.max(maxError,Math.abs(delta));difference+=delta*delta;power+=original.samples[j]*original.samples[j];}
 const relativeRms=Math.sqrt(difference/Math.max(power,1e-30));if(maxError>1e-5||relativeRms>1e-4)throw Error('共振分解と元の振動計算の一致を確認できませんでした');
 const metadata={selectedView:input.bodyView,components:chosen.map(c=>({...c,amplitude60dBSeconds:Math.log(1000)/c.sigma})),selection:data.selection,solver:data.solver,referenceValidated:true,allModeReconstructionMaxError:maxError,allModeReconstructionRelativeRms:relativeRms,scope:'Damped eigenmodes of the full coupled string/plate/cavity; same midpoint time map, common pressure readout and gain. Readout removal does not rebuild the mechanical system.'};
 return select({...original,channels,body:{...original.body,eigenDiagnostic:metadata}},input);
}
root.StringPlateEigen={config,dataset,synthesize,select,render};if(typeof module!=='undefined')module.exports=root.StringPlateEigen;
})(globalThis);
