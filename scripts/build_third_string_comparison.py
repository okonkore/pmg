"""Build the authorized G3 reference / previous / trial listening comparison."""
from pathlib import Path
import json,wave
import numpy as np
repo=Path(__file__).resolve().parent.parent
private=repo/'reference-recordings';data=private/'third-string-2026-10-21'
out=private/'tuning-2026-10-20/reference-comparison/third-comparison';(out/'audio').mkdir(parents=True,exist_ok=True)
base=private/'2026-10-20-G3-107';rate=48000;pre=2400;length=148800;half=1024
take=json.loads((base/'measurements.json').read_text(encoding='utf-8'))['measurements'][1]
start=round(take['onsetSeconds']*rate)-pre
reference=np.fromfile(base/'decoded-mono-48k.f32',dtype='<f4').astype(float)[start:start+length]
ratio=take['fundamentalHz']/(440*2**((55-69)/12))
signals={'reference':reference}
for kind in ['before','after']:
 source=data/'previous.f32' if kind=='before' and (data/'previous.f32').exists() else data/f'{kind}.f32'
 y=np.fromfile(source,dtype='<f4').astype(float)
 signals[kind]=np.r_[np.zeros(pre),np.interp(np.arange(length-pre)*ratio,np.arange(len(y)),y)]
for y in signals.values():y*=.1/float(np.sqrt(np.mean(y[4320:9120]**2)))
t=np.arange(2049)-half
lp=lambda hz:(lambda h:h/h.sum())(2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(2049))
a,b=lp(500),lp(2000);unit=np.zeros(2049);unit[half]=1
kernels={'full':unit,'low':a,'mid':b-a,'high':unit-b};clips={}
for source,y in signals.items():
 parts={band:np.convolve(y,h,mode='full')[half:half+length] for band,h in kernels.items()}
 assert np.max(abs(parts['low']+parts['mid']+parts['high']-y))<1e-12
 for band,q in parts.items():
  clips[f'split-{band}-{source}']=q
  clips[f'split-{band}-{source}-matched']=q*.1/max(float(np.sqrt(np.mean(q[pre:pre+2400]**2))),1e-12)
gain=min(1,.92/max(np.max(abs(q)) for q in clips.values()))
for name,q in clips.items():
 q=q.copy()*gain;q[-1920:]*=np.linspace(1,0,1920);assert np.all(np.isfinite(q)) and np.max(abs(q))<1
 with wave.open(str(out/'audio'/f'{name}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(q*32767).astype('<i2').tobytes())
(out/'index.html').write_text((repo/'scripts/third-string-comparison.html').read_text(encoding='utf-8'),encoding='utf-8')
manifest={'midi':55,'referenceTake':2,'referenceF0':take['fundamentalHz'],'sampleRate':rate,'seconds':3.1,'boundariesHz':[500,2000],'firTaps':2049,'commonHeadroomGain':float(gain),'thirdTone':1,'revision':'g3-high-3','before':'previous G3 trial','status':'trial; main instrument unchanged','normalization':'independent full-note 40-140ms RMS; optional independent band attack matching'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Built 24 G3 comparison clips; complementary reconstruction, finite output and headroom verified.')
