"""Unprocessed E2 harmonic-band decay; no audio changes or fitting to recordings."""
from pathlib import Path
import json,wave,sys
import numpy as np
if sys.platform=='win32':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.signal import butter,sosfiltfilt,hilbert
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'synth-demo/instruments/guitar-520r-spruce'
with wave.open(str(D/'40.wav')) as w:fs=w.getframerate();y=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
mu=.0053832863594252016;EI=1.548006937407884e-8;T=61.781895;L=.65;f0=82.4068892282175
rows=[]
for n in range(1,21):
 k=n*np.pi/L;f=np.sqrt((T*k*k+EI*k**4)/mu)/(2*np.pi)
 filt=butter(4,[f-12,f+12],btype='bandpass',fs=fs,output='sos');v=sosfiltfilt(filt,y)
 windows=[]
 for a,b in [(.15,.35),(.65,.85),(1.15,1.35),(1.65,1.85),(2.15,2.35)]:
  windows.append(float(20*np.log10(max(np.sqrt(np.mean(v[int(a*fs):int(b*fs)]**2)),1e-20))))
 air=(2*np.pi*1.8e-5+2*np.pi*.00107*np.sqrt(np.pi*1.8e-5*1.2*f))/(2*mu)
 ve=4*np.pi**3*mu*EI/T**2*f**3*.02
 rows.append(dict(n=n,expectedHz=f,bandRmsDbFS=windows,dropOver2SecondsDb=windows[-1]-windows[0],fixedEndAirDbPerS=float(20/np.log(10)*air),fixedEndBendingDbPerS=float(20/np.log(10)*ve)))
result=dict(scope=__doc__,windowsCentersS=[.25,.75,1.25,1.75,2.25],method='Fourth order zero-phase bandpass +/-12Hz; RMS. Diagnostic of harmonic bands, not separation of individual close poles; weak bands and body overlap limit interpretation. Excludes startup and end fade.',rows=rows)
p=ROOT/'experiments/string-v2/results/e2-harmonic-decay-audit.json';p.write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(rows,indent=2))
