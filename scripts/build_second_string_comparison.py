"""Update only B3 listening clips; keep archived first/third/wound comparisons."""
from pathlib import Path
import json,wave,numpy as np
repo=Path(__file__).resolve().parent.parent;root=repo/'reference-recordings';out=root/'tuning-2026-10-20/reference-comparison/treble-comparison'
rate=48000;pre=2400;length=148800;half=1024
raw=np.fromfile(root/'second-string-2026-10-21/59.f32',dtype='<f4').astype(float);y=np.r_[np.zeros(pre),raw[:length-pre]];y*=.1/np.sqrt(np.mean(y[4320:9120]**2));t=np.arange(2049)-half;unit=np.zeros(2049);unit[half]=1
config=json.loads((out/'manifest.json').read_text(encoding='utf-8'));clips={}
for split,(lo,hi) in config['splits'].items():
 def lp(hz):
  h=2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(2049);return h/h.sum()
 a,b=lp(lo),lp(hi);parts={band:np.convolve(y,h,mode='full')[half:half+length] for band,h in {'full':unit,'low':a,'mid':b-a,'high':unit-b}.items()};assert np.max(abs(parts['low']+parts['mid']+parts['high']-y))<1e-12
 for band,q in parts.items():
  name=f'59-{split}-{band}-synth';clips[name]=q;clips[name+'-matched']=q*.1/max(float(np.sqrt(np.mean(q[pre:pre+2400]**2))),1e-12)
gain=min(1,.92/max(float(np.max(abs(q))) for q in clips.values()))
for name,q in clips.items():
 q=q.copy()*gain;q[-1920:]*=np.linspace(1,0,1920);assert np.all(np.isfinite(q)) and np.max(abs(q))<1
 with wave.open(str(out/'audio'/f'{name}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(q*32767).astype('<i2').tobytes())
config['secondString']={'revision':'second-interpolated-1','method':'model parameter interpolation from G3 and E4','firstWeight':4/9,'headroomGain':gain,'referenceAvailable':False}
(out/'manifest.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
p=out/'index.html';s=p.read_text(encoding='utf-8');s=s.replace('}.wav`','}.wav?v=plain-approved-2026-10-21`');s=s.replace('<h1>','<p>2弦Bは、採用した3弦・1弦のモデルを補間した音です。参考録音はまだありません。</p><h1>',1) if '2弦Bは、採用した' not in s else s;p.write_text(s,encoding='utf-8')
print('Updated 16 B3 clips; other notes and archived comparisons retained.')
