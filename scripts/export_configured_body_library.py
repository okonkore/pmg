"""Small passive mobility preparation plus the full original pressure modal observer.
The observer is assembled by triangular modal composition in the browser, so no
large eigendecomposition is required on the device. No acoustic poles are fitted.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.linalg import solve,svd,qr
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results/configured-body';D=ROOT/'synth-demo/instruments/configured-guitar';z=np.load(R/'full-body.npz');A=z['A'];V=z['V'];p=z['p'];B=z['B'];Q=z['Q'];out=z['out'];vb=z['vb'];left=solve(V.T,np.eye(len(A)));co=V.T@B;freq=np.geomspace(2,24000,160);control=[];observe=[]
for hz,weight in zip(freq,np.gradient(freq)):
 den=.1+2j*np.pi*hz-p;c=V@(vb/den[:,None]);o=left@(co/den[:,None]);w=np.sqrt(weight);control.extend([c.real*w,c.imag*w]);observe.extend([o.real*w,o.imag*w])
C=np.column_stack(control);O=np.column_stack(observe)
for j in range(6):C[:,j::6]/=max(np.linalg.norm(C[:,j::6]),1e-30);O[:,j::6]/=max(np.linalg.norm(O[:,j::6]),1e-30)
u,s,vh=svd(O.T@C,full_matrices=False);Tm=C@vh[:384].T/np.sqrt(s[:384]);forced=np.column_stack([B,Q.T]);U,_,_=qr(forced,pivoting=True,mode='economic');U=U[:,:np.linalg.matrix_rank(forced)];Tm-=U@(U.T@Tm);Tm,_=qr(Tm,mode='economic');keep=np.flatnonzero(p.imag>=-1e-7);weight=np.where(abs(p[keep].imag)<1e-7,1.,2.);cp=(out@V)[keep]*weight;bp=vb[keep];
observer=dict(poles=np.column_stack([p[keep].real,p[keep].imag]).tolist(),forceReal=bp.real.tolist(),forceImag=bp.imag.tolist(),outputReal=cp.real.tolist(),outputImag=cp.imag.tolist())
np.savez_compressed(R/'mobility-projection.npz',U=U,Tm=Tm,hankelSingularValues=s)
for n in [64,96,128,192,256]:
 W=np.column_stack([U,Tm[:,:n-U.shape[1]]]);W,_=qr(W,mode='economic');ar=W.T@A@W;br=W.T@B;qq=Q@W;kin=np.linalg.norm(qq@ar-br.T)/np.linalg.norm(br);assert kin<1e-8
 info=dict(version=1,size=n,A=ar.tolist(),B=br.tolist(),Q=qq.tolist(),output=[0.]*n,fullObserver=observer,transverseBasis=z['basis'].tolist(),direction=z['direction'].tolist(),chordLength=float(z['chordLength']),baselineTotalTensionN=364.80738,kinematicRelativeError=float(kin),maximumDissipationEigenvalue=float(np.linalg.eigvalsh((ar+ar.T)/2).max()),method='Passive mobility energy-Galerkin projection; full original pressure observer composed by Sylvester transformation. No pressure-mode removal or recording fit.')
 ((D if n==256 else R)/f'body-library-{n}.json').write_text(json.dumps(info,separators=(',',':'))+'\n');print('BODY',n,'pressure modes',len(keep),'kin',kin,flush=True)
