/* Diagnostic decomposition of one fixed physical condition; not a tone preset. */
(function(root){
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null),S=root.StringSupport||(typeof require!=='undefined'?require('./support.js'):null),D=root.StringAttackData||(typeof require!=='undefined'?require('./attack-data.js'):null);
const views=Object.freeze([{id:'all',label:'全成分を再合成'},{id:'low',label:'約103 Hzだけ'},{id:'next',label:'約181 Hzだけ'},{id:'pair',label:'低域2成分だけ'},{id:'rest',label:'低域2成分を除く'}].map(Object.freeze));
function render(input,sampleRate=48000){
 const view=views.find(v=>v.id===input.attackView);if(!view)throw Error('分解試聴の条件を確認してください');
 for(const [k,v] of Object.entries(D.conditions)){if(k==='guidedPreset')continue;const actual=input[k],same=typeof v==='number'?typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-v)<=1e-12*Math.max(1,Math.abs(v)):actual===v;if(!same)throw Error('分解試聴は固定条件で使用してください（'+k+'）');}
 const fixed={...input,...D.conditions,guidedPreset:input.guidedPreset};const spec=S.system(fixed,sampleRate).spec;if(spec.modes.length!==D.modeLimit)throw Error('このサンプルレートでは分解試聴に対応していません');
 const selected=D.components.filter((c,i)=>view.id==='all'||view.id==='low'&&i===D.lowIndices[0]||view.id==='next'&&i===D.lowIndices[1]||view.id==='pair'&&D.lowIndices.includes(i)||view.id==='rest'&&!D.lowIndices.includes(i));
 const size=Math.round(sampleRate*4),samples=new Float32Array(size),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate),gain=.1*10**(fixed.gain/20);
 // Sum into Float64 so filtering/rounding remains linear across decomposed views.
 const force=new Float64Array(size);for(const c of selected){const angle=2*Math.PI*c.hz/sampleRate,decay=Math.exp(-c.sigma/sampleRate),a=decay*Math.cos(angle),b=decay*Math.sin(angle),factor=c.realPole?1:2;let re=c.residueReal,im=c.residueImag;for(let j=0;j<size;j++){force[j]+=factor*re;const next=a*re-b*im;im=b*re+a*im;re=next;}}
 let y=0,peak=0;for(let j=0;j<size;j++){y+=alpha*(force[j]-y);samples[j]=gain*y*Math.min(1,j/(sampleRate*.003))*Math.min(1,(size-1-j)/(sampleRate*.02));peak=Math.max(peak,Math.abs(samples[j]));}
 return {samples,sampleRate,spec,peak,tail:{duration:4,capped:false,fadeSeconds:.02},diagnostic:{view:view.id,components:selected.length,lowHz:D.lowIndices.map(i=>D.components[i].hz),scope:'exact damped eigencomponent sum of fixed 96-mode condition; common monitor and gain; four-second diagnostic, no normalization'}};
}
root.StringAttack={views,render};if(typeof module!=='undefined')module.exports=root.StringAttack;
})(globalThis);
