import sys,json,wave
from pathlib import Path
import numpy as np
ROOT=Path.cwd();R=ROOT/'experiments/string-v2/results/e2-stretch';z=np.load(R/'model.npz');meta=json.loads(str(z['metadata']));L=float(z['length']);ports=np.load(ROOT/'experiments/string-v2/results/footprint-string-ports.npz');basis=ports['stringTransverseBasis'];n=z['a'][:3];r=z['initialNonlinearPorts'];k=np.arange(1,62)*np.pi/L
g,w=np.polynomial.legendre.leggauss(192);x=(g+1)*L/2;weights=w*L/2
slopes=(r[:3]-n*(n@r[:3]))[:,None]/L+basis@np.stack([(r[3::2]*k)@np.cos(k[:,None]*x[None,:]),(r[4::2]*k)@np.cos(k[:,None]*x[None,:])])
quad=float(n@r[:3]+.5*(np.sum(slopes*slopes,axis=0)@weights));analytic=float(z['a']@r+.5*r@z['H']@r);err=abs(quad-analytic);assert err<1e-12
D=ROOT/'synth-demo/string-lab/e2-stretch-audio';arrays=[]
for f in 'abc':
 with wave.open(str(D/f'{f}.wav')) as w:arrays.append(np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768)
mask=slice(480,139200);addition=float(np.linalg.norm((arrays[1]-arrays[0])[mask])/np.linalg.norm(arrays[0][mask]))
report=dict(extensionQuadratureM=quad,extensionAnalyticM=analytic,absoluteDifferenceM=err,oldCToAxialLinearRelativeWaveformChange=addition)
(R/'geometry-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');c=json.loads((D/'conditions.json').read_text());c['independentGeometryAudit']=report;(D/'conditions.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(report,indent=2))
