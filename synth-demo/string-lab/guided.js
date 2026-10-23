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
root.StringGuided={notes,config,lossLevels,lossConfig,stiffnessLevels,stiffnessConfig};if(typeof module!=='undefined')module.exports=root.StringGuided;
})(globalThis);
