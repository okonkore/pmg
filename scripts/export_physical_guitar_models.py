"""Package full existing model coefficients for browser time integration (no audio)."""
from pathlib import Path
import json,shutil,hashlib
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results';D=ROOT/'synth-demo/instruments/physical-guitar';D.mkdir(exist_ok=True);rows=[]
for key,source,label,midi in [('e2',R/'e2-stretch','6弦・開放 E2',40),('sixth-fret10',R/'d3-string-comparison/sixth-fret10','6弦・10フレット相当 D3',50),('fourth-open',R/'d3-string-comparison/fourth-open','4弦・開放 D3',50)]:
 data=(source/'model.bin').read_bytes();target=D/(key+'.bin');target.write_bytes(data)
 rows.append(dict(id=key,label=label,midi=midi,file=target.name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
manifest=dict(version=1,models=rows,gain=.4286610858558977,source='Full coupled C relaxation + geometric stretching; all modes and ports retained. No WAV inputs.',limits=['Model assembly and eigenbasis are prepared offline; browser integrates all exported states.','Fret contact, winding axial rigidity and high-frequency acoustic limitations remain.'])
(D/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Packaged',len(rows),'coefficient models')
