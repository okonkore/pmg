"""Transfer E2-C's unchanged 1000Hz bending relaxation to F#2 and A2.
Same material parameters/force/gain. Each section supplies its own EI limits.
No note-by-note fitting, no update to production application samples.
"""
from pathlib import Path
import json,hashlib,wave,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
solver=Path(__file__).with_name('compare_e2_relaxation.py');prefix=solver.read_text(encoding='utf8').split("gain=json.loads((B.OUT/")[0]
namespace={};exec(compile(prefix,str(solver),'exec'),namespace);B=namespace['B'];R=B.RESEARCH
D=ROOT/'synth-demo/string-lab/low-string-relaxation-audio';D.mkdir(parents=True,exist_ok=True)
manifest=json.loads((B.OUT/'manifest.json').read_text(encoding='utf8'));gain=manifest['gain'];rows=[]
signature=hashlib.sha256((prefix+Path(__file__).read_text(encoding='utf8')+json.dumps(B.CONFIG,sort_keys=True)+Path(B.__file__).read_text(encoding='utf8')).encode()).hexdigest()
for midi in [42,45]:
 original=next(n for n in manifest['notes'] if n['midi']==midi);old=B.OUT/original['file'];assert hashlib.sha256(old.read_bytes()).hexdigest()==original['sha256']
 shutil.copy2(old,D/f'{midi}-a.wav')
 string=next(s for s in B.CONFIG['strings'] if s['openMidi']<=midi<=s['openMidi']+24);fret=midi-string['openMidi']
 cache=R/f'low-string-relaxation-{midi}-{signature[:16]}.npz'
 if cache.exists():
  z=np.load(cache);p=z['poles'];res=z['residues'];meta=json.loads(str(z['metadata']))
 else:
  model=B.Model();model.relaxationRate=2*np.pi*1000;p,res,meta=model.solve(string,fret,midi)
  np.savez_compressed(cache,poles=p,residues=res,metadata=json.dumps(meta));del model
 y=B.render(p,res,duration=3);low=B.render(p,res,fs=96000,duration=3);err=float(np.linalg.norm(y-low)/np.linalg.norm(y));assert err<.005
 y*=gain;assert max(abs(y))<1;y[-1440:]*=np.linspace(1,0,1440)
 file=D/f'{midi}-c.wav'
 with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 rows.append(dict(midi=midi,string=string['number'],fret=fret,baselineFile=f'{midi}-a.wav',candidateFile=file.name,physics=meta,render96To192kRelativeError=err,baselineSHA256=original['sha256'],candidateSHA256=hashlib.sha256(file.read_bytes()).hexdigest()));print('RENDERED',midi,flush=True)
info=dict(scope=__doc__,gain=gain,signature=signature,rows=rows,limits=['E2-C 1000Hz relaxation corner is a tentative listening choice, not a measured material property.','Same relaxation time across strings is a transfer hypothesis. Core EI scales from each estimated geometry.','Fretted length changes but nut-body endpoint location/contact loss remains inherited, not actual fret/finger mechanics.','Other body, air, radiation accuracy limits remain. Long-held initial displacement, zero branch stress.','No EQ, note-specific gain, added envelope, tuning to recordings or changes to the original application.'])
(D/'conditions.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
