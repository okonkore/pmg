/* Computed braced modes; same classical outline and physical bridge comparison. */
(function(root){
'use strict';
const C=root.StringClassicalPlate||(typeof require!=='undefined'?require('./classical-plate.js'):null),D=root.StringBracedPlateData||(typeof require!=='undefined'?require('./braced-plate-data.js'):null);
function plateModes(parameters={},count='nine'){return C.plateModesFromData(D,parameters,count);}
const cases=Object.freeze([{id:'none',label:'A：力木なし · 前のD',bracing:'none'},{id:'fan7',label:'B：力木あり · 扇状7本＋横2本',bracing:'fan7'}].map(Object.freeze));
function config(id,view='sum'){const item=cases.find(c=>c.id===id);if(!item)throw Error('Unknown bracing case');const B=root.StringPlateBridge||(typeof require!=='undefined'?require('./plate-bridge.js'):null);return {...B.config('both',view),plateBracing:item.bracing};}
const api={plateModes,cases,config,data:D};root.StringClassicalBracing=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
