"""Passive energy-orthogonal body reduction, preserving endpoint kinematics.
No recording fit or output EQ. Body/air/radiation are projected together.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='4'
from pathlib import Path
import sys,json,time
import numpy as np
if os.name=='nt':sys.path.insert(0,r'\\wsl.localhost\Ubuntu\tmp\pmg-acoustic-python')
from scipy.linalg import eigh,eig,solve,qr,svd
import build_520r_spruce as B
ROOT=Path(__file__).resolve().parents[1];R=B.RESEARCH/'configured-body';R.mkdir(exist_ok=True);D=ROOT/'synth-demo/instruments/configured-guitar';cache=R/'full-body.npz';start=time.time()
if not cache.exists():
 m=B.Model();indices=np.r_[np.arange(513),np.arange(635,m.ns)];ns=len(indices);ne=m.ne;ni=m.ni;M=m.baseM[np.ix_(indices,indices)];K=m.baseK[np.ix_(indices,indices)];C=m.baseC[np.ix_(indices,indices)];ev,P=eigh(K,M);w=np.sqrt(ev);size=2*ns+ne+2*ni+len(m.lam);A=np.zeros((size,size));vs=slice(ns,2*ns);xe=slice(2*ns,2*ns+ne);xi=slice(2*ns+ne,2*ns+ne+ni);vi=slice(2*ns+ne+ni,2*ns+ne+2*ni);hs=slice(size-len(m.lam),size)
 A[:ns,vs]=np.diag(w);A[vs,:ns]=-np.diag(w);A[vs,vs]=-P.T@C@P;A[xe,xe]=m.E;he=P.T@m.H[indices];A[vs,xe]=he;A[xe,vs]=-he.T
 wi=np.sqrt(m.airEigen);A[xi,vi]=np.diag(wi);A[vi,xi]=-np.diag(wi);bi=np.sqrt(m.rho)*m.coupling[:,indices]@P;A[vs,vi]=-bi.T;A[vi,vs]=bi
 d=P[m.hole];link=np.sqrt(m.g*m.lam);A[vs,vs]-=sum(m.g)*np.outer(d,d);A[vs,hs]=np.outer(d,link);A[hs,vs]=np.outer(link,d);A[hs,hs]=-np.diag(m.lam)
 S=np.zeros((6,ns));S[:,:512]=m.ends;force=np.zeros((size,6));force[vs]=P.T@S.T;pos=np.zeros((6,size));pos[:,:ns]=(S@P)/w;out=np.zeros(size);out[xe]=m.exterior['output']
 assert np.linalg.norm(pos@A-force.T)/np.linalg.norm(force)<1e-8
 assert np.linalg.norm(pos@force)<1e-12
 print('BODY EIGEN',size,flush=True);p,V=eig(A);vb=solve(V,force);np.savez_compressed(cache,A=A,p=p,V=V,vb=vb,B=force,Q=pos,out=out,basis=m.basis,direction=(m.ports['bridgePosition']-m.ports['nutPosition'])/np.linalg.norm(m.ports['bridgePosition']-m.ports['nutPosition']),chordLength=np.linalg.norm(m.ports['bridgePosition']-m.ports['nutPosition']))
 print('CACHED',time.time()-start,flush=True)
z=np.load(cache);A=z['A'];V=z['V'];p=z['p'];Bf=z['B'];Q=z['Q'];out=z['out'];vb=z['vb'];size=len(A)
inverseTranspose=solve(V.T,np.eye(size));outputModal=V.T@out
forced=np.concatenate([Bf,Q.T],axis=1);U,_,piv=qr(forced,pivoting=True,mode='economic');rank=np.linalg.matrix_rank(forced);U=U[:,:rank];cols=[]
for hz in np.geomspace(20,14000,90):
 response=V@(vb/(1+2j*np.pi*hz-p)[:,None])
 for part in [response.real,response.imag]:
  norm=np.linalg.norm(part,axis=0);cols.append(part/np.maximum(norm,1e-30))
 dual=inverseTranspose@(outputModal/(1+2j*np.pi*hz-p))
 for part in [dual.real,dual.imag]:cols.append(np.sqrt(6)*part[:,None]/max(np.linalg.norm(part),1e-30))
# Include output and adjoint response directions; no recording fit.
extra=out[:,None].copy();extra-=U@(U.T@extra);extra/=np.linalg.norm(extra);U=np.column_stack([U,extra]);snap=np.column_stack(cols);snap-=U@(U.T@snap);print('SVD',snap.shape,flush=True);Us,svals,_=svd(snap,full_matrices=False);np.savez_compressed(R/'projection-basis.npz',U=U,Us=Us,svals=svals)
for n in [64,96,128]:
 W=np.column_stack([U,Us[:,:n-U.shape[1]]]);W,_=qr(W,mode='economic');Ar=W.T@A@W;Br=W.T@Bf;Qr=Q@W;Cr=out@W
 kin=float(np.linalg.norm(Qr@Ar-Br.T)/np.linalg.norm(Br));assert kin<1e-8
 passive=float(np.linalg.eigvalsh((Ar+Ar.T)/2).max());assert passive<1e-6
 info=dict(version=1,size=n,A=Ar.tolist(),B=Br.tolist(),Q=Qr.tolist(),output=Cr.tolist(),transverseBasis=z['basis'].tolist(),direction=z['direction'].tolist(),chordLength=float(z['chordLength']),baselineTotalTensionN=364.80738,kinematicRelativeError=kin,maximumDissipationEigenvalue=passive,method='Energy-orthogonal input Krylov projection; exact endpoint force/position subspaces included; no recording fit.')
 (R/f'body-{n}.json').write_text(json.dumps(info,separators=(',',':'))+'\n',encoding='utf8');print('ROM',n,'kin',kin,'passivity',passive,flush=True)
print('DONE',time.time()-start,flush=True)
