/* Instrument parameters for the tested fixed-support physical string. */
(function(root){'use strict';
const P=root.StringPhysics||(typeof require!=='undefined'?require('./string-lab/physics.js'):null);
const defaults=Object.freeze({material:'plain',maxForce:4,position:80,maxPullMm:5});
function prepare(midi,velocity=1,settings={},rate=48000){
 const s={...defaults,...settings};if(!Number.isInteger(midi)||midi<21||midi>108||!Number.isFinite(velocity)||velocity<=0||velocity>1||!['plain','wound'].includes(s.material)||!Number.isFinite(s.maxForce)||s.maxForce<=0||s.maxForce>4||!Number.isFinite(s.position)||s.position<10||s.position>160||!Number.isFinite(s.maxPullMm)||s.maxPullMm<=0||s.maxPullMm>5||!Number.isFinite(rate)||rate<8000)throw Error('弦Ver2の演奏条件を確認してください');
 const hz=440*2**((midi-69)/12),p={...P.defaults,scale:650,fret:0,diameter:1.02,density:1140,young:2,position:s.position,force:1,lossAngle:.02,thermal:.001,air:true,duration:4,gain:0,construction:s.material,coreDiameter:.65,coreFill:.65,filaments:100,coreCoupling:0,wireDiameter:.11,wireDensity:8900,wireYoung:110,pitchRatio:1,windingParticipation:0,windingLossAngle:.02,compareHz:hz,releaseMs:0,excitation:'force',contactWidthMm:0,nonlinear:false,supportEnabled:false};
 p.tension=P.tensionAtPitch(p,hz,0);const unit=P.model(p,rate),maximum=Math.min(s.maxForce,s.maxPullMm/1000/unit.displacement);p.force=maximum*velocity;const spec=P.model(p,rate),tail=P.tailPlan(spec);
 return {midi,velocity,conditions:spec.p,pullMm:spec.displacement*1000,requestedForce:s.maxForce*velocity,forceLimited:maximum<s.maxForce,mass:spec.mass,hz:spec.modes[0].hz,rate,duration:tail.duration,fadeSeconds:tail.fadeSeconds,modes:spec.modes.map(m=>({w:m.w,sigma:m.sigma,q:m.q,bridge:m.bridge}))};
}
root.StringVoiceModel={defaults,prepare};if(typeof module!=='undefined')module.exports=root.StringVoiceModel;
})(globalThis);
