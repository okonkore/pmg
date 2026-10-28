"""Validate full coupled nonlinear stretching and create an isolated comparison."""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,wave,shutil,hashlib
import numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.signal import resample_poly
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/e2-stretch';D=ROOT/'synth-demo/string-lab/e2-stretch-audio';D.mkdir(parents=True,exist_ok=True)
z=np.load(R/'model.npz');meta=json.loads(str(z['metadata']));N=len(z['poles']);checks=[];waves={}
for fs in [48000,96000]:
 for kind in ['linear','nonlinear']:
  stem=R/f'{kind}-{fs}';y=np.fromfile(str(stem)+'.f32',dtype='<f4').astype(float);assert len(y)==3*fs and np.isfinite(y).all()
  waves[f'{kind}-{fs}']=resample_poly(y,1,fs//48000)
  states=np.fromfile(str(stem)+'.states',dtype='<c16').reshape(-1,N)
  physical=(z['vectors']@states.T).real;ports=(z['Q']@states.T).real;g=.5*np.sum(ports*(z['H']@ports),axis=0);axial=z['a']@ports
  potential=float(z['kEA'])*(axial*g+.5*g*g) if kind=='nonlinear' else np.zeros(len(states))
  energy=.5*np.sum(physical*physical,axis=0)+potential
  growth=float(max(energy)/energy[0]-1);assert growth<1e-4
  relativeIncrease=float(max(np.diff(energy))/energy[0]);assert relativeIncrease<1e-4
  target=meta['nonlinearInitialEnergyJ'] if kind=='nonlinear' else meta['initialEnergyJ'];initialError=float(abs(energy[0]/target-1));assert initialError<1e-9
  tension=float(z['kEA'])*(axial+g) if kind=='nonlinear' else float(z['kEA'])*axial
  checks.append(dict(kind=kind,sampleRate=fs,maximumEnergyGrowthRelative=growth,maximumSampledEnergyIncreaseRelative=relativeIncrease,initialEnergyRelativeError=initialError,finalEnergyJ=float(energy[-1]),sampledDeltaT_min_N=float(min(tension)),sampledDeltaT_max_N=float(max(tension))))
  print('ENERGY',checks[-1],flush=True)
mask=slice(480,139200)
d48=waves['nonlinear-48000']-waves['linear-48000'];d96=waves['nonlinear-96000']-waves['linear-96000']
correctionError=float(np.linalg.norm((d48-d96)[mask])/np.linalg.norm(d96[mask]));waveError=float(np.linalg.norm((waves['nonlinear-48000']-waves['nonlinear-96000'])[mask])/np.linalg.norm(waves['nonlinear-96000'][mask]))
assert correctionError<.02,(correctionError,waveError)
change=float(np.linalg.norm(d96[mask])/np.linalg.norm(waves['linear-96000'][mask]))
original=ROOT/'synth-demo/string-lab/e2-relaxation-audio/c.wav';shutil.copy2(original,D/'a.wav')
gain=json.loads((ROOT/'synth-demo/instruments/guitar-520r-spruce/manifest.json').read_text(encoding='utf8'))['gain'];rows=[]
for file,key in [('b.wav','linear-96000'),('c.wav','nonlinear-96000')]:
 y=waves[key]*gain;assert np.isfinite(y).all() and max(abs(y))<1;y[-1440:]*=np.linspace(1,0,1440)
 with wave.open(str(D/file),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(48000);f.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 rows.append(dict(file=file,sha256=hashlib.sha256((D/file).read_bytes()).hexdigest()))
report=dict(scope=__doc__,physics=meta,gain=gain,energyChecks=checks,nonlinearCorrection48To96kRelativeError=correctionError,nonlinearWave48To96kRelativeError=waveError,nonlinearVsLinearRelativeWaveformChange=change,files=rows,limits=['Quasistatic uniform added tension, core-only EA. No travelling longitudinal waves or copper winding axial rigidity.','Small-slope geometric extension includes both moving endpoint difference and 61 sine modes in two polarizations.','Initial nonlinear equilibrium solved at the same force; initial branch stresses fully relaxed.','Comparison A is old C. B adds linear axial endpoint stiffness; C additionally includes conservative geometric stretching. B/C is the clean nonlinear comparison.','Native exact linear modal propagation plus symmetric nonlinear velocity kicks is not an unconditionally energy-stable method; timestep and sampled physical energy checks apply to this condition only.','No extra detuning, pitch envelope, gain normalization, EQ or change to application samples.','C relaxation and body/acoustic accuracy remain tentative.'])
(D/'conditions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');(R/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('PASS',json.dumps({k:v for k,v in report.items() if k.startswith('nonlinear')}),flush=True)
