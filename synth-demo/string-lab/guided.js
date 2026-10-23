/* Fixed physical comparison conditions: never read the editable UI state. */
(function(root){
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
const notes=Object.freeze([{id:'e2',label:'E2',hz:82.406889},{id:'b2',label:'B2',hz:123.470825},{id:'e3',label:'E3',hz:164.813778}].map(Object.freeze));
function config(id,supportEnabled,supportSide="nut",profile="standard"){
 if(!["standard","soft"].includes(profile))throw Error("比較条件を確認してください");
 if(!['nut','bridge','both'].includes(supportSide))throw Error('支持部の位置を確認してください');
 const note=notes.find(n=>n.id===id);if(!note)throw Error('比較する音を確認してください');
 const p={...P.defaults,scale:650,fret:0,diameter:1.02,density:1140,young:2,position:80,force:.3,lossAngle:.02,thermal:.001,air:true,duration:4,gain:0,construction:'wound',coreDiameter:.65,coreFill:.65,filaments:100,coreCoupling:0,wireDiameter:.11,wireDensity:8900,wireYoung:110,pitchRatio:1,windingParticipation:0,windingLossAngle:.02,compareHz:note.hz,releaseMs:0,excitation:'displacement',pullMm:2.5,nonlinear:false,supportEnabled:!!supportEnabled,supportSide,supportMassG:10,supportStiffness:96500,supportDamping:1,guidedPreset:note.id};
 if(profile==="soft")Object.assign(p,{supportMassG:2,supportStiffness:.002*(2*Math.PI*220)**2,supportDamping:.02,guidedPreset:note.id+"-soft"});
 p.tension=P.tensionAtPitch(p,note.hz,0);return p;
}
const lossLevels=Object.freeze([{id:'low',label:'損失 小 · 0.02',damping:.02},{id:'medium',label:'損失 中 · 0.2',damping:.2},{id:'high',label:'損失 大 · 2',damping:2}].map(Object.freeze));
function lossConfig(side,level){
 const choice=lossLevels.find(v=>v.id===level);if(!choice)throw Error('損失の比較条件を確認してください');
 return {...config('e3',true,side,'soft'),supportDamping:choice.damping,guidedPreset:'e3-soft-loss-'+side+'-'+choice.id};
}
const stiffnessLevels=Object.freeze([{id:'soft',label:'柔らかい · 1/4',ratio:.25},{id:'baseline',label:'基準の硬さ',ratio:1},{id:'hard',label:'硬い · 4倍',ratio:4}].map(Object.freeze));
function stiffnessConfig(side,level){
 const choice=stiffnessLevels.find(v=>v.id===level);if(!choice)throw Error('硬さの比較条件を確認してください');
 const base=lossConfig(side,'medium');
 return {...base,supportStiffness:base.supportStiffness*choice.ratio,guidedPreset:'e3-stiffness-'+side+'-'+choice.id};
}
function attackLossConfig(level){const choice=lossLevels.find(v=>v.id===level);if(!choice)throw Error('アタックの比較条件を確認してください');return {...stiffnessConfig('nut','soft'),supportDamping:choice.damping,guidedPreset:'e3-attack-loss-'+choice.id};}
function attackConfig(view){const data=root.StringAttackData||(typeof require!=='undefined'?require('./attack-data.js'):null);return {...data.conditions,attackView:view,guidedPreset:'e3-attack-view-'+view};}
const massLevels=Object.freeze([{id:'light',label:'軽い · 0.5 g',massG:.5},{id:'baseline',label:'基準 · 2 g',massG:2},{id:'heavy',label:'重い · 8 g',massG:8}].map(Object.freeze));
function massConfig(side,level){const choice=massLevels.find(v=>v.id===level);if(!choice)throw Error('質量の比較条件を確認してください');return {...lossConfig(side,'medium'),supportMassG:choice.massG,guidedPreset:'e3-mass-'+side+'-'+choice.id};}
const nearMassLevels=Object.freeze([6,7,8,9,10].map(massG=>Object.freeze({id:'g'+massG,label:massG===8?'8 g（基準）':massG+' g',massG})));
function nearMassConfig(side,level){const choice=nearMassLevels.find(v=>v.id===level);if(!choice)throw Error('8 g近傍の比較条件を確認してください');return {...massConfig(side,'heavy'),supportMassG:choice.massG,guidedPreset:'e3-mass-near-'+side+'-'+choice.id};}
function bothMassAnalysisConfig(id,view){const all=root.StringBothMassData||(typeof require!=='undefined'?require('./both-mass-data.js'):null);const data=all?.[id];if(!data)throw Error('両端分解の比較条件を確認してください');return {...data.conditions,bothMassCase:id,attackView:view,guidedPreset:'e3-both-analysis-'+id+'-'+view};}
const positionLevels=Object.freeze([40,80,160].map(position=>Object.freeze({id:'mm'+position,label:position===80?'80 mm（基準）':position+' mm',position})));
function positionSupportConfig(level){const choice=positionLevels.find(v=>v.id===level);if(!choice)throw Error('弾く位置の比較条件を確認してください');return {...nearMassConfig('both','g8'),position:choice.position,guidedPreset:'e3-position-'+choice.id};}
function positionConfig(level){return {...positionSupportConfig(level),supportEnabled:false,guidedPreset:'e3-position-fixed-'+level};}
const fretLevels=Object.freeze([0,5,12].map(fret=>Object.freeze({id:'f'+fret,label:fret===0?'開放':fret+'フレット',fret})));
function fretConfig(level){const choice=fretLevels.find(v=>v.id===level);if(!choice)throw Error('弦長の比較条件を確認してください');const base=positionConfig('mm80');return {...base,fret:choice.fret,position:base.position*2**(-choice.fret/12),guidedPreset:'e3-fret-'+choice.id};}
const tensionLevels=Object.freeze([{id:'loose',label:'ゆるい · D3',semitones:-2},{id:'baseline',label:'基準 · E3',semitones:0},{id:'tight',label:'張った · F♯3',semitones:2}].map(Object.freeze));
function tensionConfig(level){const choice=tensionLevels.find(v=>v.id===level);if(!choice)throw Error('張力の比較条件を確認してください');const base=positionConfig('mm80'),hz=base.compareHz*2**(choice.semitones/12);return {...base,tension:P.tensionAtPitch(base,hz,0),compareHz:hz,guidedPreset:'e3-tension-'+choice.id};}
const diameterLevels=Object.freeze([{id:'thin',label:'細い · 0.75 mm',diameter:.75},{id:'baseline',label:'基準 · 1.02 mm',diameter:1.02},{id:'thick',label:'太い · 1.30 mm',diameter:1.30}].map(Object.freeze));
function diameterConfig(level){const choice=diameterLevels.find(v=>v.id===level);if(!choice)throw Error('太さの比較条件を確認してください');const p={...positionConfig('mm80'),construction:'plain',diameter:choice.diameter,guidedPreset:'e3-diameter-'+choice.id};p.tension=P.tensionAtPitch(p,p.compareHz,0);return p;}
root.StringGuided={notes,config,lossLevels,lossConfig,stiffnessLevels,stiffnessConfig,attackLossConfig,attackConfig,massLevels,massConfig,nearMassLevels,nearMassConfig,bothMassAnalysisConfig,positionLevels,positionConfig,positionSupportConfig,fretLevels,fretConfig,tensionLevels,tensionConfig,diameterLevels,diameterConfig};if(typeof module!=='undefined')module.exports=root.StringGuided;
})(globalThis);
