/* Diagnostic decomposition of one fixed physical condition; not a tone preset. */
(function(root){
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null),S=root.StringSupport||(typeof require!=='undefined'?require('./support.js'):null),D=root.StringAttackData||(typeof require!=='undefined'?require('./attack-data.js'):null);
const views=Object.freeze([{id:'all',label:'全成分を再合成'},{id:'low',label:'約103 Hzだけ'},{id:'next',label:'約181 Hzだけ'},{id:'pair',label:'低域2成分だけ'},{id:'rest',label:'低域2成分を除く'}].map(Object.freeze));
function bothData(id){const all=root.StringBothMassData||(typeof require!=='undefined'?require('./both-mass-data.js'):null);const data=all?.[id];if(!data)throw Error('両端分解の比較条件を確認してください');return data;}
function bothViews(id){const data=bothData(id);return [{id:'all',label:'全成分を再合成'},{id:'lowest',label:'約'+Math.round(data.components[0].hz)+' Hzだけ'},{id:'pair',label:'低い2成分だけ'},{id:'third',label:'約'+Math.round(data.components[2].hz)+' Hzだけ'},{id:'rest',label:'低い2成分を除く'}];}
function render(input,sampleRate=48000){
 if(input.bothMassCase){const data=bothData(input.bothMassCase),view=bothViews(input.bothMassCase).find(v=>v.id===input.attackView);if(!view)throw Error('分解試聴の条件を確認してください');const indices=data.components.map((_,i)=>i).filter(i=>view.id==='all'||view.id==='lowest'&&i===0||view.id==='pair'&&data.lowIndices.includes(i)||view.id==='third'&&i===2||view.id==='rest'&&!data.lowIndices.includes(i));return renderDataset(input,sampleRate,data,view,indices,8);}
 const view=views.find(v=>v.id===input.attackView);if(!view)throw Error('分解試聴の条件を確認してください');
 const indices=D.components.map((_,i)=>i).filter(i=>view.id==='all'||view.id==='low'&&i===D.lowIndices[0]||view.id==='next'&&i===D.lowIndices[1]||view.id==='pair'&&D.lowIndices.includes(i)||view.id==='rest'&&!D.lowIndices.includes(i));
 return renderDataset(input,sampleRate,D,view,indices,4);
}
function renderDataset(input,sampleRate,data,view,indices,seconds){
 for(const [k,v] of Object.entries(data.conditions)){if(k==='guidedPreset')continue;const actual=input[k],same=typeof v==='number'?typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-v)<=1e-12*Math.max(1,Math.abs(v)):actual===v;if(!same)throw Error('分解試聴は固定条件で使用してください（'+k+'）');}
 const fixed={...input,...data.conditions,guidedPreset:input.guidedPreset};const spec=S.system(fixed,sampleRate).spec;if(spec.modes.length!==data.modeLimit)throw Error('このサンプルレートでは分解試聴に対応していません');
 const selected=indices.map(i=>data.components[i]);
 const size=Math.round(sampleRate*seconds),samples=new Float32Array(size),alpha=1-Math.exp(-2*Math.PI*8000/sampleRate),gain=.1*10**(fixed.gain/20);
 // Sum into Float64 so filtering/rounding remains linear across decomposed views.
 const force=new Float64Array(size);for(const c of selected){const angle=2*Math.PI*c.hz/sampleRate,decay=Math.exp(-c.sigma/sampleRate),a=decay*Math.cos(angle),b=decay*Math.sin(angle),factor=c.realPole?1:2;let re=c.residueReal,im=c.residueImag;for(let j=0;j<size;j++){force[j]+=factor*re;const next=a*re-b*im;im=b*re+a*im;re=next;}}
 let y=0,peak=0;for(let j=0;j<size;j++){y+=alpha*(force[j]-y);samples[j]=gain*y*Math.min(1,j/(sampleRate*.003))*Math.min(1,(size-1-j)/(sampleRate*.02));peak=Math.max(peak,Math.abs(samples[j]));}
 return {samples,sampleRate,spec,peak,tail:{duration:seconds,capped:false,fadeSeconds:.02},diagnostic:{caseId:input.bothMassCase||null,view:view.id,components:selected.length,lowHz:data.lowIndices.map(i=>data.components[i].hz),scope:'exact damped eigencomponent sum of fixed 96-mode condition; common monitor and gain; fixed-duration diagnostic, no normalization'}};
}
root.StringAttack={views,bothViews,render};if(typeof module!=='undefined')module.exports=root.StringAttack;
})(globalThis);
