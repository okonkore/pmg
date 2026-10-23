/* Physical bridge attachment position; unchanged plate basis and material. */
(function(root){
'use strict';
const G=root.StringGuided||(typeof require!=='undefined'?require('./guided.js'):null);
const cases=Object.freeze([{id:'center',label:'A：板の中央 · 22.5 cm',x:.225},{id:'reference',label:'B：これまでの位置 · 31 cm',x:.31},{id:'edge',label:'C：縁寄り · 38 cm',x:.38}].map(Object.freeze));
function config(id,view='sum'){const c=cases.find(v=>v.id===id);if(!c||!['sum','top','hole'].includes(view))throw Error('Unknown bridge position comparison');return {...G.positionConfig('mm80'),excitation:'force',force:G.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view,bodyPressureGain:.5,plateModes:'nine',plateStiffnessScale:4,plateFixDamping:true,plateParameters:{bridgeX:c.x,bridgeY:.175}};}
const api={cases,config};root.StringPlatePosition=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
