from pathlib import Path
import numpy as np,json
r=Path(__file__).resolve().parent.parent/'reference-recordings/third-string-2026-10-21/high3';base=r.parent.parent/'2026-10-20-G3-107';rate=48000;B=.0001037
raw=np.fromfile(base/'decoded-mono-48k.f32',dtype='<f4').astype(float);takes=json.loads((base/'measurements.json').read_text(encoding='utf-8'))['measurements']
signals=[]
for i,t in enumerate(takes):
 start=round(t['onsetSeconds']*rate);signals.append(('ref'+str(i+1),raw[start:start+rate],t['fundamentalHz']))
for name in ['before','after']:
 file=r/(name+'.f32')
 if file.exists():signals.append((name,np.fromfile(file,dtype='<f4').astype(float),440*2**((55-69)/12)))
result={}
for name,y,f0 in signals:
 norm=np.sqrt(np.mean(y[1920:6720]**2));y=y/norm;rows=[]
 for a,b in [(0,.04),(.04,.12),(.12,.25),(.25,.5)]:
  q=y[round(a*rate):round(b*rate)];window=np.hanning(len(q));N=131072;f=np.fft.rfftfreq(N,1/rate);p=abs(np.fft.rfft(q*window,n=N))**2/(sum(window*window)*N/2)
  high=(f>=2000)&(f<10000);tonal=np.zeros(len(f),dtype=bool)
  for n in range(11,45):
   hz=f0*n*np.sqrt((1+B*n*n)/(1+B));tonal|=abs(f-hz)<max(15,1.5/(b-a))
  total=sum(p[high]);residual=sum(p[high&~tonal]);sub=[sum(p[(f>=lo)&(f<hi)]) for lo,hi in [(2000,3000),(3000,5000),(5000,10000)]]
  rows.append({'time':[a,b],'highDb':float(10*np.log10(total)),'residualFraction':float(residual/total),'bandsDb':[float(10*np.log10(max(v,1e-25))) for v in sub]})
 result[name]=rows
 print(name,[(row['time'],round(row['highDb'],1),round(row['residualFraction'],3),[round(x,1) for x in row['bandsDb']]) for row in rows])
(r/'analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
