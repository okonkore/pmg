"""Same nominal D3: sixth string fret 10 versus fourth string open.
Uses C core relaxation, moving endpoints and conservative dynamic stretching.
Same force, bridge distance and playback gain; no note-specific fitting.
"""
from pathlib import Path
import json,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[1];base=Path(__file__).with_name('prepare_e2_stretch.py');source=base.read_text(encoding='utf8').split('model=Axial();')[0]
# EA must come from the selected string's own inferred core, not always string 6.
source=source.replace("sec=B.section(B.CONFIG['strings'][-1]);dc=sec['estimatedCoreDiameterMm']/1000", "dc=meta['estimatedCoreDiameterMm']/1000")
ns={'__file__':str(base)};exec(compile(source,str(base),'exec'),ns);B=ns['B'];Axial=ns['Axial'];R=B.RESEARCH/'d3-string-comparison';R.mkdir(exist_ok=True)
cases=[dict(key='sixth-fret10',string=6,fret=10),dict(key='fourth-open',string=4,fret=0)];rows=[]
signature=hashlib.sha256((source+Path(__file__).read_text(encoding='utf8')+Path(B.__file__).read_text(encoding='utf8')+json.dumps(B.CONFIG,sort_keys=True)).encode()).hexdigest()
for case in cases:
 out=R/case['key'];out.mkdir(exist_ok=True);signaturePath=out/'source-signature.txt'
 if (out/'model.npz').exists():
  assert signaturePath.read_text()==signature,'Stale comparison model'
 else:
  B.STRETCH_OUT=out;model=Axial();model.relaxationRate=2*np.pi*1000;string=next(s for s in B.CONFIG['strings'] if s['number']==case['string']);model.solve(string,case['fret'],50);del model
  signaturePath.write_text(signature,encoding='utf8')
 z=np.load(out/'model.npz');meta=json.loads(str(z['metadata']));assert meta['string']==case['string'] and meta['fret']==case['fret'] and abs(meta['targetHz']-146.8323839587)<1e-6
 assert abs(meta['relaxationCornerHz']-1000)<1e-9 and abs(meta['pluckForceN']-1.5457651114447049)<1e-12
 rows.append(dict(**case,physics=meta));print('PREPARED',case['key'],flush=True)
(R/'preparation.json').write_text(json.dumps(dict(scope=__doc__,signature=signature,rows=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
