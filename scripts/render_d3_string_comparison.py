"""50s same-D3 comparison with common force, gain and checked late continuation."""
import os
os.environ['OPENBLAS_NUM_THREADS']='2'
from pathlib import Path
import json,wave,hashlib,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/d3-string-comparison';D=ROOT/'synth-demo/string-lab/d3-string-comparison-audio';D.mkdir(exist_ok=True);STAGE=R/'wav50';STAGE.mkdir(exist_ok=True)
prep=json.loads((R/'preparation.json').read_text(encoding='utf8'));validation=json.loads((R/'time-validation.json').read_text(encoding='utf8'));gain=.4286610858558977;fs=48000;rows=[]
for case in prep['rows']:
 P=R/case['key'];z=np.load(P/'model.npz');raw=np.fromfile(P/'nonlinear-48000.f32',dtype='<f4').astype(float);tail=np.fromfile(P/'tail.f32',dtype='<f4').astype(float);assert len(raw)==15*fs and len(tail)==38*fs
 delta=gain*(tail[:3*fs]-raw[12*fs:15*fs]);err=float(max(abs(delta)));assert err<10**(-110/20),(case['key'],err)
 check=next(r for r in validation['rows'] if r['key']==case['key']);assert check['terminalLinearPressureBoundDbFS']< -110
 y=np.concatenate([raw[:12*fs],tail])*gain;peak=float(max(abs(y)));lastPeak=float(max(abs(y[-2*fs:])));assert np.isfinite(y).all() and peak<1 and lastPeak<10**(-105/20)
 filename=case['key']+'.wav';file=STAGE/filename;q=np.rint(y*8388607).astype('<i4');packed=q.view(np.uint8).reshape(-1,4)[:,:3].copy().tobytes()
 with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(3);w.setframerate(fs);w.writeframes(packed)
 rows.append(dict(key=case['key'],file=filename,string=case['string'],fret=case['fret'],nominalMidi=50,nominalHz=146.8323839587038,physics=case['physics'],validation=check,continuation12to15sMaximumErrorDbFS=float(20*np.log10(max(err,1e-30))),peakFS=peak,last2sPeakDbFS=float(20*np.log10(max(lastPeak,1e-30))),sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
 print('EXPORTED',case['key'],peak,rows[-1]['continuation12to15sMaximumErrorDbFS'],flush=True)
for row in rows:shutil.copy2(STAGE/row['file'],D/row['file'])
info=dict(scope=__doc__,sampleRate=fs,seconds=50,bits=24,gain=gain,pluckDistanceFromBridgeM=.08,pluckForceN=1.5457651114447049,relaxationCornerHz=1000.,dynamicStretch=True,endFade=False,rows=rows,limits=['Same nominal stiff-string pitch; coupled frequencies can differ because the same body interacts differently with each string. No correction to equalize coupled frequencies.','Fret10 is represented by shorter vibrating length. Actual finger/fret contact damping and the spatial movement of the neck contact point are absent.','The existing center bridge/nut ports are reused; individual lateral string positions are not separately modeled.','Core geometry and 1000Hz relaxation time are hypotheses, not identified Savarez material data.','Core-only EA, quasistatic uniform added tension, no longitudinal travelling waves, buzz or collisions.','Full nonlinear integration to 15s; waveform retains 0..12s and uses stored-state linear free decay to 50s, checked against full nonlinear 12..15s. Overlap error is not a rigorous global error bound.','Original body/air/acoustic numerical limits persist. No EQ, gain normalization, added envelope or updates to main application samples.'])
(D/'conditions.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');(R/'render-validation.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
