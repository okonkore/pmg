import wave,json
from pathlib import Path
import numpy as np
D=Path('synth-demo/string-lab/e2-relaxation-audio');rows=[]
for key in 'abc':
 if not (D/f'{key}.wav').exists():continue
 with wave.open(str(D/f'{key}.wav')) as w:x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
 windows=[]
 for center in [.3,1.,2.3]:
  v=x[int((center-.032)*48000):int((center-.032)*48000)+3072];X=abs(np.fft.rfft(v*np.hanning(len(v)),16384))**2;f=np.fft.rfftfreq(16384,1/48000);lo=(f>=50)&(f<500);hi=(f>=800)&(f<=4000)
  windows.append(float(10*np.log10(sum(X[hi])/sum(X[lo]))))
 rows.append(dict(file=key,highLowRatioDb=windows,change03to23S=windows[-1]-windows[0]))
print(json.dumps(rows,indent=2));Path('experiments/string-v2/results/e2-relaxation-spectral-audit.json').write_text(json.dumps(rows,indent=2)+'\n')
