/* Fixed physical comparison conditions: never read the editable UI state. */
(function(root){
const P=root.StringPhysics||(typeof require!=='undefined'?require('./physics.js'):null);
const notes=Object.freeze([{id:'e2',label:'E2',hz:82.406889},{id:'b2',label:'B2',hz:123.470825},{id:'e3',label:'E3',hz:164.813778}].map(Object.freeze));
function config(id,supportEnabled,supportSide="nut"){
 if(!['nut','bridge','both'].includes(supportSide))throw Error('支持部の位置を確認してください');
 const note=notes.find(n=>n.id===id);if(!note)throw Error('比較する音を確認してください');
 const p={...P.defaults,scale:650,fret:0,diameter:1.02,density:1140,young:2,position:80,force:.3,lossAngle:.02,thermal:.001,air:true,duration:4,gain:0,construction:'wound',coreDiameter:.65,coreFill:.65,filaments:100,coreCoupling:0,wireDiameter:.11,wireDensity:8900,wireYoung:110,pitchRatio:1,windingParticipation:0,windingLossAngle:.02,compareHz:note.hz,releaseMs:0,excitation:'displacement',pullMm:2.5,nonlinear:false,supportEnabled:!!supportEnabled,supportSide,supportMassG:10,supportStiffness:96500,supportDamping:1,guidedPreset:note.id};
 p.tension=P.tensionAtPitch(p,note.hz,0);return p;
}
root.StringGuided={notes,config};if(typeof module!=='undefined')module.exports=root.StringGuided;
})(globalThis);
