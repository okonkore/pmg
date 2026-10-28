"""Inspect actual E2 poles, excitation of both transverse directions, and stretching scale.
Does not change physical matrices, output gain or application samples.
"""
import inspect,json
import numpy as np
import build_520r_spruce as B
R=B.RESEARCH;path=R/'e2-wobble-modal-data.npz'
if not path.exists():
 source=inspect.getsource(B.Model.solve)
 from textwrap import dedent
 source=dedent(source).replace('def solve(', 'def diagnostic_solve(').replace('return poles,residues,meta', '''qResidues=(P[self.start:self.start+122] @ (V[:ns]/w[:,None]))*amps[None,:]
    np.savez_compressed(RESEARCH/'e2-wobble-modal-data.npz',poles=poles,residues=residues,stringDisplacementResidues=qResidues,initialStringDisplacement=x0[self.start:self.start+122],metadata=json.dumps(meta))
    return poles,residues,meta''')
 # Reuse the unchanged solver, exposing only diagnostic state coordinates.
 exec(compile(source,'e2_diagnostic_solve','exec'),B.__dict__)
 B.Model.solve=B.diagnostic_solve
 model=B.Model();model.solve(B.CONFIG['strings'][-1],0,40)
z=np.load(path);p=z['poles'];r=z['residues'];q=z['stringDisplacementResidues'];q0=z['initialStringDisplacement'];meta=json.loads(str(z['metadata']));hz=p.imag/(2*np.pi)
rows=[]
for n in range(1,13):
 ids=np.flatnonzero((hz>n*82.4068892282175-12)&(hz<n*82.4068892282175+12))
 pair=q[2*n-2:2*n,ids]
 dominant=np.argmax(abs(pair),axis=0)
 chosen=[]
 for direction in (0,1):
  available=ids[dominant==direction]
  if len(available): chosen.append(available[np.argmax(abs(q[2*n-2+direction,available]))])
 ids=np.asarray(chosen,dtype=int)
 modes=[]
 for j in ids:
  disp=q[2*n-2:2*n,j];modes.append(dict(hz=float(hz[j]),sigmaPerS=float(-p[j].real),pressureAmplitudePa=float(2*abs(r[j])),displacementAmplitudeM=(2*abs(disp)).tolist(),dominantDirection=int(np.argmax(abs(disp)))))
 rows.append(dict(n=n,modes=modes,frequencyDifferenceHz=float(abs(hz[ids[0]]-hz[ids[1]])) if len(ids)==2 else None,amplitudeRatio=float(min(abs(r[ids]))/max(abs(r[ids]))) if len(ids)==2 else None))
# Estimate added length using fixed straight endpoints and the actual static sine profile.
# This omits endpoint movement/axial compliance, so is only a diagnostic scale.
L=meta['speakingLengthM'];n=np.arange(1,62);slopes=(n*np.pi/L)**2
extension=float(L/4*np.sum(slopes*(q0[0::2]**2+q0[1::2]**2)))
core=meta['estimatedCoreDiameterMm']/1000;area=B.CONFIG['assumptions']['coreFill']*np.pi*core**2/4;EA=B.CONFIG['assumptions']['nylonYoungPa']*area;deltaT=EA*extension/L
result=dict(scope=__doc__,initialDirectionDisplacementNormM=[float(np.linalg.norm(q0[0::2])),float(np.linalg.norm(q0[1::2]))],partialPairs=rows,stretchEstimate=dict(extensionM=extension,assumedCoreAxialEA_N=EA,fixedEndpointsDeltaT_N=deltaT,relativeTension=deltaT/meta['tension'],approximateInitialCents=float(600*np.log2(1+deltaT/meta['tension'])),limits='Static profile, core-only axial rigidity, fixed endpoints. Not simulated dynamic pitch; winding axial stiffness and support compliance unresolved.'),implementation=dict(dynamicStretch=False,directPluckDirection=1,twoTransverseCoordinates=True),limits=['One mode per dominant transverse direction, ranked by displacement residue in the harmonic coordinate; nearby body poles can still contaminate identification.','Pressure amplitude ratios do not directly measure perceptual beating. Modal phases, damping and audibility matter.','No actual guitar recording comparison or source identification.'])
(R/'e2-wobble-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(result,indent=2),flush=True)
