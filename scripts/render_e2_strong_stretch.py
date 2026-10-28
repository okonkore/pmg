"""Validate strong-pluck stretching at two timesteps, without changing playback gain."""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,wave,hashlib,shutil
import numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.signal import resample_poly
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/e2-stretch';S=R/'strong';D=ROOT/'synth-demo/string-lab/e2-strong-stretch-audio';D.mkdir(parents=True,exist_ok=True)
z=np.load(R/'model.npz');N=len(z['poles']);V=z['vectors'];Q=z['Q'];H=z['H'];a=z['a'];kEA=float(z['kEA']);prep=json.loads((S/'preparation.json').read_text(encoding='utf8'));gain=json.loads((ROOT/'synth-demo/instruments/guitar-520r-spruce/manifest.json').read_text(encoding='utf8'))['gain'];rows=[]
# Baseline row reuses the validated previous comparison exactly.
old=ROOT/'synth-demo/string-lab/e2-stretch-audio'
for key,file in [('off','b.wav'),('on','c.wav')]:shutil.copy2(old/file,D/f'1x-{key}.wav')
for scale in [2,3]:
 meta=next(r for r in prep['rows'] if r['forceScale']==scale);waves={};checks=[]
 for fs in [48000,96000]:
  stem=S/f'nonlinear-{scale}x-{fs}';y=np.fromfile(str(stem)+'.f32',dtype='<f4').astype(float);assert len(y)==3*fs and np.isfinite(y).all();waves[fs]=resample_poly(y,1,fs//48000)
  states=np.fromfile(str(stem)+'.states',dtype='<c16').reshape(-1,N);physical=(V@states.T).real;r=(Q@states.T).real;g=.5*np.sum(r*(H@r),axis=0);axial=a@r;unl=kEA*(axial*g+.5*g*g);energy=.5*np.sum(physical*physical,axis=0)+unl
  growth=float(max(energy)/energy[0]-1);increase=float(max(np.diff(energy))/energy[0]);initialError=float(abs(energy[0]/meta['initialEnergyJ']-1));assert growth<1e-4 and increase<1e-4 and initialError<1e-9
  checks.append(dict(fs=fs,initialEnergyRelativeError=initialError,maximumEnergyGrowthRelative=growth,maximumSampledEnergyIncreaseRelative=increase,finalEnergyJ=float(energy[-1]),sampledDeltaT_min_N=float(min(kEA*(axial+g))),sampledDeltaT_max_N=float(max(kEA*(axial+g)))))
  print('ENERGY',scale,fs,checks[-1],flush=True)
 ref48=scale*np.fromfile(R/'linear-48000.f32',dtype='<f4').astype(float);ref96=resample_poly(scale*np.fromfile(R/'linear-96000.f32',dtype='<f4').astype(float),1,2)
 d48=waves[48000]-ref48;d96=waves[96000]-ref96;mask=slice(480,139200)
 err=float(np.linalg.norm((d48-d96)[mask])/np.linalg.norm(d96[mask]));assert err<.02
 change=float(np.linalg.norm(d96[mask])/np.linalg.norm(ref96[mask]));peaks={}
 for key,y in [('off',ref96),('on',waves[96000])]:
  y=y*gain;peak=float(max(abs(y)));assert peak<1,('clip',scale,key,peak);peaks[key]=peak;y[-1440:]*=np.linspace(1,0,1440)
  with wave.open(str(D/f'{scale}x-{key}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 rows.append(dict(**meta,energyChecks=checks,nonlinearCorrection48To96kRelativeError=err,nonlinearVsLinearRelativeWaveformChange=change,peakFS=peaks));print('PASS',scale,err,change,peaks,flush=True)
report=dict(scope=__doc__,gain=gain,basePreparation=prep,rows=rows,files={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in D.glob('*.wav')},limits=['Same total force within each on/off pair; force changes across rows. Playback gain is unchanged across all six files.','Nonlinear static equilibrium is solved at the same applied force as its linear comparison; initial displacement is not artificially held equal.','No fret collisions or buzz. Larger displacements can exceed the clearance of an actual instrument.','Core-only axial stiffness and quasistatic uniform tension, not travelling longitudinal waves or measured winding rigidity.','Other C relaxation/body/acoustic limitations remain. No EQ, pitch envelope, artificial detuning or application sample update.'])
(D/'conditions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');(S/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
