"""Isolated E2 damping hypothesis; does not replace production samples.
Equivalent distributed resistance acts on string motion relative to its chord.
Unknown inter-filament/winding losses are NOT inferred from geometry here.
"""
from pathlib import Path
import json,hashlib,wave,shutil
import numpy as np
import build_520r_spruce as B
D=B.ROOT/'synth-demo/string-lab/e2-decay-audio';D.mkdir(parents=True,exist_ok=True)
manifest=json.loads((B.OUT/'manifest.json').read_text(encoding='utf8'));gain=manifest['gain']
shutil.copy2(B.OUT/'40.wav',D/'a.wav')
class Trial(B.Model):
 def __init__(self,sigma):super().__init__();self.extraSigma=sigma
 def matrices(self,*args,**kwargs):
  M,K,C,F,meta=super().matrices(*args,**kwargs)
  # Positive semidefinite damping on relative sine coordinates only.
  ids=slice(self.start,self.start+122)
  delta=2*self.extraSigma*M[ids,ids]
  C[ids,ids]+=delta
  assert np.linalg.eigvalsh(delta).min()>0
  meta.update(extraRelativeStringDecayPerS=self.extraSigma,equivalentResistanceNsPerM2=2*meta['mu']*self.extraSigma,lossStatus='unmeasured equivalent viscous hypothesis; not identified winding friction')
  return M,K,C,F,meta
rows=[]
for label,sigma in [('b',.5),('c',1.)]:
 model=Trial(sigma);p,r,meta=model.solve(B.CONFIG['strings'][-1],0,40)
 y=B.render(p,r,duration=3);lo=B.render(p,r,fs=96000,duration=3);err=float(np.linalg.norm(y-lo)/np.linalg.norm(y));assert err<.005
 y*=gain;y[-1440:]*=np.linspace(1,0,1440);assert max(abs(y))<1
 with wave.open(str(D/f'{label}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 np.savez_compressed(B.RESEARCH/f'e2-decay-{label}.npz',poles=p,residues=r)
 rows.append(dict(label=label,renderError=err,physics=meta))
 del model
result=dict(scope=__doc__,gain=gain,baselineSha256=hashlib.sha256((D/'a.wav').read_bytes()).hexdigest(),trials=rows,limits=['No sample-specific normalization or onset processing. Same force and same shared gain.','Additional damping is an unmeasured equivalent resistance; this is a listening experiment, not a verified constitutive friction model.','Original whole-shell numerical limits remain. Three-second truncation retained.'])
(D/'conditions.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print('DONE',flush=True)
