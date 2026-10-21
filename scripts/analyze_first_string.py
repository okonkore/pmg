from pathlib import Path
import json,numpy as np
repo=Path(__file__).resolve().parent.parent;root=repo/'reference-recordings/first-string-2026-10-21';rate=48000
sources=[(64,'2026-10-20-E4-108'),(66,'2026-10-20-Fsharp4-109'),(69,'2026-10-20-A4-110')]
N=131072;f=np.fft.rfftfreq(N,1/rate);windows=[(.04,.14),(.15,.4),(.5,.8),(1,1.3)]
def spectrum(y,a,b):
 q=y[round(a*rate):round(b*rate)];win=np.hanning(len(q));return abs(np.fft.rfft(q*win,n=N))**2/(sum(win*win)*N/2)
def stiffness(y,f0):
 p=spectrum(y,.05,.2);base=sum(p[abs(f-f0)<20]);values=[]
 for n in range(4,17):
  nominal=f0*n;mask=abs(f-nominal)<f0*.22;i=np.where(mask)[0][np.argmax(p[mask])];power=sum(p[abs(f-f[i])<20]);ratio=(f[i]/nominal)**2;B=(ratio-1)/(n*n-ratio)
  if power>base*10**(-45/10) and 0<B<.0003:values.append(float(B))
 return float(np.median(values)) if values else .000003
def measure(y,f0,B):
 rows=[]
 for a,b in windows:
  p=spectrum(y,a,b);energy=[sum(p[abs(f-f0*n*np.sqrt((1+B*n*n)/(1+B)))<20]) for n in range(1,49)];q=y[round(a*rate):round(b*rate)]
  rows.append({'rms':float(np.sqrt(np.mean(q*q))),'harmonicsDb':(10*np.log10(np.maximum(energy,1e-30))).tolist()})
 return rows
result={}
for midi,folder in sources:
 base=repo/'reference-recordings'/folder;raw=np.fromfile(base/'decoded-mono-48k.f32',dtype='<f4').astype(float);takes=json.loads((base/'measurements.json').read_text(encoding='utf-8'))['measurements'];entry={'references':[]}
 for take in takes:
  start=round(take['onsetSeconds']*rate);y=raw[start:start+rate*2];B=stiffness(y,take['fundamentalHz']);entry['references'].append({'stiffness':B,'measurements':measure(y,take['fundamentalHz'],B)})
 for kind in ['before','after']:
  p=root/f'{kind}-{midi}.f32'
  if p.exists():
   y=np.fromfile(p,dtype='<f4').astype(float);B=stiffness(y,440*2**((midi-69)/12));entry[kind]={'stiffness':B,'measurements':measure(y,440*2**((midi-69)/12),B)}
 result[str(midi)]=entry
 print('MIDI',midi,'reference B', [round(x['stiffness'],7) for x in entry['references']])
 for kind,item in [('ref',entry['references'][1])]+[(k,entry[k]) for k in ['before','after'] if k in entry]:
  rows=item['measurements'];basis=rows[0]['harmonicsDb'][0];print(kind,'partials',[round(v-basis,1) for v in rows[0]['harmonicsDb'][:12]],'decay',[round(20*np.log10(row['rms']/rows[0]['rms']),1) for row in rows])
(root/'metrics.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
