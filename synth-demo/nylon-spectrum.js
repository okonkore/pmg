'use strict';
// Analytic excitation and radiation curves; no recorded waveform or measured IR.
// A first approximation guided by the reference's D3 and repeated F#4 attacks.
const NylonSpectrum = {
 create({number,fret,wound},position){
  // Fretting gradually moves the same physical pluck point along a shorter string.
  const openPosition=position*(wound?.50:1.14);
  const effective=Math.min(.43,Math.max(.045,openPosition*2**(Math.min(fret,24)/36)));
  const bell=(frequency,center,width)=>Math.exp(-.5*(Math.log2(frequency/center)/width)**2);
  return {
   pluck(n){
    const a=Math.sin(Math.PI*n*effective);
    // A small distributed excitation prevents exact, identical spectral nulls.
    return Math.sign(a||1)*Math.sqrt(a*a+.12*Math.sin(Math.PI*n*(effective+.037))**2);
   },
   radiation(frequency){
    const bass=wound?1:.3;
    const db=6*bass*bell(frequency,300,.55)+2*bell(frequency,700,.48)
      -(wound?1.4:4)*bell(frequency,1130,.17)+(wound?9:18)*bell(frequency,2620,.16);
    return 10**(db/20);
   },
   contactGain(gain){return Math.sqrt(.65**2+(1-.65**2)*gain*gain)}
  };
 }
};
