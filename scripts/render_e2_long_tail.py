"""Extend the strong-pluck page to 50s, PCM24, no end fade.
Late linear continuation is checked against full nonlinear overlap before export.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='2'
from pathlib import Path
import json,wave,hashlib,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/e2-stretch';L=R/'long-tail';D=ROOT/'synth-demo/string-lab/e2-strong-stretch-audio';STAGE=L/'wav50';STAGE.mkdir(exist_ok=True)
z=np.load(R/'model.npz');p=z['poles'];out=z['output'];N=len(p);fs=48000;duration=50;switch=12;gain=.4286610858558977
old=json.loads((D/'conditions.json').read_text(encoding='utf8'));rows=[]
base=np.fromfile(L/'linear-base.f32',dtype='<f4').astype(float);assert len(base)==duration*fs
for scale in [1,2,3]:
 nonlinear=np.fromfile(L/f'nonlinear-{scale}x.f32',dtype='<f4').astype(float);tail=np.fromfile(L/f'tail-{scale}x.f32',dtype='<f4').astype(float);assert len(nonlinear)==15*fs and len(tail)==(duration-switch)*fs
 delta=(tail[:3*fs]-nonlinear[switch*fs:15*fs])*gain
 maxError=float(max(abs(delta)));rmsError=float(np.sqrt(np.mean(delta*delta)));assert maxError<10**(-110/20),(scale,maxError)
 states=np.fromfile(L/f'nonlinear-{scale}x.states',dtype='<c16').reshape(-1,N);amp=states[switch*2]
 endBound=float(gain*np.sum(abs(out*amp)*np.exp(p.real*(duration-switch))));assert endBound<10**(-110/20),(scale,endBound)
 on=np.concatenate([nonlinear[:switch*fs],tail]);off=scale*base
 for kind,y in [('off',off),('on',on)]:
  y=y*gain;assert len(y)==duration*fs and np.isfinite(y).all() and max(abs(y))<1
  peak=float(max(abs(y)));last=y[-2*fs:];lastRms=float(np.sqrt(np.mean(last*last)));lastPeak=float(max(abs(last)));assert lastPeak<10**(-105/20)
  # PCM24 retains low-level tail below PCM16 quantization; no fade or zero padding.
  q=np.rint(y*8388607).astype('<i4');packed=q.view(np.uint8).reshape(-1,4)[:,:3].copy().tobytes();file=STAGE/f'{scale}x-{kind}.wav'
  with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(3);w.setframerate(fs);w.writeframes(packed)
  rows.append(dict(file=file.name,scale=scale,kind=kind,seconds=duration,bits=24,peakFS=peak,last2sRmsDbFS=float(20*np.log10(max(lastRms,1e-30))),last2sPeakDbFS=float(20*np.log10(max(lastPeak,1e-30))),linearContinuation12to15sMaximumErrorDbFS=float(20*np.log10(max(maxError,1e-30))) if kind=='on' else None,linearContinuation12to15sRmsErrorDbFS=float(20*np.log10(max(rmsError,1e-30))) if kind=='on' else None,terminalModalPressureBoundDbFS=float(20*np.log10(max(endBound,1e-30))) if kind=='on' else None,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
 print('EXPORTED',scale,rows[-1],flush=True)
for row in rows:shutil.copy2(STAGE/row['file'],D/row['file'])
old['durationSeconds']=duration;old['sampleRate']=fs;old['pcmBits']=24;old['endFade']=False
if 'previous3sFiles' not in old:old['previous3sFiles']=old['files']
old['files']={r['file']:r['sha256'] for r in rows};old['longTail']=dict(seconds=duration,bits=24,sampleRate=fs,endFade=False,zeroPadding=False,rows=rows,preparation=json.loads((L/'preparation.json').read_text(encoding='utf8')),limits=['Full nonlinear integration to 15s at 48kHz; retained from 0..12s. From the saved state at exactly 12s, linear free decay of the full coupled system continues to 50s.','Late nonlinearity is numerically neglected after 12s only after comparing 12..15s against full nonlinear integration; this is not a global mathematical error bound. See measured overlap error.','Terminal modal bound applies to the linear continuation. Last-two-second output levels are measured for each file.','No physical parameters or playback gain changed. No end fade, signal normalization, padding or repeated audio.'])
(D/'conditions.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');(L/'validation.json').write_text(json.dumps(old['longTail'],ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',flush=True)
