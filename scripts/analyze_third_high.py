from pathlib import Path
import numpy as np,json
r=Path(__file__).resolve().parent.parent/'reference-recordings/third-string-2026-10-21';b=r.parent/'2026-10-20-G3-107';rate=48000
raw=np.fromfile(b/'decoded-mono-48k.f32',dtype='<f4').astype(float);takes=json.loads((b/'measurements.json').read_text(encoding='utf-8'))['measurements'];result={}
def analyze(y):
 norm=np.sqrt(np.mean(y[1920:6720]**2));y=y/norm
 rows=[]
 for a,z in [(0,.05),(.05,.15),(.15,.4),(.4,.8)]:
  q=y[round(a*rate):round(z*rate)];win=np.hanning(len(q));n=65536;f=np.fft.rfftfreq(n,1/rate);p=abs(np.fft.rfft(q*win,n=n))**2/(sum(win*win)*n/2)
  bands=[10*np.log10(max(sum(p[(f>=lo)&(f<hi)]),1e-20)) for lo,hi in [(2000,3000),(3000,4000),(4000,6000),(6000,10000)]]
  hi=f>2000;centroid=sum(f[hi]*p[hi])/sum(p[hi]);rows.append({'time':[a,z],'bandsDb':bands,'centroid':float(centroid)})
 return rows
for i,t in enumerate(takes):
 start=round(t['onsetSeconds']*rate);result['ref'+str(i+1)]=analyze(raw[start:start+rate*3])
for name in ['previous','after']:
 p=r/(name+'.f32')
 if p.exists():result[name]=analyze(np.fromfile(p,dtype='<f4').astype(float))
for name,rows in result.items():
 print(name)
 for row in rows:print(row['time'],[round(v,1) for v in row['bandsDb']],round(row['centroid']))
(r/'high-analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
