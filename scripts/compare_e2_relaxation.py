"""Passive core-bundle bending relaxation hypothesis, not identified 520R physics.
A Maxwell branch interpolates free-slip EI0 and uniformly-filled bonded EIinf.
Both storage stiffness and dissipation follow the same internal state.
Relaxation frequencies 200/1000Hz are unmeasured exploratory values, not a fit.
"""
import inspect,json,wave,shutil
from textwrap import dedent
import numpy as np
import build_520r_spruce as B
R=B.RESEARCH;D=B.ROOT/'synth-demo/string-lab/e2-relaxation-audio';D.mkdir(parents=True,exist_ok=True)
source=dedent(inspect.getsource(B.Model.solve)).replace('def solve(', 'def relaxation_solve(')
insert='''n=np.arange(1,62);L=meta['speakingLengthM'];dc=meta['estimatedCoreDiameterMm']/1000
    bonded=BUNDLE_FILL*np.pi*dc**4/64*NYLON_E
    deltaEI=bonded-meta['ei'];assert deltaEI>0
    dk=np.repeat(deltaEI*(n*np.pi/L)**4*L/2,2)
    oldSize=size;size+=122;expanded=np.zeros((size,size));expanded[:oldSize,:oldSize]=A;A=expanded
    port=P[self.start:self.start+122].T*np.sqrt(dk)[None,:]
    A[vs,oldSize:]=-port;A[oldSize:,vs]=port.T;A[oldSize:,oldSize:]=-np.eye(122)*self.relaxationRate
    # Only symmetric new block is -lambda: new stored energy is |z|^2/2.
    assert np.max(abs(A[vs,oldSize:]+A[oldSize:,vs].T))==0
    meta.update(relaxationCornerHz=self.relaxationRate/(2*np.pi),slipEI=meta['ei'],bondedReferenceEI=bonded,deltaEI=deltaEI,relaxationStates=122)
    x0=solve(K,F,assume_a='pos',check_finite=False)'''
source=source.replace("x0=solve(K,F,assume_a='pos',check_finite=False)",insert)
source=source.replace("D=K+ss*C+ss*ss*M+ss*self.H@prop", "D=K+ss*C+ss*ss*M+ss*self.H@prop\n        D[self.start:self.start+122,self.start:self.start+122]+=np.diag(dk*ss/(ss+self.relaxationRate))")
source=source.replace("[98.,223.,659.]", "[98.,223.,659.,1500.]")
B.BUNDLE_FILL=B.CONFIG['assumptions']['coreFill'];B.NYLON_E=B.CONFIG['assumptions']['nylonYoungPa']
exec(compile(source,'e2_relaxation_solve','exec'),B.__dict__)
B.Model.solve=B.relaxation_solve
gain=json.loads((B.OUT/'manifest.json').read_text(encoding='utf8'))['gain'];shutil.copy2(B.OUT/'40.wav',D/'a.wav');rows=[]
for key,corner in [('b',200.),('c',1000.)]:
 file=R/f'e2-core-relaxation-{int(corner)}.npz'
 if file.exists():
  z=np.load(file);p=z['poles'];r=z['residues'];meta=json.loads(str(z['metadata']))
 else:
  model=B.Model();model.relaxationRate=2*np.pi*corner;p,r,meta=model.solve(B.CONFIG['strings'][-1],0,40)
  np.savez_compressed(file,poles=p,residues=r,metadata=json.dumps(meta));del model
 y=B.render(p,r,duration=3);low=B.render(p,r,fs=96000,duration=3);err=float(np.linalg.norm(y-low)/np.linalg.norm(y));assert err<.005
 y*=gain;peak=float(max(abs(y)));assert peak<1;y[-1440:]*=np.linspace(1,0,1440)
 with wave.open(str(D/f'{key}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 rows.append(dict(file=key+'.wav',physics=meta,render96To192kRelativeError=err,peakFS=peak));print('RENDERED',key,flush=True)
report=dict(scope=__doc__,gain=gain,rows=rows,limits=['Homogenized bending relaxation is a hypothesis for bundle slip, not a derived contact-friction law or actual nylon relaxation measurement.','Upper EI uses uniform filling; packing, winding pressure, axial coupling and multiple relaxation times are not identified.','Initial pluck is held long enough for branch to relax: zero internal branch stress at release.','No frequency-independent damping, per-harmonic tuning, EQ, sample gain normalization or onset fade.','Original body/air/acoustic reduction limits persist. Existing application samples unchanged.'])
(D/'conditions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
