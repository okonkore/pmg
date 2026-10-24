/* Same passive equations solved by their complete damped eigenmodes.
   Fixed comparison conditions; no modal pruning, EQ, or loudness matching. */
(function(root){'use strict';
const A=root.StringAssemblyModel||(typeof require!=='undefined'?require('./assembly-model.js'):null),D=root.StringAssemblyData||(typeof require!=='undefined'?require('./assembly-data.js'):null),P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null),Plate=root.StringPlate||(typeof require!=='undefined'?require('./plate.js'):null);
function dataset(input,sr){
 const s=P.model({...input,supportEnabled:true,supportSide:'bridge'},sr,96),d=D.cases[A.dataKey(input,s.modes.length)];
 if(!d)throw Error('この音・サンプルレートの組立比較には対応していません');
 for(const [k,v] of Object.entries(d.config))if(k!=='bodyView'&&input[k]!==v)throw Error('組立比較の固定条件が異なります：'+k);
 if(s.modes.length!==d.reference.stringModes||Math.abs(s.mass/d.reference.mass-1)>1e-12||s.modes.some((m,j)=>Math.abs(m.w/(2*Math.PI)/d.reference.modalHz[j]-1)>1e-12))throw Error('この条件の組立計算には対応していません');
 const live=A.signature(A.build(input,D.back,sr));if(live.some((v,j)=>Math.abs(v-d.reference.signature[j])>1e-9*Math.max(1,Math.abs(v))))throw Error('組立データと現在の物理モデルが一致しません');return d;
}
function select(result,input){
 if(!result.channels['without-back'])result.channels['without-back']=Float32Array.from(result.channels.sum,(v,j)=>v-result.channels.back[j]);
 const selected=Plate.select(result,input);return {...selected,body:{...selected.body,assembly:{...selected.body.assembly,readout:input.bodyView==='without-back'?'same coupled motion; back radiation omitted only from readout':'normal '+(input.bodyView||'sum')}}};
}
function render(input,sr=48000,options={}){
 const d=dataset(input,sr),gain=input.bodyPressureGain,over=32,h=1/(sr*over),views=['top','back','sides','hole','velocity'],coef=d.components.map(c=>{const u=-c.sigma*h/2,v=Math.PI*c.hz*h,den=(1-u)**2+v*v,zr=(1-u*u-v*v)/den,zi=2*v/den,r=Math.hypot(zr,zi)**over,a=Math.atan2(zi,zr)*over;return {a:r*Math.cos(a),b:r*Math.sin(a),decay:-sr*Math.log(r),factor:c.realPole?1:2,c};});
 const bound=t=>{let pressure=0,velocity=0;for(const v of coef){const f=v.factor*Math.exp(-v.decay*t);for(const k of views){const r=v.c.residues[k],value=f*Math.hypot(...r);if(k==='velocity')velocity+=8*value;else pressure+=gain*value;}}return Math.max(pressure,velocity);};
 let duration=4;while(duration<30&&bound(duration)>1e-6)duration+=.05;const quiet=duration<30,tailFade=quiet?.02:2;duration=options.duration||duration;const count=Math.ceil(sr*duration),delay=Math.round(sr/343),channels={};
 for(const name of views){const raw=new Float64Array(count);for(const v of coef){let [re,im]=v.c.residues[name];for(let j=0;j<count;j++){raw[j]+=v.factor*re;const next=v.a*re-v.b*im;im=v.b*re+v.a*im;re=next;}}const out=new Float32Array(count+delay),alpha=1-Math.exp(-2*Math.PI*8000/sr),g=name==='velocity'?8:gain;let y=0;for(let j=0;j<count;j++){y+=alpha*(raw[j]-y);const end=options.duration?1:Math.min(1,(count-1-j)/(sr*tailFade));out[j+delay]=g*y*Math.min(1,j/(sr*.003))*end;}channels[name]=out;}
 channels.sum=Float32Array.from(channels.top,(v,j)=>v+channels.back[j]+channels.sides[j]+channels.hole[j]);
 const spec={...d.spec,p:{...d.spec.p,...input},displacement:d.staticDisplacementM,energy:d.initialEnergy},result={sampleRate:sr,spec,channels,tail:{duration:(count+delay)/sr,capped:!quiet,fadeSeconds:tailFade},body:{kind:'assembly',view:'sum',plate:d.plate,air:d.air,initialEnergy:d.initialEnergy,oversample:over,assembly:{key:A.key(input),voice:input.assemblyVoice||'wound-e3',back:input.assemblyBack,neck:input.assemblyNeck,sides:input.assemblySides,parts:d.metadata,validation:d.validation,solver:D.method,tailOutputBoundFS:bound(duration),scope:D.scope,offMeaning:'rigid closed back / fixed nut / rigid side wall; same cavity volume, pluck force, gain'},radiation:{approximation:'co-located compact monopoles, outward volume velocities; no directionality or radiation loading; neck is not a separate sound source',distanceM:1,pressureGainFSPerPa:gain,delaySamples:delay,delaySeconds:delay/sr,radiationLoading:false}}};return select(result,input);
}
const api={config:A.config,key:A.key,voices:A.voices,dataset,render,select};root.StringAssembly=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
