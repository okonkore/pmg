"""Validate new D3 simulations and export a late free-decay state per string."""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,struct
import numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.signal import resample_poly
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/d3-string-comparison';prep=json.loads((R/'preparation.json').read_text(encoding='utf8'));rows=[]
for case in prep['rows']:
 P=R/case['key'];z=np.load(P/'model.npz');N=len(z['poles']);meta=json.loads(str(z['metadata']));waves={};energyChecks=[]
 expectedEA=2e9*.65*np.pi*(meta['estimatedCoreDiameterMm']/1000)**2/4
 assert abs(meta['coreAxialEA_N']/expectedEA-1)<1e-12
 for fs in [48000,96000]:
  duration=15 if fs==48000 else 3;raw=np.fromfile(P/f'nonlinear-{fs}.f32',dtype='<f4').astype(float);assert len(raw)==duration*fs and np.isfinite(raw).all()
  states=np.fromfile(P/f'nonlinear-{fs}.states',dtype='<c16').reshape(-1,N);physical=(z['vectors']@states.T).real;r=(z['Q']@states.T).real;g=.5*np.sum(r*(z['H']@r),axis=0);ax=z['a']@r;energy=.5*np.sum(physical*physical,axis=0)+float(z['kEA'])*(ax*g+.5*g*g)
  initialError=float(abs(energy[0]/meta['nonlinearInitialEnergyJ']-1));growth=float(max(energy)/energy[0]-1);increase=float(max(np.diff(energy))/energy[0]);assert initialError<1e-9 and growth<1e-4 and increase<1e-4
  energyChecks.append(dict(fs=fs,seconds=duration,initialEnergyRelativeError=initialError,maximumEnergyGrowthRelative=growth,maximumSampledEnergyIncreaseRelative=increase))
  waves[fs]=resample_poly(raw[:3*fs],1,fs//48000)
  if fs==48000:continuation=states[24]
 lin48=np.fromfile(P/'linear-48000.f32',dtype='<f4').astype(float);lin96=resample_poly(np.fromfile(P/'linear-96000.f32',dtype='<f4').astype(float),1,2);mask=slice(480,139200);d48=waves[48000]-lin48;d96=waves[96000]-lin96
 error=float(np.linalg.norm((d48-d96)[mask])/np.linalg.norm(d96[mask]));whole=float(np.linalg.norm((waves[48000]-waves[96000])[mask])/np.linalg.norm(waves[96000][mask]));assert error<.02
 data=bytearray((P/'model.bin').read_bytes());n,d=struct.unpack_from('<ii',data);assert n==N and d==125;payload=continuation.astype('<c16').tobytes();data[8+16*N:8+32*N]=payload;data[-16*N:]=payload;(P/'continuation.bin').write_bytes(data)
 bound=float(.4286610858558977*np.sum(abs(z['output']*continuation)*np.exp(z['poles'].real*38)))
 rows.append(dict(key=case['key'],physics=meta,energyChecks=energyChecks,nonlinearCorrection48To96kRelativeError=error,wave48To96kRelativeError=whole,terminalLinearPressureBoundDbFS=float(20*np.log10(max(bound,1e-30)))))
 print('PASS',rows[-1]['key'],error,'terminal bound',rows[-1]['terminalLinearPressureBoundDbFS'],flush=True)
(R/'time-validation.json').write_text(json.dumps(dict(scope=__doc__,rows=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
