'use strict';
// Passive, rank-one coupling between complex string and body modes.
// Modal variables are energy-normalized; an orthogonal bridge rotation exchanges
// energy in both directions, while each resonator's damping can only remove it.
// This is a reduced model, not a measured guitar bridge or a recording.
// Background: https://www.dsprelated.com/freebooks/pasp/Acoustic_Guitars.html
const NylonCoupledModel = {
 stringFor(midi,settings){return NylonModel.stringFor(midi,settings)},
 exchange(sr,si,sw,br,bi,bw,cm1,sine){
  let ar=0,ai=0,er=0,ei=0;
  for(let k=0;k<sr.length;k++){ar+=sw[k]*sr[k];ai+=sw[k]*si[k]}
  for(let k=0;k<br.length;k++){er+=bw[k]*br[k];ei+=bw[k]*bi[k]}
  const dar=cm1*ar-sine*er,dai=cm1*ai-sine*ei;
  const dbr=sine*ar+cm1*er,dbi=sine*ai+cm1*ei;
  for(let k=0;k<sr.length;k++){sr[k]+=sw[k]*dar;si[k]+=sw[k]*dai}
  for(let k=0;k<br.length;k++){br[k]+=bw[k]*dbr;bi[k]+=bw[k]*dbi}
 },
 render(rate,midi,{nail=.38,position=.22,body=.48,coupling=1,contact=0,harmonics=0,dropD=false}={},diagnostics){
  const fundamental=440*2**((midi-69)/12),count=Math.ceil(rate*3.6),out=new Float32Array(count);
  const string=NylonModel.stringFor(midi,{dropD}),{number,fret,wound}=string;
  const spectrum=harmonics?NylonSpectrum.create(string,position):null;
  const modes=Math.min(wound?96:40,Math.floor(rate*.43/fundamental));
  const contactShape=contact?NylonContact.create(rate,nail):null;
  const contactSpan=wound?(12+34*nail)*Math.max(1,Math.min(2,165/fundamental)):(7+25*nail);
  const stiffness=(number===7?.000008:wound?.000007:.000003)*Math.min(3,2**(fret/12));
  const polarizationSplit=wound?.00045:.0007;
  const baseDecay=Math.max(.7,Math.min(2.6,1.7*(196/fundamental)**.28));
  const definitions=[];
  for(let n=1;n<=modes;n++){
   const amplitude=(spectrum?spectrum.pluck(n):Math.sin(Math.PI*n*position))/n**(wound?.86:1)*(contactShape?1:Math.exp(-((n/contactSpan)**1.35)));
   const modeFrequency=fundamental*n*Math.sqrt((1+stiffness*n*n)/(1+stiffness));
   for(let polarization=0;polarization<2;polarization++){
    const frequency=modeFrequency*(polarization?1+polarizationSplit:1);
    const loss=(1+.006*Math.min(fret,20))/baseDecay+(wound?.00017:.00020)*frequency+(wound?.000000040:.000000057)*frequency*frequency;
    const response=contactShape?NylonContact.response(contactShape,frequency):{gain:1,phase:0};
    definitions.push({frequency,tau:1/(loss*(polarization?.68:1.12)),phase:n*.13+(polarization?.24:0)+response.phase,level:amplitude*(polarization?.25:.75)*(spectrum?spectrum.radiation(frequency)*(contactShape?spectrum.contactGain(response.gain):1):response.gain),weight:(polarization?.22:1)/Math.sqrt(n),glide:(wound?2.2:3.2)*(.6+.4*nail)});
   }
  }
  // Keep the existing short nail-release modes; only their connection to the body changes.
  for(let n=3;!contactShape&&n<=Math.min(modes,wound?48:18);n++)definitions.push({
   frequency:fundamental*n*Math.sqrt((1+stiffness*n*n)/(1+stiffness)),
   tau:.022+.018/(1+n/5),phase:n*.13,
   level:(spectrum?spectrum.pluck(n)*spectrum.radiation(fundamental*n):Math.sin(Math.PI*n*position))/n*(wound?.22:.14)*nail*Math.exp(-n/(wound?45:22)),
   weight:.4/Math.sqrt(n),glide:0
  });
  const size=definitions.length;
  const sr=new Float64Array(size),si=new Float64Array(size),sw=new Float64Array(size);
  const sc=new Float64Array(size),ss=new Float64Array(size),omega=new Float64Array(size),radius=new Float64Array(size),glide=new Float64Array(size);
  let weightNorm=0;
  for(let k=0;k<size;k++){
   const d=definitions[k];sr[k]=d.level*Math.sin(d.phase);si[k]=-d.level*Math.cos(d.phase);
   sw[k]=d.weight;weightNorm+=d.weight*d.weight;omega[k]=2*Math.PI*d.frequency/rate;
   radius[k]=Math.exp(-1/(rate*d.tau));glide[k]=d.glide;
  }
  weightNorm=Math.sqrt(weightNorm);for(let k=0;k<size;k++)sw[k]/=weightNorm;
  const bodyModes=[[105,.045,.11],[195,.055,.26],[285,.038,.2],[395,.029,.15],[520,.025,.15],[720,.018,.13],[1020,.014,.11],[1450,.009,.08],[1840,.007,.035],[2460,.005,.02]];
  const br=new Float64Array(bodyModes.length),bi=new Float64Array(bodyModes.length),bw=new Float64Array(bodyModes.length),bc=new Float64Array(bodyModes.length),bs=new Float64Array(bodyModes.length);
  let bodyNorm=0;
  for(let k=0;k<bodyModes.length;k++){
   const [frequency,tau,weight]=bodyModes[k],angle=2*Math.PI*frequency/rate,r=Math.exp(-1/(rate*tau));
   bc[k]=r*Math.cos(angle);bs[k]=r*Math.sin(angle);bw[k]=Math.sqrt(weight);bodyNorm+=weight;
  }
  bodyNorm=Math.sqrt(bodyNorm);for(let k=0;k<bw.length;k++)bw[k]/=bodyNorm;
  const theta=50*body*Math.max(0,Math.min(1,coupling))/rate;
  const cm1=-2*Math.sin(theta/2)**2,sine=Math.sin(theta),exchange=NylonCoupledModel.exchange;
  const energy=()=>{let string=0,bodyEnergy=0;for(let k=0;k<size;k++)string+=sr[k]**2+si[k]**2;for(let k=0;k<br.length;k++)bodyEnergy+=br[k]**2+bi[k]**2;return {string,body:bodyEnergy,total:string+bodyEnergy}};
  let initialEnergy=0,maxEnergy=0,maxBodyEnergy=0;
  if(diagnostics){initialEnergy=energy().total;maxEnergy=initialEnergy;diagnostics.snapshots=[]}
  let seed=(midi+1)*17713,low=0,previousInput=0,previousOutput=0,peak=0;
  const pole=Math.exp(-2*Math.PI*65/rate),settle=Math.ceil(rate*.14/32)*32;
  for(let i=0;i<count;i++){
   if(i<=settle&&i%32===0){
    const decay=i===settle?0:Math.exp(-i/(rate*.024));
    for(let k=0;k<size;k++){const angle=omega[k]*2**(glide[k]*decay/1200);sc[k]=radius[k]*Math.cos(angle);ss[k]=radius[k]*Math.sin(angle)}
   }
   for(let k=0;k<size;k++){const re=sr[k],im=si[k];sr[k]=sc[k]*re-ss[k]*im;si[k]=ss[k]*re+sc[k]*im}
   for(let k=0;k<br.length;k++){const re=br[k],im=bi[k];br[k]=bc[k]*re-bs[k]*im;bi[k]=bs[k]*re+bc[k]*im}
   if(theta)exchange(sr,si,sw,br,bi,bw,cm1,sine);
   let stringSignal=0,bodySignal=0;
   for(let k=0;k<size;k++)stringSignal+=sr[k];
   for(let k=0;k<br.length;k++)bodySignal+=bw[k]*br[k];
   const time=i/rate;
   if(time<.018){
    seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;
    low+=(wound?.52:.32)*(noise-low);
    stringSignal+=low*(wound?(.04+.07*nail):(.025+.055*nail))*(contactShape?NylonContact.noiseEnvelope(contactShape,time):Math.exp(-time/(.0025+.002*(1-nail))));
   }
   const attack=1-Math.exp(-time/(.0011+.002*(1-nail)));
   const input=(stringSignal*(.55-.2*body)+bodySignal*1.4)*attack;
   const high=input-previousInput+pole*previousOutput;previousInput=input;previousOutput=high;
   out[i]=high*Math.min(1,(count-1-i)/(rate*.06));peak=Math.max(peak,Math.abs(out[i]));
   if(diagnostics&&i%256===0){const state=energy();maxEnergy=Math.max(maxEnergy,state.total);maxBodyEnergy=Math.max(maxBodyEnergy,state.body);if(i%4096===0)diagnostics.snapshots.push({time,...state})}
  }
  if(diagnostics)Object.assign(diagnostics,{initialEnergy,maxEnergy,maxBodyEnergy,finalEnergy:energy().total,rawPeak:peak});
  if(peak>0)for(let i=0;i<count;i++)out[i]*=.8/peak;
  return out;
 }
};
