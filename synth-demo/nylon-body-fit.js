'use strict';
// Shared observation profile fitted to multiple notes, not note-specific EQ.
// Recording includes microphone/room effects; these are not measured physical body parameters.
// A4 refinement: modest shared radiation gain changes; mechanics and phases retained.
const NylonBodyFit = {
 "pluckScale": 0.7,
 "radiativeFractions": [
  0.005020320077307681,
  0.0012110022351293867,
  0.03902567386288779,
  0.03256753811609177,
  0.016848726213644912,
  0.030926063266087843,
  0.06494194183290584,
  0.007835369786949908,
  0.009266195152877228,
  0.015912474709354668,
  0.00038023545679054363,
  0.02612520528507395,
  0.10183595080119764,
  0.7538200670470018
 ],
 "radiationPhases": [
  -0.00126472,
  0.01166354,
  -0.6,
  0.26131173,
  0.01353157,
  0.6,
  -0.24285992,
  0.17877705,
  0.05711083,
  -0.10031131,
  -0.23877698,
  -0.35268994,
  -0.04317298,
  0.46337326
 ]
};

// 2026-10-20: shared output balance guided by six isolated guitar notes.
// Previous profile above remains available for A/B. No recorded audio is used.
// Mechanics, modal phases and pluck-position mapping are retained.
const NylonReferenceFit = {
 "pluckScale": 0.7,
 "radiativeFractions": [
  0.0008905975357020864,
  0.0007716526363529485,
  0.22802606339851972,
  0.008176945908348167,
  0.00212112895867201,
  0.003893360693243211,
  0.008175706086470384,
  0.0021542366416897477,
  0.014257481799676251,
  0.011429448609014027,
  0.00029659964548783173,
  0.007375713421560796,
  0.043651472422771356,
  1
 ],
 "radiationPhases": [
  -0.00126472,
  0.01166354,
  -0.6,
  0.26131173,
  0.01353157,
  0.6,
  -0.24285992,
  0.17877705,
  0.05711083,
  -0.10031131,
  -0.23877698,
  -0.35268994,
  -0.04317298,
  0.46337326
 ]
};

// Wound-string release spectrum. Smooth harmonic-order curves for the low and
// upper wound strings; the fifth string interpolates between them. These are
// excitation amplitudes, not a sampled signal or measured impulse response.
const NylonWoundExcitation = {
 "knots": [
  1,
  2,
  3,
  4,
  6,
  9,
  14,
  22,
  40,
  96
 ],
 "low": [
  0,
  4.93691,
  5.44278,
  2.7055,
  -6.36522,
  -4.953,
  4.50965,
  0.89375,
  -0.75144,
  -0.72077
 ],
 "high": [
  0,
  1.62304,
  -1.7805,
  -5.83769,
  -4.60939,
  1.65379,
  5.33859,
  -3.43717,
  -4.03771,
  -3.53914
 ]
};
NylonWoundExcitation.gain = function(harmonic,openMidi,frequency=0){
 const x=this.knots;let k=0;
 while(k<x.length-2&&harmonic>x[k+1])k++;
 const t=Math.max(0,Math.min(1,Math.log(harmonic/x[k])/Math.log(x[k+1]/x[k])));
 const blend=Math.max(0,Math.min(1,(openMidi-40)/10));
 const at=curve=>curve[k]*(1-t)+curve[k+1]*t;
 // Gentle release rolloff; low-order core remains unaffected below 550 Hz.
 const q=Math.max(0,(frequency-550)/900),rolloff=-3*q*q/(1+q*q);
 return 10**((at(this.low)*(1-blend)+at(this.high)*blend+rolloff)/20);
};

// Additional intrinsic amplitude loss (/s), confined to upper wound partials.
// Low partials keep their sustain; no filtering or sampled resonance is added.
NylonWoundExcitation.loss = function(frequency,openMidi=50){
 const q=Math.max(0,(frequency-500)/500);
 const blend=Math.max(0,Math.min(1,(openMidi-40)/10));
 return Math.min(8,(.75+.35*blend)*q*q/(1+q));
};

// Third-string trial: excitation and passive loss fitted across three G3 takes.
// Opt-in for the listening comparison; does not change other strings.
const NylonThirdExcitation = {
 "stiffness": 0.0001037,
 "gainDb": [
  0,
  -17.536,
  -37.317,
  -23.382,
  -29.416,
  -18.278,
  1.138,
  3.0,
  -5.606,
  -21.428,
  -8.629,
  -5.162,
  -4.441,
  -20.46,
  -27.329,
  -16.047,
  -23.844,
  -30.227,
  -22.81,
  -38.926,
  -28.444,
  -33.614,
  -28.124,
  -34.528,
  -29.391,
  -22.653,
  -26.672,
  -33.215,
  -41.926,
  -41.926,
  -36.968,
  -35.46,
  -30.0,
  -30.6,
  -31.2,
  -31.8,
  -32.4,
  -33.0,
  -33.6,
  -34.2,
  -34.8,
  -35.4,
  -36.0,
  -36.6,
  -37.2,
  -37.8,
  -38.4,
  -39.0
 ],
 "lossPerSecond": [
  0,
  0.0,
  0.0,
  0.7331,
  0.4,
  0.0,
  1.9127,
  2.5806,
  1.1931,
  0.0,
  0.2895,
  1.832,
  4.8876,
  0.0,
  0.923,
  2.043,
  2.1535,
  1.2544,
  5.3298,
  1.2544,
  5.4728,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  1.2544,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2
 ],
 "contactEnergyFraction": 2e-06,
 "contactDuration": 0.12,
 "contactTimeConstant": 0.045
};
