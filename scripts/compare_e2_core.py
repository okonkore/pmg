"""Core sliding/equal-area solid-reference comparison, not a calibrated Savarez model."""
import json,wave,shutil
import numpy as np
import build_520r_spruce as B
D=B.ROOT/'synth-demo/string-lab/e2-core-audio';D.mkdir(parents=True,exist_ok=True)
manifest=json.loads((B.OUT/'manifest.json').read_text(encoding='utf8'));gain=manifest['gain']
shutil.copy2(B.OUT/'40.wav',D/'a.wav')
original=B.section
# Same mass/tension; equal-area solid circular reference, not exact bundle packing.
def bonded(string):
 sec=original(string)
 if string['construction']=='wound':
  sec['ei']*=B.CONFIG['assumptions']['filaments']
 return sec
B.section=bonded
model=B.Model();p,r,meta=model.solve(B.CONFIG['strings'][-1],0,40)
y=B.render(p,r,duration=3);low=B.render(p,r,fs=96000,duration=3);err=float(np.linalg.norm(y-low)/np.linalg.norm(y));assert err<.005
np.savez_compressed(B.RESEARCH/'e2-bonded-core.npz',poles=p,residues=r,metadata=json.dumps(meta))
y*=gain;y[-1440:]*=np.linspace(1,0,1440);assert max(abs(y))<1
with wave.open(str(D/'b.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
info=dict(scope=__doc__,gain=gain,render96To192kRelativeError=err,physics=meta,changes=['Same inferred section and linear mass; equal-area solid circular EI is 100 times the freely sliding limit.','Existing bending-loss law uses the same unchanged loss angle .02 and new EI.','Speaking length is solved to preserve target E2 as in the production generator.'],limits=['Equal-area solid circular reference concentrates the solid area; real filled-bundle spatial distribution and bonding are not identified.','Copper winding bending participation remains zero. No inter-filament friction constitutive law added.','No spectrum fitting, equalization, sample normalization, or added frequency-independent resistance.','Inherited acoustic accuracy limitations remain.'])
(D/'conditions.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
