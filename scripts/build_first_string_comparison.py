"""Build authorized first-string reference/before/after clips; originals stay private."""
from pathlib import Path
import json,wave,numpy as np
repo=Path(__file__).resolve().parent.parent;private=repo/'reference-recordings';data=private/'first-string-2026-10-21';out=private/'tuning-2026-10-20/reference-comparison/first-comparison';(out/'audio').mkdir(parents=True,exist_ok=True)
rate=48000;pre=2400;length=148800;half=1024;t=np.arange(2049)-half;lp=lambda hz:(lambda h:h/h.sum())(2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(2049));a,b=lp(500),lp(2000);unit=np.zeros(2049);unit[half]=1;kernels={'full':unit,'low':a,'mid':b-a,'high':unit-b};clips={};notes=[]
for midi,folder,label in [(64,'2026-10-20-E4-108','1弦開放 E4'),(66,'2026-10-20-Fsharp4-109','1弦2フレット F♯4'),(69,'2026-10-20-A4-110','1弦5フレット A4')]:
 base=private/folder;take=json.loads((base/'measurements.json').read_text(encoding='utf-8'))['measurements'][1];start=round(take['onsetSeconds']*rate)-pre;reference=np.fromfile(base/'decoded-mono-48k.f32',dtype='<f4').astype(float)[start:start+length];assert len(reference)==length
 ratio=take['fundamentalHz']/(440*2**((midi-69)/12));signals={'reference':reference}
 for kind in ['before','after']:
  filename=data/f'{kind}-{midi}.f32'
  if kind=='before':filename=data/f'previous-{midi}.f32'
  y=np.fromfile(filename,dtype='<f4').astype(float);signals[kind]=np.r_[np.zeros(pre),np.interp(np.arange(length-pre)*ratio,np.arange(len(y)),y)]
 for y in signals.values():y*=.1/float(np.sqrt(np.mean(y[4320:9120]**2)))
 for source,y in signals.items():
  parts={band:np.convolve(y,h,mode='full')[half:half+length] for band,h in kernels.items()};assert np.max(abs(parts['low']+parts['mid']+parts['high']-y))<1e-12
  for band,q in parts.items():clips[f'{midi}-split-{band}-{source}']=q;clips[f'{midi}-split-{band}-{source}-matched']=q*.1/max(float(np.sqrt(np.mean(q[pre:pre+2400]**2))),1e-12)
 notes.append({'midi':midi,'label':label,'referenceTake':2,'referenceF0':take['fundamentalHz']})
gain=min(1,.92/max(float(np.max(abs(q))) for q in clips.values()))
for name,q in clips.items():
 q=q.copy()*gain;q[-1920:]*=np.linspace(1,0,1920);assert np.all(np.isfinite(q)) and np.max(abs(q))<1
 with wave.open(str(out/'audio'/f'{name}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(q*32767).astype('<i2').tobytes())
manifest={'revision':'first-high-3','beforeRevision':'first-mid-2','firstTone':1,'sampleRate':rate,'seconds':3.1,'notes':notes,'boundariesHz':[500,2000],'firTaps':2049,'commonHeadroomGain':gain,'status':'trial; main first-string tone unchanged','normalization':'independent full-note 40-140ms RMS, optional band attack matching'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');(out/'index.html').write_text((repo/'scripts/first-string-comparison.html').read_text(encoding='utf-8').replace('__CONFIG__',json.dumps(manifest,ensure_ascii=False)),encoding='utf-8')
print('Built 72 first-string clips; complementary reconstruction, finite output and peak safety verified.')
