"""Change physical pluck direction at fixed total force; no artificial detuning.
All poles remain those of the same linear coupled system. Stretching is absent.
"""
import json,wave,hashlib
import numpy as np
import build_520r_spruce as B
R=B.RESEARCH;D=B.ROOT/'synth-demo/string-lab/e2-direction-audio';D.mkdir(parents=True,exist_ok=True)
class Sideways(B.Model):
 def matrices(self,*args,**kwargs):
  M,K,C,F,meta=super().matrices(*args,**kwargs)
  n=np.arange(1,62);fraction=.08/meta['speakingLengthM'];force=meta['pluckForceN'];PB=self.ends[:3];PN=self.ends[3:]
  F[:]=0;F[:512]=force*((1-fraction)*PB+fraction*PN).T@self.basis[:,0]
  F[self.start:self.start+122]=np.stack([force*np.sin(n*np.pi*(1-fraction)),np.zeros(61)],axis=1).ravel()
  meta['directPluckDirection']=0
  meta['pullMm']=float(F@B.solve(K,F,assume_a='pos',check_finite=False)/force*1000)
  return M,K,C,F,meta
path=R/'e2-direction-zero.npz'
if not path.exists():
 model=Sideways();p,r,meta=model.solve(B.CONFIG['strings'][-1],0,40)
 np.savez_compressed(path,poles=p,residues=r,metadata=json.dumps(meta))
controls=[];waves=[]
for label,file in [('original','e2-wobble-modal-data.npz'),('orthogonal','e2-direction-zero.npz')]:
 cache=R/f'e2-direction-{label}-waves.npz'
 if cache.exists():
  c=np.load(cache);control=json.loads(str(c['control']))
  assert control['sourceSha256']==hashlib.sha256((R/file).read_bytes()).hexdigest(), 'Stale direction render cache'
  waves.append(c['high']);controls.append(control);continue
 z=np.load(R/file);p=z['poles'];r=z['residues'];y=B.render(p,r,duration=4);low=B.render(p,r,fs=96000,duration=4)
 err=float(np.linalg.norm(y-low)/np.linalg.norm(y));assert err<.005
 control=dict(label=label,render96To192kRelativeError=err,sourceSha256=hashlib.sha256((R/file).read_bytes()).hexdigest())
 np.savez_compressed(cache,high=y,control=json.dumps(control));waves.append(y);controls.append(control)
 print('RENDERED',label,err,flush=True)
gain=json.loads((B.OUT/'manifest.json').read_text(encoding='utf8'))['gain'];rows=[]
for key,deg in [('a',0),('b',45),('c',80)]:
 theta=np.deg2rad(deg);y=gain*(np.cos(theta)*waves[0]+np.sin(theta)*waves[1]);peak=float(max(abs(y)));assert peak<1
 windows=[]
 for a,b in [(.15,.35),(.65,.85),(1.65,1.85),(2.65,2.85),(3.65,3.85)]:windows.append(float(20*np.log10(max(np.sqrt(np.mean(y[int(a*48000):int(b*48000)]**2)),1e-20))))
 y[-1440:]*=np.linspace(1,0,1440)
 with wave.open(str(D/f'{key}.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.rint(y*32767).astype('<i2').tobytes())
 rows.append(dict(file=key+'.wav',angleDegreesFromCurrentPluck=deg,totalForceN=1.5457651114447049,peakFS=peak,rmsDbFS=windows))
# Verify original first three seconds against the current production sample before its end fade.
with wave.open(str(B.OUT/'40.wav')) as w:old=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
ref=gain*waves[0][:len(old)];compare=slice(0,len(old)-1440);error=float(np.max(abs(ref[compare]-old[compare])));assert error<2/32768
result=dict(scope=__doc__,gain=gain,durationS=4,controls=controls,baselineMaximumAbsoluteDifferenceFSBeforeEndFade=error,rows=rows,limits=['Angles refer to the stored transverse basis, not a measured finger trajectory. Same total force, not same injected energy or same volume.','Linear superposition of two independently Schur-checked physical excitations. No crossfade or artificial modulation.','The same original waveform is extended to four seconds. Last 30ms common end fade only.','No dynamic stretching or real-guitar constitutive identification. Original acoustic spatial/ROM limitations remain.'])
(D/'conditions.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n');print('DONE',json.dumps(result),flush=True)
