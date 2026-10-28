"""Reuse the full coupled C+axial tangent; solve new nonlinear equilibria at 2x/3x force.
No change of stiffness, loss, gain, release shape, or pitch-control curve.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,struct,hashlib
import numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.linalg import solve
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/e2-stretch';OUT=R/'strong';OUT.mkdir(exist_ok=True)
z=np.load(R/'model.npz');p=z['poles'];Q=z['Q'];B=z['B'];a=z['a'];H=z['H'];kEA=float(z['kEA']);base=z['amplitudeLinear'];V=z['vectors'];N=len(p);D=len(a)
# Work-conjugate static compliance at all nonlinear force ports.
J=-(Q@(B/p[:,None])).real
sym=float(np.linalg.norm(J-J.T)/np.linalg.norm(J));assert sym<1e-8;J=(J+J.T)/2
assert np.linalg.eigvalsh(J).min()>0
rbase=(Q@base).real;xbase=(V@base).real;meta=json.loads(str(z['metadata']));forceBase=meta['pluckForceN'];rows=[]
for scale in [2,3]:
 rr=scale*rbase.copy()
 def terms(rr):
  hr=H@rr;g=.5*rr@hr;e=a@rr+g
  f=kEA*(g*a+e*hr);hf=kEA*(np.outer(a+hr,a+hr)+e*H-np.outer(a,a))
  return f,hf,e,g
 for iteration in range(25):
  f,hf,e,g=terms(rr);res=rr+J@f-scale*rbase;err=float(np.linalg.norm(res)/np.linalg.norm(scale*rbase))
  if err<1e-12:break
  rr-=solve(np.eye(D)+J@hf,res,check_finite=False)
 assert err<1e-11
 amp=scale*base+(B@f)/p
 reconstruct=(Q@amp).real;assert np.linalg.norm(reconstruct-rr)/np.linalg.norm(rr)<1e-10
 statics=float(np.linalg.norm(p*(amp-scale*base)-B@f)/max(np.linalg.norm(B@f),1e-30));assert statics<1e-9
 physical=(V@amp).real;potential=kEA*((a@rr)*g+.5*g*g);energy=float(.5*physical@physical+potential)
 pull=float(xbase@physical/forceBase*1000)
 row=dict(forceScale=scale,forceN=scale*forceBase,pullMm=pull,initialDeltaT_N=float(kEA*e),initialAddedLengthM=float(e),initialEnergyJ=energy,staticPortRelativeResidual=err,modalStaticRelativeResidual=statics)
 with (OUT/f'model-{scale}x.bin').open('wb') as file:
  file.write(struct.pack('<ii',N,D))
  for arr in [p,amp,Q,B.T,z['output']]:file.write(np.asarray(arr,dtype='<c16',order='C').tobytes())
  for arr in [a,H,np.array([kEA])]:file.write(np.asarray(arr,dtype='<f8',order='C').tobytes())
  file.write(np.asarray(scale*base,dtype='<c16').tobytes())
 np.savez_compressed(OUT/f'initial-{scale}x.npz',amplitude=amp,ports=rr)
 rows.append(row);print(row,flush=True)
report=dict(scope=__doc__,baseModelSHA256=hashlib.sha256((R/'model.npz').read_bytes()).hexdigest(),portComplianceRelativeAsymmetry=sym,rows=rows,limits=['No fret collisions or buzz model. At the larger displacement a real guitar may contact frets.','Quasistatic uniform tension with core-only EA; winding axial stiffness and travelling longitudinal waves remain absent.','Same fully relaxed initial Maxwell branch assumption as E2-C.'])
(OUT/'preparation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
