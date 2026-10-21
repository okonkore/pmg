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
 "contactTimeConstant": 0.045,
 "onsetRiseSeconds": 0.02
};

// First-string listening trial: continuous interpolation across measured frets.
const NylonFirstExcitation = {
 "onsetRiseSeconds": 0.012,
 "anchors": [
  {
   "fret": 0,
   "stiffness": 6.785914515190595e-06,
   "gainDb": [
    0,
    -4.285,
    9.552,
    2.3,
    -2.96,
    -3.935,
    -2.95,
    -0.107,
    -5.758,
    -12.658,
    3.369,
    8.947,
    -6.462,
    0.013,
    -6.908,
    9.655,
    18.0,
    18.0,
    18.0,
    6.319,
    11.393,
    17.589,
    18.0,
    17.189,
    18.0,
    18.0,
    18.0,
    18.0,
    -20.4,
    -21.0,
    -21.6,
    -22.2,
    -22.8,
    -23.4,
    -24.0,
    -24.6,
    -25.2,
    -25.8,
    -26.4,
    -27.0,
    -27.6,
    -28.2,
    -28.8,
    -29.4,
    -30.0,
    -30.6,
    -31.2,
    -31.8
   ],
   "lossPerSecond": [
    0.4215,
    1.0959,
    2.1886,
    1.2083,
    1.7281,
    1.2559,
    1.9286,
    1.878,
    4.3318,
    0.6771,
    0,
    0.9392,
    0,
    1.5789,
    0.0,
    0,
    2.0,
    0.6,
    2.0,
    0.0,
    0.0,
    0.0,
    0.6,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0
   ],
   "polarizations": [
    {
     "ratio": 0.8,
     "splitHz": 0.7,
     "phase": 0.24
    },
    {
     "ratio": 0.8,
     "splitHz": 1.25,
     "phase": 2.356194
    },
    {
     "ratio": 0.2,
     "splitHz": 0.85,
     "phase": -2.356194
    },
    {
     "ratio": 0.5,
     "splitHz": 3.2,
     "phase": -2.094395
    },
    {
     "ratio": 0.2,
     "splitHz": 2.7,
     "phase": -1.047198
    },
    {
     "ratio": 0.4,
     "splitHz": 4.0,
     "phase": -2.094395
    },
    {
     "ratio": 0.2,
     "splitHz": 1.5,
     "phase": 2.879793
    },
    {
     "ratio": 0.92,
     "splitHz": 4.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.92,
     "splitHz": 4.0,
     "phase": -3.141593
    },
    {
     "ratio": 0.4,
     "splitHz": 4.0,
     "phase": -2.094395
    },
    {
     "ratio": 0.92,
     "splitHz": 6.0,
     "phase": 1.570796
    },
    {
     "ratio": 0.6,
     "splitHz": 3.0,
     "phase": -3.141593
    },
    {
     "ratio": 0.8,
     "splitHz": 2.0,
     "phase": -2.879793
    },
    {
     "ratio": 0.0766667,
     "splitHz": 3.46109,
     "phase": 0.24
    },
    {
     "ratio": 0.97,
     "splitHz": 4.0,
     "phase": 1.570796
    },
    {
     "ratio": 0.92,
     "splitHz": 1.0,
     "phase": -3.141593
    },
    {
     "ratio": 0.8,
     "splitHz": 0.7,
     "phase": -3.141593
    },
    {
     "ratio": 0.92,
     "splitHz": 2.0,
     "phase": 2.356194
    },
    {
     "ratio": 0.0766667,
     "splitHz": 4.61479,
     "phase": 0.24
    },
    {
     "ratio": 0.0766667,
     "splitHz": 4.84553,
     "phase": 0.24
    },
    {
     "ratio": 0.0766667,
     "splitHz": 5.07626,
     "phase": 0.24
    },
    {
     "ratio": 0.8,
     "splitHz": 1.0,
     "phase": -3.141593
    },
    {
     "ratio": 0.0766667,
     "splitHz": 5.53774,
     "phase": 0.24
    }
   ],
   "contactEnergyFraction": 3.52e-05
  },
  {
   "fret": 2,
   "stiffness": 1.1965020195198309e-05,
   "gainDb": [
    0,
    6.888,
    10.309,
    -8.671,
    10.547,
    15.348,
    8.056,
    8.716,
    -2.678,
    11.432,
    6.528,
    7.449,
    17.0,
    18.0,
    13.607,
    8.383,
    18.0,
    18.0,
    3.358,
    18.0,
    15.896,
    18.0,
    18.0,
    18.0,
    18.0,
    18.0,
    -19.2,
    18.0,
    -20.4,
    -21.0,
    -21.6,
    -22.2,
    -22.8,
    -23.4,
    -24.0,
    -24.6,
    -25.2,
    -25.8,
    -26.4,
    -27.0,
    -27.6,
    -28.2,
    -28.8,
    -29.4,
    -30.0,
    -30.6,
    -31.2,
    -31.8
   ],
   "lossPerSecond": [
    0.5979,
    2.7955,
    1.373,
    1.1736,
    2.5296,
    2.0431,
    1.544,
    2.5209,
    1.2936,
    2.2112,
    0.2131,
    0.7321,
    1.9799,
    0.4459,
    0,
    0.6,
    5.2,
    0.2,
    0.0,
    1.3055,
    0.0,
    0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0
   ],
   "polarizations": [
    {
     "ratio": 0.35,
     "splitHz": 0.55,
     "phase": 2.094395
    },
    {
     "ratio": 0.2,
     "splitHz": 2.2,
     "phase": 2.356194
    },
    {
     "ratio": 0.65,
     "splitHz": 0.55,
     "phase": 0.785398
    },
    {
     "ratio": 0.35,
     "splitHz": 0.7,
     "phase": 1.570796
    },
    {
     "ratio": 0.92,
     "splitHz": 3.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 3.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.92,
     "splitHz": 3.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.8,
     "splitHz": 8.0,
     "phase": 1.570796
    },
    {
     "ratio": 0.97,
     "splitHz": 3.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.92,
     "splitHz": 2.849,
     "phase": 2.879793
    },
    {
     "ratio": 0.8,
     "splitHz": 3.108,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 1.5,
     "phase": 2.879793
    },
    {
     "ratio": 0.97,
     "splitHz": 3.6259,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 8.0,
     "phase": 2.094395
    },
    {
     "ratio": 0.4,
     "splitHz": 6.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 2.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.97,
     "splitHz": 3.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.0766667,
     "splitHz": 4.92093,
     "phase": 0.24
    },
    {
     "ratio": 0.92,
     "splitHz": 3.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.0766667,
     "splitHz": 5.43892,
     "phase": 0.24
    },
    {
     "ratio": 0.6,
     "splitHz": 4.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.0766667,
     "splitHz": 5.95691,
     "phase": 0.24
    },
    {
     "ratio": 0.0766667,
     "splitHz": 6.21591,
     "phase": 0.24
    }
   ],
   "contactEnergyFraction": 3.52e-06
  },
  {
   "fret": 5,
   "stiffness": 2.6905595774506715e-05,
   "gainDb": [
    0,
    -3.413,
    7.947,
    -5.388,
    5.049,
    -14.428,
    -2.68,
    -2.913,
    3.649,
    3.954,
    -12.712,
    10.035,
    6.034,
    18.0,
    14.357,
    18.0,
    15.214,
    18.0,
    18.0,
    18.0,
    18.0,
    18.0,
    18.0,
    18.0,
    -18.0,
    18.0,
    -19.2,
    -19.8,
    -20.4,
    -21.0,
    -21.6,
    -22.2,
    -22.8,
    -23.4,
    -24.0,
    -24.6,
    -25.2,
    -25.8,
    -26.4,
    -27.0,
    -27.6,
    -28.2,
    -28.8,
    -29.4,
    -30.0,
    -30.6,
    -31.2,
    -31.8
   ],
   "lossPerSecond": [
    0.8626,
    2.4933,
    3.3667,
    3.1846,
    2.8354,
    3.8,
    4.2261,
    0.2599,
    0.2646,
    0.6428,
    0.6,
    0.2579,
    1.2,
    0,
    2.2,
    0.6,
    0.6,
    0,
    0,
    1.3186,
    0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0
   ],
   "polarizations": [
    {
     "ratio": 0.2,
     "splitHz": 0.616,
     "phase": -1.832596
    },
    {
     "ratio": 0.2,
     "splitHz": 0.55,
     "phase": -2.617994
    },
    {
     "ratio": 0.5,
     "splitHz": 1.0,
     "phase": -0.523599
    },
    {
     "ratio": 0.92,
     "splitHz": 1.5,
     "phase": 2.879793
    },
    {
     "ratio": 0.92,
     "splitHz": 1.5,
     "phase": -2.879793
    },
    {
     "ratio": 0.97,
     "splitHz": 1.5,
     "phase": -3.141593
    },
    {
     "ratio": 0.97,
     "splitHz": 8.0,
     "phase": 1.570796
    },
    {
     "ratio": 0.97,
     "splitHz": 3.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.97,
     "splitHz": 3.08,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 2.0,
     "phase": -3.141593
    },
    {
     "ratio": 0.97,
     "splitHz": 3.696,
     "phase": 2.617994
    },
    {
     "ratio": 0.8,
     "splitHz": 2.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.97,
     "splitHz": 4.312,
     "phase": 2.617994
    },
    {
     "ratio": 0.8,
     "splitHz": 4.62,
     "phase": 2.617994
    },
    {
     "ratio": 0.8,
     "splitHz": 1.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.92,
     "splitHz": 4.0,
     "phase": 2.617994
    },
    {
     "ratio": 0.92,
     "splitHz": 1.5,
     "phase": 2.879793
    },
    {
     "ratio": 0.8,
     "splitHz": 1.5,
     "phase": 2.879793
    },
    {
     "ratio": 0.0766667,
     "splitHz": 6.16,
     "phase": 0.24
    },
    {
     "ratio": 0.97,
     "splitHz": 2.0,
     "phase": 2.879793
    },
    {
     "ratio": 0.0766667,
     "splitHz": 6.776,
     "phase": 0.24
    },
    {
     "ratio": 0.0766667,
     "splitHz": 7.084,
     "phase": 0.24
    },
    {
     "ratio": 0.0766667,
     "splitHz": 7.392,
     "phase": 0.24
    }
   ],
   "contactEnergyFraction": 1.92e-05
  }
 ],
 "contactDuration": 0.18,
 "contactTimeConstant": 0.04,
 "contactForceScale": 0.015
};
NylonFirstExcitation.at = function(fret){
 const knots=this.anchors;let k=0;while(k<knots.length-2&&fret>knots[k+1].fret)k++;
 const a=knots[k],b=knots[k+1],q=Math.max(0,Math.min(1,(fret-a.fret)/(b.fret-a.fret)));
 const blend=(x,y)=>x*(1-q)+y*q;
 return {contactEnergyFraction:blend(a.contactEnergyFraction,b.contactEnergyFraction),stiffness:blend(a.stiffness,b.stiffness)*Math.min(3,2**(Math.max(0,fret-knots[knots.length-1].fret)/12)),gainDb:a.gainDb.map((v,n)=>blend(v,b.gainDb[n])),lossPerSecond:a.lossPerSecond.map((v,n)=>blend(v,b.lossPerSecond[n])),polarizations:a.polarizations.map((v,n)=>({ratio:blend(v.ratio,b.polarizations[n].ratio),splitHz:blend(v.splitHz,b.polarizations[n].splitHz),phase:v.phase+q*Math.atan2(Math.sin(b.polarizations[n].phase-v.phase),Math.cos(b.polarizations[n].phase-v.phase))}))};
};

// B3 lies four semitones above G3 in the nine-semitone G3–E4 interval.
// Interpolate model parameters at equal fret positions, never rendered audio.
const NylonSecondExcitation = {
 weight:4/9,
 get onsetRiseSeconds(){return NylonThirdExcitation.onsetRiseSeconds*(1-this.weight)+NylonFirstExcitation.onsetRiseSeconds*this.weight},
 get contactDuration(){return NylonThirdExcitation.contactDuration*(1-this.weight)+NylonFirstExcitation.contactDuration*this.weight},
 get contactTimeConstant(){return NylonThirdExcitation.contactTimeConstant*(1-this.weight)+NylonFirstExcitation.contactTimeConstant*this.weight},
 get contactForceScale(){return .05*(1-this.weight)+NylonFirstExcitation.contactForceScale*this.weight},
 at(fret){
  const q=this.weight,a=NylonThirdExcitation,b=NylonFirstExcitation.at(fret),blend=(x,y)=>x*(1-q)+y*q;
  const thirdStiffness=a.stiffness*Math.min(3,2**(fret/12));
  const f0=440*2**((55+fret-69)/12);
  return {
   stiffness:Math.exp(blend(Math.log(thirdStiffness),Math.log(b.stiffness))),
   gainDb:a.gainDb.map((v,n)=>blend(v,b.gainDb[n])),
   lossPerSecond:a.lossPerSecond.map((v,n)=>blend(v,b.lossPerSecond[n])),
   contactEnergyFraction:Math.exp(blend(Math.log(a.contactEnergyFraction),Math.log(b.contactEnergyFraction))),
   polarizations:b.polarizations.map((v,n)=>({ratio:blend(.25/.75*.23,v.ratio),splitHz:blend(f0*(n+2)*.0007,v.splitHz),phase:.24+q*Math.atan2(Math.sin(v.phase-.24),Math.cos(v.phase-.24))}))
  };
 }
};
