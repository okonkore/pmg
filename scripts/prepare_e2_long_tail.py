"""Audit 15s full nonlinear runs and export a late free-decay continuation state.
The continuation's approximation must be compared against full nonlinear 12..15s
before it is published. It is not an arbitrary signal fade or added damping.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,struct
import numpy as np
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/e2-stretch';L=R/'long-tail';z=np.load(R/'model.npz');N=len(z['poles']);V=z['vectors'];Q=z['Q'];H=z['H'];a=z['a'];kEA=float(z['kEA']);rows=[]
strong=json.loads((R/'strong/preparation.json').read_text(encoding='utf8'));base=json.loads(str(z['metadata']));switch=12;index=switch*2
for scale in [1,2,3]:
 stem=L/f'nonlinear-{scale}x';raw=np.fromfile(str(stem)+'.f32',dtype='<f4');assert len(raw)==15*48000
 states=np.fromfile(str(stem)+'.states',dtype='<c16').reshape(-1,N);assert len(states)==31
 previous=R/'nonlinear-48000.f32' if scale==1 else R/'strong'/f'nonlinear-{scale}x-48000.f32';old=np.fromfile(previous,dtype='<f4');assert np.array_equal(raw[:len(old)],old)
 physical=(V@states.T).real;r=(Q@states.T).real;g=.5*np.sum(r*(H@r),axis=0);ax=a@r;energy=.5*np.sum(physical*physical,axis=0)+kEA*(ax*g+.5*g*g);assert max(energy)<=energy[0]*(1+1e-4) and max(np.diff(energy))<energy[0]*1e-4
 target=base['nonlinearInitialEnergyJ'] if scale==1 else next(v['initialEnergyJ'] for v in strong['rows'] if v['forceScale']==scale)
 assert abs(energy[0]/target-1)<1e-9
 binSource=R/'model.bin' if scale==1 else R/'strong'/f'model-{scale}x.bin';data=bytearray(binSource.read_bytes());n,d=struct.unpack_from('<ii',data);assert n==N and d==125
 continuation=states[index].astype('<c16').tobytes();data[8+16*N:8+32*N]=continuation;data[-16*N:]=continuation;(L/f'continuation-{scale}x.bin').write_bytes(data)
 rows.append(dict(scale=scale,switchTimeS=switch,snapshotIndex=index,physicalEnergyJAtSwitch=float(energy[index]),sampledEnergyMaxGrowthRelative=float(max(energy)/energy[0]-1),initialEnergyRelativeError=float(abs(energy[0]/target-1)),prefix3sBitIdenticalToPrevious48k=True))
 print('CONTINUATION',scale,flush=True)
(L/'preparation.json').write_text(json.dumps(dict(scope=__doc__,rows=rows),indent=2)+'\n',encoding='utf8',newline='\n')
