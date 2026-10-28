"""Check browser port against native samples, sampled physical energy, and tail."""
import os
os.environ['OPENBLAS_NUM_THREADS']='2'
from pathlib import Path
import json,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results';P=R/'browser-physical-guitar';rows=[];gain=.4286610858558977
for key,model,stem in [('e2',R/'e2-stretch',R/'e2-stretch/long-tail/nonlinear-1x'),('sixth-fret10',R/'d3-string-comparison/sixth-fret10',R/'d3-string-comparison/sixth-fret10/nonlinear-48000'),('fourth-open',R/'d3-string-comparison/fourth-open',R/'d3-string-comparison/fourth-open/nonlinear-48000')]:
 z=np.load(model/'model.npz');n=len(z['poles']);native=np.fromfile(str(stem)+'.f32',dtype='<f4').astype(float)*gain;y=np.fromfile(P/(key+'-browser.f32'),dtype='<f4').astype(float);exact=np.fromfile(P/(key+'-reference.f32'),dtype='<f4').astype(float);assert len(y)==50*48000 and np.isfinite(y).all()
 refError=float(np.linalg.norm(exact-native[:len(exact)])/np.linalg.norm(native[:len(exact)]));assert refError<1e-6
 duration=len(native);waveError=float(np.linalg.norm(y[:duration]-native)/np.linalg.norm(native));assert waveError<.005,(key,waveError)
 # Compare nonlinear correction separately over the same first-three-second region.
 linear=np.fromfile(model/'linear-48000.f32',dtype='<f4').astype(float)*gain
 mask=slice(480,139200);nonlinearError=float(np.linalg.norm((y[:len(linear)]-native[:len(linear)])[mask])/np.linalg.norm((native[:len(linear)]-linear)[mask]));assert nonlinearError<.05,(key,nonlinearError)
 states=np.fromfile(P/(key+'-states.f64'),dtype='<c16').reshape(-1,n);assert states.shape[0]==101
 physical=(z['vectors']@states.T).real;r=(z['Q']@states.T).real;g=.5*np.sum(r*(z['H']@r),axis=0);ax=z['a']@r;energy=.5*np.sum(physical**2,axis=0)+float(z['kEA'])*(ax*g+.5*g*g);assert np.isfinite(energy).all() and energy.min()>=0
 growth=float(max(energy)/energy[0]-1);increase=float(max(np.diff(energy))/energy[0]);assert growth<1e-4 and increase<1e-4,(key,growth,increase)
 bound=float(gain*np.sum(abs(z['output']*states[-1])));terminal=float(20*np.log10(max(bound,1e-30)));last=float(20*np.log10(max(max(abs(y[-96000:])),1e-30)));assert terminal< -105 and last< -100
 rows.append(dict(id=key,modes=n,nonlinearPorts=125,reference20msRelativeWaveError=refError,first15sRelativeWaveError=waveError,nonlinearCorrectionRelativeError=nonlinearError,maximumSampledEnergyGrowth=growth,maximumSampledEnergyIncrease=increase,terminalModalPressureBoundDbFS=terminal,last2sPeakDbFS=last))
 print('PASS',rows[-1],flush=True)
report=dict(method='All exported modes and linear couplings retained; Float64 SIMD; exponential midpoint each four output samples; paired Q/B sparsity tolerance 0.03; nonlinear force disabled after 12 s; same common gain.',sampleRate=48000,seconds=50,scope='These three standard initial states. No generic accuracy bound for arbitrary models, rates or strong displacement.',rows=rows)
(P/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');(ROOT/'synth-demo/instruments/physical-guitar/validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
