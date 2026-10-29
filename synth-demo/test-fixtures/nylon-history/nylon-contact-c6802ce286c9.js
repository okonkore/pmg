'use strict';
// Reduced contact excitation. A unilateral 3/2-power compression release and
// a short nail-edge release generate a force spectrum for modal initialization.
// This is not a full finger-mass/friction solver. No recordings are used.
const NylonContact={
 create(rate,nail){
  nail=Math.max(0,Math.min(1,nail));
  const duration=.00008+.00065*(1-nail)**1.45;
  const edgeTime=duration*.72,edgeWidth=.000035+.000045*(1-nail);
  const count=Math.max(8,Math.ceil(rate*(duration+edgeWidth*4)));
  const force=new Float64Array(count);let sum=0;
  for(let i=0;i<count;i++){
   const time=i/rate,compression=Math.max(0,1-time/duration);
   const flesh=compression**1.5;
   const nailEdge=Math.exp(-.5*((time-edgeTime)/edgeWidth)**2);
   force[i]=(1-.28*nail)*flesh+.55*nail*nail*nailEdge;sum+=force[i];
  }
  for(let i=0;i<count;i++)force[i]/=sum;
  return {force,rate,duration,edgeTime,edgeWidth,nail};
 },
 response(shape,frequency){
  let re=0,im=0;
  for(let i=0;i<shape.force.length;i++){
   const angle=2*Math.PI*frequency*i/shape.rate;
   re+=shape.force[i]*Math.cos(angle);im-=shape.force[i]*Math.sin(angle);
  }
  return {gain:Math.hypot(re,im),phase:Math.atan2(im,re)};
 },
 noiseEnvelope(shape,time){
  // A brief, soft contact burst plus a smaller nail-edge release; not sustained hiss.
  return .5*Math.exp(-time/(.0007+.0012*(1-shape.nail)))+
   .5*shape.nail*Math.exp(-.5*((time-shape.edgeTime)/(shape.edgeWidth*2))**2);
 }
};
