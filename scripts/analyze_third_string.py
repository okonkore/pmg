from pathlib import Path
import numpy as np,json
root=Path(__file__).resolve().parent.parent/'reference-recordings/third-string-2026-10-21';ref=root.parent/'2026-10-20-G3-107';rate=48000
raw=np.fromfile(ref/'decoded-mono-48k.f32',dtype='<f4').astype(float)
takes=json.loads((ref/'measurements.json').read_text(encoding='utf-8'))['measurements']
def metrics(x,f0):
 result=[]
 for a,b in [(.04,.14),(.15,.4),(.5,.8),(1,1.3),(2,2.3)]:
  q=x[round(a*rate):round(b*rate)];n=131072;spec=abs(np.fft.rfft(q*np.hanning(len(q)),n=n))**2;f=np.fft.rfftfreq(n,1/rate)
  energy=np.array([sum(spec[abs(f-f0*k)<16]) for k in range(1,17)])
  result.append({'time':(a+b)/2,'rms':float(np.sqrt(np.mean(q*q))),'harmonics':(10*np.log10(np.maximum(energy,1e-30))).tolist()})
 return result
result={'reference':[]}
for take in takes:
 start=round(take['onsetSeconds']*rate);result['reference'].append(metrics(raw[start:start+round(3.6*rate)],take['fundamentalHz']))
for name,path in [('before',root.parent/'treble-comparison-2026-10-21/55.f32'),('after',root/'after.f32')]:
 if path.exists():result[name]=metrics(np.fromfile(path,dtype='<f4').astype(float),440*2**((55-69)/12))
(root/'metrics.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
for name,items in [('ref',result['reference'][1])]+[(k,result[k]) for k in ['before','after'] if k in result]:
 print(name)
 base=items[0]['harmonics'][0]
 for item in items:print(round(item['time'],2),'rms',round(20*np.log10(item['rms']/items[0]['rms']),1),'partials',[round(v-base,1) for v in item['harmonics'][:12]])

score={}
for source in ['before','after']:
 if source not in result:continue
 errors=[];decays=[]
 for take in result['reference']:
  for j in range(4):
   for k in range(1,8):
    ref=take[j]['harmonics'][k]-take[0]['harmonics'][0]
    if ref>-50:errors.append(abs(result[source][j]['harmonics'][k]-result[source][0]['harmonics'][0]-ref))
  for j in range(1,5):decays.append(abs(20*np.log10(result[source][j]['rms']/result[source][0]['rms'])-20*np.log10(take[j]['rms']/take[0]['rms'])))
 score[source]={'meanAbsoluteHarmonicErrorDb':float(np.mean(errors)),'meanAbsoluteDecayErrorDb':float(np.mean(decays))}
(root/'score.json').write_text(json.dumps(score,indent=2),encoding='utf-8');print('SCORES',json.dumps(score))
