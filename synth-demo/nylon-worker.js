'use strict';
const workerVersion=typeof location==='undefined'?'':location.search;
importScripts(...['nylon-contact.js','nylon-spectrum.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js'].map(name=>name+workerVersion));
const cooperative=typeof setTimeout==='function'&&typeof performance!=='undefined';
const queue=[];let running=false;
function choose(settings){return settings.bridge?NylonBridgeModel:settings.coupling===0?NylonModel:NylonCoupledModel}
function failure(id,error){self.postMessage({id,error:error.message})}
async function drain(){
 if(running)return;running=true;
 try{
  while(queue.length){
   const {id,rate,midi,settings}=queue.shift();
   try{const model=choose(settings),values=model.renderAsync?await model.renderAsync(rate,midi,settings):model.render(rate,midi,settings);self.postMessage({id,midi,values},[values.buffer])}catch(error){failure(id,error)}
   await new Promise(resolve=>setTimeout(resolve,8));
  }
 }finally{running=false}
}
self.onmessage=({data})=>{
 if(cooperative){queue.push(data);void drain();return}
 // Synchronous hosts without a timer keep the same model API.
 const {id,rate,midi,settings}=data;
 try{const values=choose(settings).render(rate,midi,settings);self.postMessage({id,midi,values},[values.buffer])}catch(error){failure(id,error)}
};
