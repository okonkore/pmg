from pathlib import Path
import numpy as np,json
r=Path(__file__).resolve().parent.parent/'reference-recordings/third-string-2026-10-21/attack4';b=r.parent.parent/'2026-10-20-G3-107';rate=48000
raw=np.fromfile(b/'decoded-mono-48k.f32',dtype='<f4').astype(float);takes=json.loads((b/'measurements.json').read_text(encoding='utf-8'))['measurements'];signals=[]
for i,t in enumerate(takes):
 start=round(t['onsetSeconds']*rate);signals.append(('ref'+str(i+1),raw[start:start+rate]))
for name in ['before','after']:
 p=r/(name+'.f32')
 if p.exists():signals.append((name,np.fromfile(p,dtype='<f4').astype(float)))
N=2049;half=1024;t=np.arange(N)-half;lp=lambda hz:(lambda h:h/h.sum())(2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(N));a=lp(500);b=lp(2000);unit=np.zeros(N);unit[half]=1
result={}
for name,x in signals:
 x=x/np.sqrt(np.mean(x[1920:6720]**2));result[name]={}
 for band,h in [('full',unit),('low',a),('mid',b-a),('high',unit-b)]:
  y=np.convolve(x,h,mode='full')[half:half+len(x)];level=[]
  for start,end in [(0,.005),(.005,.015),(.015,.03),(.03,.05),(.05,.1),(.1,.2)]:
   q=y[round(start*rate):round(end*rate)];level.append(round(float(20*np.log10(max(np.sqrt(np.mean(q*q)),1e-20))),1))
  peak=float(np.max(abs(y[:2400])));peakMs=float(np.argmax(abs(y[:2400]))/rate*1000);result[name][band]={'rmsDb':level,'peakDb':float(20*np.log10(peak)),'peakMs':peakMs}
 print(name,result[name])
(r/'metrics.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
