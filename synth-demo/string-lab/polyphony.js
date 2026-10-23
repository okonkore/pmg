/* Independent string forces summed at fixed gain; no inter-string coupling. */
(function(root){'use strict';
const G=root.StringGuided||(typeof require!=='undefined'?require('./guided.js'):null),N=root.StringNonlinear||(typeof require!=='undefined'?require('./nonlinear.js'):null);
function mix(config,clips,sampleRate){
 const level=G.sequenceLevels.find(v=>v.id===config.sequenceId);if(!level||clips.length!==3)throw Error('複数弦の条件を確認してください');
 const offsets=clips.map((_,i)=>Math.round(i*level.intervalMs*sampleRate/1000));
 if(clips.some(c=>c.sampleRate!==sampleRate||!c.samples.length))throw Error('弦ごとの音声条件を確認してください');
 const sum=new Float64Array(Math.max(...clips.map((c,i)=>c.samples.length+offsets[i])));
 clips.forEach((c,i)=>{for(let j=0;j<c.samples.length;j++)sum[j+offsets[i]]+=c.samples[j];});
 const samples=Float32Array.from(sum);let peak=0;for(const v of samples){if(!Number.isFinite(v))throw Error('複数弦の計算結果を確認してください');peak=Math.max(peak,Math.abs(v));}
 return {samples,sampleRate,peak,spec:{...clips[0].spec,p:{...config}},tail:{duration:samples.length/sampleRate,capped:clips.some(c=>c.tail.capped),threshold:clips[0].tail.threshold,fadeSeconds:Math.max(...clips.map(c=>c.tail.fadeSeconds))},polyphony:{sequenceId:level.id,intervalMs:level.intervalMs,coupling:false,voices:clips.map((c,i)=>({offsetSamples:offsets[i],onsetSeconds:offsets[i]/sampleRate,conditions:c.spec.p,hz:c.spec.modes[0].hz,peak:c.peak,tail:c.tail,nonlinear:{initialDelta:c.nonlinear.initialDelta,initialEnergy:c.nonlinear.initialEnergy,finalEnergy:c.nonlinear.finalEnergy,oversample:c.nonlinear.oversample}}))}};
}
function render(config,sampleRate=48000,options={autoTail:true}){if(!G.sequenceLevels.some(v=>v.id===config.sequenceId))throw Error('複数弦の弾き方を確認してください');const stems=G.sequenceVoices().map(c=>N.render(c,sampleRate,options)),result=mix(config,stems,sampleRate);result.stems=stems;return result;}
root.StringPolyphony={mix,render};if(typeof module!=='undefined')module.exports=root.StringPolyphony;
})(globalThis);
