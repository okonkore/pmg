import {validateSettings,prepareSettings,signature} from '../../instruments/configured-guitar/settings.js';
export const EXPERIMENT_VERSION='pmg-experimental-pluck-v3-standard-v1-matched-finite2-handoff2';
export const LIMITS=Object.freeze({notes:6,rate:48000,minSeconds:.05,maxSeconds:1,cacheBytes:8*1024*1024,cacheEntries:16});
// Assets used in the independent 0.5s handoff validation. Unknown assets use fine.
export const VALIDATED_ASSETS=Object.freeze({"body":"6001a0e616fcf62ac0a73c00d49719528173404ddc430bc6f897f1cf6dd56a1d","coefficients":"acb9da7fa0752d61f73442c670eb3920d1aebe72cdff7af49f0d9b5340fd2a75","kernel":"b20fd024239bab86924030d806d2968297d05bbed5c18ae3fb7f2cb0df5a755a","defaults":"c18f4efbfb1c557e8a5e8abc689bd65b97a6defffe8a39b0475706e580aadd03"});
export function normalizeExperiment(input){
 if(!input||!Array.isArray(input.notes)||input.notes.length<1||input.notes.length>LIMITS.notes)throw Error('Choose 1–6 notes for the experiment');
 const settings=validateSettings(input.settings),rate=input.rate??LIMITS.rate,seconds=input.seconds??.5,release=input.release??{seconds:.000513,shape:'cosine'},mode=input.mode??'auto';
 // Alternate tuning is not part of the validated finite-release experiment.
 if(settings.version!==1)throw Error('Experimental pluck currently requires standard-tuning version1 settings');
 if(rate!==LIMITS.rate||!Number.isFinite(seconds)||seconds<LIMITS.minSeconds||seconds>LIMITS.maxSeconds)throw Error('Experiment supports 48kHz and 0.05–1 second notes');
 if(!Number.isFinite(release.seconds)||release.seconds<0||release.seconds>.005||!['linear','cosine'].includes(release.shape)||!['auto','fine'].includes(mode))throw Error('Invalid experimental release/options');
 const comparisonRelease=input.comparisonRelease;
 if(comparisonRelease&&(release.seconds!==0||!Number.isFinite(comparisonRelease.seconds)||comparisonRelease.seconds<=0||comparisonRelease.seconds>.005||!['linear','cosine'].includes(comparisonRelease.shape)))throw Error('Matched baseline requires an explicit finite comparison release');
 const context=prepareSettings(settings),seen=new Set(),notes=[];
 for(const note of input.notes){const c=context.conditions(note.midi,note.stringNumber),id=`${c.string}:${c.midi}`;if(!seen.has(id)){seen.add(id);notes.push({id,midi:c.midi,stringNumber:c.string});}}
 const frames=Math.round(seconds*rate);
 return {settings,rate,frames,seconds:frames/rate,release:{seconds:release.seconds,shape:release.shape},mode,notes,...(comparisonRelease?{comparisonRelease:{seconds:comparisonRelease.seconds,shape:comparisonRelease.shape}}:{})};
}
export function integrationFor(request,note,defaults,assets){
 if(request.release.seconds===0&&request.comparisonRelease){const plan=integrationFor({...request,release:request.comparisonRelease,comparisonRelease:undefined},note,defaults,assets);return {...plan,instantaneousComparison:true};}
 if(request.release.seconds===0)return {releaseSeconds:0,shape:request.release.shape,substeps:1,postRelease:'fine',block:4,sparseTolerance:.03,linearAfter:12};
 // Use block2 only inside the measured preparation configuration. Other cases
 // retain the slow path; that is not a claim of measured-guitar calibration.
 const validated=Object.keys(VALIDATED_ASSETS).every(key=>assets?.[key]===VALIDATED_ASSETS[key])&&request.mode==='auto'&&[650,700].includes(request.settings.scaleMm)&&request.frames<=24000&&request.release.seconds===.000513&&request.release.shape==='cosine'&&((note.midi===40&&note.stringNumber===6)||(note.midi===64&&note.stringNumber===1))&&signature({...request.settings,scaleMm:650})===signature({...defaults,scaleMm:650});
 return {releaseSeconds:request.release.seconds,shape:request.release.shape,substeps:1,postRelease:validated?'block':'fine',block:validated?2:1};
}
export function experimentKey(request,note,integration,assets){
 return EXPERIMENT_VERSION+':'+JSON.stringify({assets,settings:request.settings,rate:request.rate,frames:request.frames,note:{midi:note.midi,stringNumber:note.stringNumber},release:request.release,comparisonRelease:request.comparisonRelease,mode:request.mode,integration});
}
