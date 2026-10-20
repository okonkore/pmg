'use strict';
importScripts('nylon-contact.js','nylon-spectrum.js','nylon-model.js','nylon-coupled-model.js','nylon-body-fit.js','nylon-bridge-model.js');
self.onmessage=({data:{id,rate,midi,settings}})=>{
 try{
  const model=settings.bridge?NylonBridgeModel:settings.coupling===0?NylonModel:NylonCoupledModel;
  const values=model.render(rate,midi,settings);
  self.postMessage({id,midi,values},[values.buffer]);
 }catch(error){self.postMessage({id,error:error.message})}
};
