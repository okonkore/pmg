'use strict';
// Simplified physical synthesis: pluck-position-dependent bridge force,
// two string polarizations, frequency-dependent losses and synthetic body modes.
// All excitation and resonances are calculated; no recordings or measured IRs.
const NylonModel = {
 stringFor(midi,{dropD=false}={}){
  // Seven-string tuning: B1, E2, A2, D3, G3, B3, E4. Extend the outer strings.
  const openStrings=[35,dropD?38:40,45,50,55,59,64];
  const index=openStrings.reduce((chosen,note,i)=>note<=midi?i:chosen,0);
  const openMidi=openStrings[index];
  return {number:7-index,openMidi,fret:Math.max(0,midi-openMidi),wound:openMidi<=50};
 },
 render(rate,midi,{nail=.38,position=.22,body=.48,contact=0,harmonics=0,dropD=false}={}){
  const fundamental=440*2**((midi-69)/12),seconds=3.6;
  const count=Math.ceil(rate*seconds),bridge=new Float32Array(count),out=new Float32Array(count);
  const string=NylonModel.stringFor(midi,{dropD}),{number,fret,wound}=string;
  const spectrum=harmonics?NylonSpectrum.create(string,position):null;
  // Bass strings need more modes to reach the same audible upper-frequency range.
  const modes=Math.min(wound?96:40,Math.floor(rate*.43/fundamental));
  const contactShape=contact?NylonContact.create(rate,nail):null;
  const contactSpan=wound?(12+34*nail)*Math.max(1,Math.min(2,165/fundamental)):(7+25*nail);
  const stiffness=(number===7?.000008:wound?.000007:.000003)*Math.min(3,Math.pow(2,fret/12));
  const polarizationSplit=wound?.00045:.0007;
  const baseDecay=Math.max(.7,Math.min(2.6,1.7*Math.pow(196/fundamental,.28)));
  for(let n=1;n<=modes;n++){
   // Triangular initial displacement becomes bridge force proportional to 1/n.
   const contact=Math.exp(-Math.pow(n/contactSpan,1.35));
   const amplitude=(spectrum?spectrum.pluck(n):Math.sin(Math.PI*n*position))/Math.pow(n,wound?.86:1)*(contactShape?1:contact);
   const modeFrequency=fundamental*n*Math.sqrt((1+stiffness*n*n)/(1+stiffness));
   for(let polarization=0;polarization<2;polarization++){
    const frequency=modeFrequency*(polarization?1+polarizationSplit:1);
    // Fretted strings lose a little more energy. Preserve the wound strings' upper modes.
    const fretLoss=1+.006*Math.min(fret,20);
    const loss=fretLoss/baseDecay+(wound?.00017:.00020)*frequency+(wound?.000000040:.000000057)*frequency*frequency;
    const tau=1/(loss*(polarization? .68:1.12));
    const radius=Math.exp(-1/(rate*tau)),omega=2*Math.PI*frequency/rate;
    const b=radius*radius;
    // Small tension rise at release settles in ~25 ms; this is not vibrato or random detuning.
    const onsetCents=(wound?2.2:3.2)*(.6+.4*nail),pitchRatio=Math.pow(2,onsetCents/1200);
    const settle=Math.ceil(rate*.14/32)*32;
    let a=2*radius*Math.cos(omega*pitchRatio);
    const response=contactShape?NylonContact.response(contactShape,frequency):{gain:1,phase:0};
    const phase=n*.13+(polarization?.24:0)+response.phase,level=amplitude*(polarization?.25:.75)*(spectrum?spectrum.radiation(frequency)*(contactShape?spectrum.contactGain(response.gain):1):response.gain);
    let previous=level*Math.sin(phase-omega*pitchRatio)/radius,current=level*Math.sin(phase);
    for(let i=0;i<count;i++){
     if(i<=settle&&i%32===0){
      const cents=i===settle?0:onsetCents*Math.exp(-i/(rate*.024));
      a=2*radius*Math.cos(omega*Math.pow(2,cents/1200));
     }
     bridge[i]+=current;
     const next=a*current-b*previous;previous=current;current=next;
    }
   }
  }
  // A small, short-lived set of upper string modes represents the release of the nail.
  // It changes the first few tens of milliseconds without adding a persistent bright layer.
  for(let n=3;!contactShape&&n<=Math.min(modes,wound?48:18);n++){
   const frequency=fundamental*n*Math.sqrt((1+stiffness*n*n)/(1+stiffness));
   const amplitude=(spectrum?spectrum.pluck(n)*spectrum.radiation(frequency):Math.sin(Math.PI*n*position))/n*(wound?.22:.14)*nail*Math.exp(-n/(wound?45:22));
   const tau=.022+.018/(1+n/5),r=Math.exp(-1/(rate*tau));
   const omega=2*Math.PI*frequency/rate,a=2*r*Math.cos(omega),b=r*r;
   let previous=amplitude*Math.sin(n*.13-omega)/r,current=amplitude*Math.sin(n*.13);
   const length=Math.min(count,Math.ceil(rate*.22));
   for(let i=0;i<length;i++){bridge[i]+=current;const next=a*current-b*previous;previous=current;current=next;}
  }
  // Short finger/nail contact is excitation, never a persistent noise loop.
  let seed=(midi+1)*17713,low=0;
  for(let i=0;i<count;i++){
   const time=i/rate;
   if(time<.018){
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    const noise=(seed>>>0)/2147483648-1;low+=(wound?.52:.32)*(noise-low);
    bridge[i]+=low*(wound?(.04+.07*nail):(.025+.055*nail))*(contactShape?NylonContact.noiseEnvelope(contactShape,time):Math.exp(-time/(.0025+.002*(1-nail))));
   }
   bridge[i]*=1-Math.exp(-time/(.0011+.002*(1-nail)));
   out[i]=bridge[i]*(.55-.2*body);
  }
  // Parametric guitar body. Frequencies are illustrative, not fitted to a recording.
  // Constant-peak bandpass modes avoid a delayed, dominant resonance near G3 (195 Hz).
  const bodyModes=[[105,.045,.11],[195,.055,.26],[285,.038,.2],[395,.029,.15],[520,.025,.15],[720,.018,.13],[1020,.014,.11],[1450,.009,.08],[1840,.007,.035],[2460,.005,.02]];
  for(const [frequency,tau,weight] of bodyModes){
   const omega=2*Math.PI*frequency/rate,r=Math.exp(-1/(rate*tau));
   const a=2*r*Math.cos(omega),b=r*r,gain=(1-b)*.5;
   let y1=0,y2=0;
   for(let i=0;i<count;i++){
    const next=a*y1-b*y2+gain*(bridge[i]-(i>=2?bridge[i-2]:0));y2=y1;y1=next;
    out[i]+=next*weight*body*3;
   }
  }
  // Radiated sound has less sub-bass; smooth the finite buffer's final tail.
  let previousInput=0,previousOutput=0,peak=0;
  const pole=Math.exp(-2*Math.PI*65/rate);
  for(let i=0;i<count;i++){
   const input=out[i],high=input-previousInput+pole*previousOutput;
   previousInput=input;previousOutput=high;
   out[i]=high*Math.min(1,(count-1-i)/(rate*.06));peak=Math.max(peak,Math.abs(out[i]));
  }
  if(peak>0)for(let i=0;i<count;i++)out[i]*=.8/peak;
  return out;
 }
};
