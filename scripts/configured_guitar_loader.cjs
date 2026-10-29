const fs=require('node:fs'),path=require('node:path');
module.exports=async function load(){
 const root=path.join(process.cwd(),'synth-demo/instruments'),base=path.join(root,'configured-guitar');
 globalThis.mlMatrix=require(path.join(base,'vendor/ml-matrix-6.12.1.js'));
 const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const settingsURL=data(fs.readFileSync(path.join(base,'settings.js'))),observerURL=data(fs.readFileSync(path.join(base,'observer.js')));
 const source=fs.readFileSync(path.join(base,'prepare.js'),'utf8').replace("import './vendor/ml-matrix-6.12.1.js';",'').replace("'./settings.js'",JSON.stringify(settingsURL)).replace("'./observer.js'",JSON.stringify(observerURL));
 const {buildModel}=await import(data(source));
 const settings=await import(settingsURL);
 const {PhysicalGuitarEngine}=await import(data(fs.readFileSync(path.join(root,'physical-guitar/engine.js'))));
 return {buildModel,settings,PhysicalGuitarEngine,root,base};
};
