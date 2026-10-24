/* Species-average front plate. Geometry, thickness, braces and loss stay fixed. */
(function(root){'use strict';
const C=root.StringClassicalPlate||(typeof require!=='undefined'?require('./classical-plate.js'):null),D=root.StringWoodPlateData||(typeof require!=='undefined'?require('./wood-plate-data.js'):null);
const profiles=[{id:'baseline',label:'これまでの仮定材'},...Object.entries(D).map(([id,d])=>({id,label:d.wood.label}))];
function plateModes(id,parameters={},count='nine'){const data=D[id];if(!data)throw Error('Unknown soundboard wood');const plate=C.plateModesFromData(data,parameters,count);plate.geometry.woodId=id;plate.geometry.wood=data.wood;return plate;}
function config(id,voice='plain-e4',view='sum'){if(!profiles.some(p=>p.id===id))throw Error('Unknown soundboard wood');const A=root.StringAssemblyModel||(typeof require!=='undefined'?require('./assembly-model.js'):null),c=A.config(true,true,true,view,voice);if(id!=='baseline')c.plateWood=id;return c;}
const api={profiles,plateModes,config,data:D};root.StringWoodPlate=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
