"""Render fixed 520R-photo strings with the latest passive whole-shell model.
Run with Python + NumPy/SciPy. Never modifies research inputs or frozen latest B.
"""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS', '4')
os.environ.setdefault('OMP_NUM_THREADS', '4')
import sys
from pathlib import Path
if os.name == 'nt':
    sys.path.insert(0, r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
import argparse, hashlib, json, time, wave
import numpy as np
from scipy.linalg import eigh, eig, solve
from scipy.optimize import brentq
from scipy.signal import resample_poly, lfilter
ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'experiments/string-v2/results'
OUT = ROOT / 'synth-demo/instruments/guitar-520r-spruce'
CONFIG = json.loads((OUT / 'config.json').read_text(encoding='utf8'))

def section(string):
    a=CONFIG['assumptions']; d=string['outerDiameterMm']/1000; L=CONFIG['scaleMm']/1000
    hz=440*2**((string['openMidi']-69)/12); T=string['nominalTensionKgf']*9.80665
    E=a['nylonYoungPa']; k=np.pi/L
    if string['construction']=='plain':
        ei=E*np.pi*d**4/64; mu=(T*k*k+ei*k**4)/(2*np.pi*hz)**2
        return dict(mu=mu,ei=ei,tension=T,outerDiameterM=d,effectiveDensityKgM3=mu/(np.pi*d*d/4))
    def geometry(wire):
        core=d-2*wire; area=a['coreFill']*np.pi*core**2/4
        mu=a['nylonReferenceDensityKgM3']*area+a['wireDensityKgM3']*np.pi*wire**2/4*np.hypot(1,np.pi*(core+wire)/wire)
        ei=E*area**2/(4*np.pi*a['filaments'])
        return mu,ei,core
    def residual(wire):
        mu,ei,_=geometry(wire)
        return (T*k*k+ei*k**4)/(2*np.pi*hz)**2-mu
    wire=brentq(residual,d*1e-6,d*.499,xtol=1e-15);mu,ei,core=geometry(wire)
    return dict(mu=mu,ei=ei,tension=T,outerDiameterM=d,estimatedCoreDiameterMm=core*1000,estimatedWireDiameterMm=wire*1000)

class Model:
    def __init__(self):
        self.physical=np.load(RESEARCH/'footprint-held-acoustic-system-n512-ny4.npz')
        self.air=np.load(RESEARCH/'footprint-interior-p2mortar-held-n512-ny4-l3-m256.npz')
        self.exterior=np.load(RESEARCH/'footprint-fem-exterior/rom-held-p2mortar-p2-l8-o6-600.npz')
        self.ports=np.load(RESEARCH/'footprint-string-ports.npz')
        body=np.load(RESEARCH/'footprint-held-body-n512.npz')
        self.ends=self.ports['internalPorts']@body['internal']
        self.nb=512; self.hole=512; self.start=513; self.ns=len(self.physical['F'])
        self.ne=len(self.exterior['output']);self.ni=256
        self.basis=self.ports['stringTransverseBasis'];self.rho=1.2
        self.lam=self.physical['lam'];self.g=self.physical['g']
        self.H=self.exterior['Hphys'];self.E=self.exterior['A'];self.loss=self.exterior['loss']
        self.coupling=np.zeros((self.ni,self.ns));self.coupling[:,:513]=self.air['coupling'][:self.ni]
        self.airEigen=self.air['eigenvalues'][:self.ni]
        self.airRemainder=self.air['staticMass']-self.rho*(self.air['coupling'][:self.ni].T/self.airEigen)@self.air['coupling'][:self.ni]
        self.baseM=self.physical['M']-self.physical['stringMass']
        self.baseM[:513,:513]+=self.airRemainder
        self.baseK=self.physical['K'].copy();self.baseK[:513,:513]+=self.air['uniformStiffness']
        self.baseK[self.start:self.start+122,self.start:self.start+122]=0
        self.baseC=self.physical['C'].copy();self.baseC[self.start:self.start+122,self.start:self.start+122]=0

    def matrices(self,string=None,fret=0):
        if string is None:  # Exact legacy reference, before changing any string properties.
            M=self.physical['M'].copy();M[:513,:513]+=self.airRemainder
            K=self.physical['K'].copy();K[:513,:513]+=self.air['uniformStiffness']
            return M,K,self.physical['C'],self.physical['F'],{}
        sec=section(string);L=CONFIG['scaleMm']/1000*2**(-fret/12);T=sec['tension'];mu=sec['mu'];ei=sec['ei']
        # Match the target stiff-string fundamental by shortening the speaking length.
        # Open nominal tensions and measured/inferred mass stay fixed for every fret.
        target=440*2**((string['openMidi']+fret-69)/12)
        L=brentq(lambda x:(T*(np.pi/x)**2+ei*(np.pi/x)**4)/mu-(2*np.pi*target)**2,L*.95,L*1.05)
        M=self.baseM.copy();K=self.baseK.copy();C=self.baseC.copy();F=np.zeros(self.ns)
        PB=self.ends[:3];PN=self.ends[3:];mass=mu*L;n=np.arange(1,62);start=self.start
        M[:512,:512]+=mass/6*(2*PN.T@PN+PN.T@PB+PB.T@PN+2*PB.T@PB)
        cross=np.concatenate([mass/(j*np.pi)*(PN+(-1)**(j+1)*PB).T@self.basis for j in n],axis=1)
        M[:512,start:start+122]=cross;M[start:start+122,:512]=cross.T;M[start:start+122,start:start+122]=np.eye(122)*mass/2
        k=n*np.pi/L;ks=(T*k*k+ei*k**4)*L/2;omega=np.sqrt(ks/(mass/2));d=sec['outerDiameterM']
        drag=2*np.pi*1.8e-5+2*np.pi*d*np.sqrt(np.pi*1.8e-5*1.2*omega/(2*np.pi))
        sigma=drag/(2*mu)+4*np.pi**3*mu*ei/T**2*(omega/(2*np.pi))**3*CONFIG['assumptions']['stringLossAngle']
        K[start:start+122,start:start+122]=np.diag(np.repeat(ks,2));C[start:start+122,start:start+122]=np.diag(np.repeat(mass*sigma,2))
        force=CONFIG['assumptions']['pluckForceN'];fraction=CONFIG['assumptions']['pluckDistanceMm']/1000/L
        F[:512]=force*((1-fraction)*PB+fraction*PN).T@self.basis[:,1]
        F[start:start+122]=np.stack([np.zeros(61),force*np.sin(n*np.pi*(1-fraction))],axis=1).ravel()
        return M,K,C,F,dict(**sec,speakingLengthM=L,fret=fret,string=string['number'],targetHz=target,fixedEndHz=float(omega[0]/(2*np.pi)))

    def solve(self,string=None,fret=0):
        began=time.time();M,K,C,F,meta=self.matrices(string,fret)
        ev,P=eigh(K,M,check_finite=False);assert ev.min()>0;w=np.sqrt(ev);ns=self.ns;ne=self.ne;ni=self.ni
        size=2*ns+ne+2*ni+len(self.lam);A=np.zeros((size,size));vs=slice(ns,2*ns);xe=slice(2*ns,2*ns+ne);xi=slice(2*ns+ne,2*ns+ne+ni);vi=slice(2*ns+ne+ni,2*ns+ne+2*ni);hs=slice(size-len(self.lam),size)
        A[:ns,vs]=np.diag(w);A[vs,:ns]=-np.diag(w);Ct=P.T@C@P;A[vs,vs]=-Ct;A[xe,xe]=self.E
        he=P.T@self.H;A[vs,xe]=he;A[xe,vs]=-he.T
        wi=np.sqrt(self.airEigen);A[xi,vi]=np.diag(wi);A[vi,xi]=-np.diag(wi);bi=np.sqrt(self.rho)*self.coupling@P;A[vs,vi]=-bi.T;A[vi,vs]=bi
        d=P[self.hole];link=np.sqrt(self.g*self.lam);A[vs,vs]-=sum(self.g)*np.outer(d,d);A[vs,hs]=np.outer(d,link);A[hs,vs]=np.outer(link,d);A[hs,hs]=-np.diag(self.lam)
        x0=solve(K,F,assume_a='pos',check_finite=False);initial=np.zeros(size);initial[:ns]=w*(P.T@M@x0);out=np.zeros(size);out[xe]=self.exterior['output']
        print('EIGEN',meta or 'reference',size,'elapsed',time.time()-began,flush=True)
        poles,V=eig(A,check_finite=False,overwrite_a=False);assert poles.real.max()<0
        amps=solve(V,initial,check_finite=False);residues=(out@V)*amps
        residual=float(np.linalg.norm(A@(V@amps)-V@(poles*amps))/max(np.linalg.norm(A@initial),1e-30))
        initialError=float(np.linalg.norm((V@amps).real-initial)/np.linalg.norm(initial));assert initialError<1e-8 and residual<1e-7
        energy=float(.5*F@x0);assert energy>0
        # Independent forced-response Schur solves check coupled modal residues.
        frequencyChecks=[]
        for hz in [98.,223.,659.]:
            ss=3+2j*np.pi*hz;prop=solve(ss*np.eye(ne)-self.E,self.H.T,check_finite=False)
            D=K+ss*C+ss*ss*M+ss*self.H@prop
            D[self.hole,self.hole]+=ss*sum(self.g*ss/(ss+self.lam))
            D+=self.rho*ss*ss*(self.coupling.T/(self.airEigen+ss*ss))@self.coupling
            direct=(-ss*self.exterior['output']@prop)@solve(D,F,check_finite=False)
            modal=-ss*np.sum(residues/(ss-poles));error=float(abs(modal-direct)/max(abs(direct),1e-12))
            assert error<1e-6,(hz,error)
            frequencyChecks.append(dict(hz=hz,stateVsSchurRelativeError=error))
        meta['frequencyChecks']=frequencyChecks
        meta.update(states=size,initialEnergyJ=energy,maxPoleReal=float(poles.real.max()),initialReconstructionRelativeError=initialError,modalDerivativeRelativeError=residual,seconds=time.time()-began)
        print('SOLVED',json.dumps(meta),flush=True)
        return poles,residues,meta

def render(poles,residues,fs=192000,duration=3):
    # Exact exponential recurrence, evaluated by compiled real biquad filters.
    # This avoids billions of complex exponential evaluations without changing poles.
    count=round(fs*duration);impulse=np.zeros(count);impulse[0]=1;y=np.zeros(count)
    for j in np.flatnonzero(poles.imag>=-1e-7):
        z=np.exp(poles[j]/fs);r=residues[j]
        if abs(poles[j].imag)<1e-7:
            y+=lfilter([r.real],[1,-z.real],impulse)
        else:
            y+=lfilter([2*r.real,-2*(r*z.conjugate()).real],[1,-2*z.real,abs(z)**2],impulse)
    return resample_poly(y,1,fs//48000)


def build_note(midi,duration):
    model=Model();return compute_note(model,midi,duration)


def compute_note(model,midi,duration):
    signature=hashlib.sha256((json.dumps(CONFIG,sort_keys=True)+Path(__file__).read_text()+str(duration)).encode()).hexdigest()
    cache=RESEARCH/'guitar-520r-cache'/signature[:20];cache.mkdir(parents=True,exist_ok=True)
    string=next((s for s in CONFIG['strings'] if s['openMidi']<=midi<=s['openMidi']+24),None)
    if string is None:raise ValueError('Outside six-string range: '+str(midi))
    fret=midi-string['openMidi'];path=cache/f'{midi}.npz'
    if path.exists():
        z=np.load(path);meta=json.loads(str(z['metadata']));assert str(z['signature'])==signature,'Stale render cache'
        y=z['samples']
    else:
        poles,res,meta=model.solve(string,fret);y=render(poles,res,duration=duration)
        low=render(poles,res,fs=96000,duration=duration);err=float(np.linalg.norm(y-low)/max(np.linalg.norm(y),1e-30));assert err<.005,err;meta['render96To192kRelativeError']=err
        np.savez_compressed(path,samples=y,metadata=json.dumps(meta),signature=signature)
    assert np.isfinite(y).all();return midi,string,fret,y,meta

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--reference',action='store_true');parser.add_argument('--midis',default=','.join(map(str,range(40,89))));parser.add_argument('--workers',type=int,default=1);parser.add_argument('--duration',type=float,default=3);args=parser.parse_args()
    cache=RESEARCH/'guitar-520r-cache';cache.mkdir(exist_ok=True);model=Model()
    if args.reference:
        poles,res,meta=model.solve();y=render(poles,res,duration=2)
        old=np.load(RESEARCH/'footprint-whole-wave-controls.npz')['candidate_192000']
        err=float(np.linalg.norm(y-old)/np.linalg.norm(old));assert err<1e-6,err
        report=json.dumps(dict(relativeWaveformError=err,**meta),indent=2);(cache/'reference-check.json').write_text(report);(OUT/'reference-check.json').write_text(report);print('REFERENCE PASS',err,flush=True);return
    midis=sorted(set(map(int,args.midis.split(','))))
    if args.workers>1:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            records=list(pool.map(build_note,midis,[args.duration]*len(midis)))
    else:
        records=[compute_note(model,midi,args.duration) for midi in midis]
    peak=max(float(np.max(abs(r[3]))) for r in records);gain=min(.874009795621089,.80/peak)
    manifest=dict(id=CONFIG['id'],label=CONFIG['label'],sampleRate=48000,durationSeconds=args.duration,gain=gain,polyphony='independent single-active-string whole-shell voices',notes=[],limits=CONFIG['limits']+['Fretted notes shorten the active speaking length with the inherited nut-body port; finger damping and a spatially moved fret contact are not modeled.','High-frequency acoustic reduction is inherited from latest B, including its unresolved 3500 Hz error. State/Schur agreement verifies assembly, not continuum accuracy.'])
    for midi,string,fret,y,meta in records:
        y=y*gain;y[-1440:]*=np.linspace(1,0,1440);pcm=np.rint(y*32767).astype('<i2');path=OUT/f'{midi}.wav'
        with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(48000);f.writeframes(pcm.tobytes())
        manifest['notes'].append(dict(midi=midi,string=string['number'],fret=fret,file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),peakFS=float(max(abs(y))),physics=meta))
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print('DONE',len(records),'gain',gain,flush=True)
if __name__=='__main__':main()
