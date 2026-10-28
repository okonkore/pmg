"""Full coupled E2-C with conservative geometric stretching and moving endpoints.
Exports exact linear modal propagation and work-conjugate nonlinear ports.
Core-only EA; winding axial stiffness and travelling longitudinal waves omitted.
"""
from pathlib import Path
import json
import numpy as np
ROOT=Path(__file__).resolve().parents[1];solver=Path(__file__).with_name('compare_e2_relaxation.py');ns={}
exec(compile(solver.read_text(encoding='utf8').split("gain=json.loads((B.OUT/")[0],str(solver),'exec'),ns)
B=ns['B'];R=B.RESEARCH;OUT=R/'e2-stretch';OUT.mkdir(exist_ok=True)
# Add only the axial tangent to the linear model; all other C matrices remain.
class Axial(B.Model):
 def matrices(self,*args,**kwargs):
  M,K,C,F,meta=super().matrices(*args,**kwargs)
  L=meta['speakingLengthM'];sec=B.section(B.CONFIG['strings'][-1]);dc=sec['estimatedCoreDiameterMm']/1000
  EA=B.CONFIG['assumptions']['nylonYoungPa']*B.CONFIG['assumptions']['coreFill']*np.pi*dc**2/4
  direction=self.ports['bridgePosition']-self.ports['nutPosition'];direction/=np.linalg.norm(direction)
  W=np.zeros((125,self.ns));W[:3,:512]=self.ends[:3]-self.ends[3:];W[3:,self.start:self.start+122]=np.eye(122)
  a=np.zeros(125);a[:3]=direction;H=np.zeros((125,125));H[:3,:3]=(np.eye(3)-np.outer(direction,direction))/L
  H[3:,3:]=np.diag(np.repeat(L/2*(np.arange(1,62)*np.pi/L)**2,2))
  axial=W.T@a;kEA=EA/L;K+=kEA*np.outer(axial,axial)
  self.W=W;self.a=a;self.Hgeom=H;self.kEA=kEA;self.direction=direction
  meta.update(coreAxialEA_N=EA,axialSpringNPerM=kEA)
  return M,K,C,F,meta
source=ns['source'].replace('def relaxation_solve(', 'def export_stretch_solve(')
# The source for the dynamically generated method is held in the original namespace.
extra='''W=self.W;a=self.a;Hg=self.Hgeom;kEA=self.kEA
    def nl(q):
        rr=W@q;hr=Hg@rr;g=.5*rr@hr;e=a@rr+g
        f=kEA*(g*a+e*hr)
        h=kEA*(np.outer(a+hr,a+hr)+e*Hg-np.outer(a,a))
        return W.T@f,W.T@h@W,rr,e,g
    qnl=x0.copy()
    for iteration in range(20):
        ff,hh,rr,e,g=nl(qnl);residualStatic=K@qnl+ff-F
        norm=float(np.linalg.norm(residualStatic)/np.linalg.norm(F))
        if norm<1e-11:break
        qnl-=solve(K+hh,residualStatic,assume_a='sym',check_finite=False)
    assert norm<1e-10,norm
    initialNL=np.zeros(size);initialNL[:ns]=w*(P.T@M@qnl)
    keep=np.flatnonzero(poles.imag>=-1e-7);pk=poles[keep];weight=np.where(abs(pk.imag)<1e-7,1.,2.)
    from scipy.linalg import lu_factor,lu_solve
    fac=lu_factor(V,check_finite=False)
    bphysical=np.zeros((size,125));bphysical[vs]=P.T@W.T
    modalB=lu_solve(fac,bphysical,check_finite=False)[keep]
    ampNL=lu_solve(fac,initialNL,check_finite=False)[keep]
    Q=((W@P)/w[None,:])@V[:ns,keep];Qweighted=Q*weight[None,:]
    ck=(out@V[:,keep])*weight
    forcePositionError=float(np.max(abs((Qweighted@modalB).real)))
    forceOutputError=float(np.max(abs((ck@modalB).real)))
    assert forcePositionError<1e-7 and forceOutputError<1e-7,(forcePositionError,forceOutputError)
    energyNL=float(.5*qnl@K@qnl+kEA*((a@rr)*g+.5*g*g))
    meta.update(initialNonlinearStaticResidual=norm,initialNonlinearDeltaT_N=kEA*e,initialNonlinearAddedLengthM=e,nonlinearInitialEnergyJ=energyNL,forcePositionError=forcePositionError,forceOutputError=forceOutputError)
    np.savez_compressed(STRETCH_OUT/'model.npz',poles=pk,Q=Qweighted,B=modalB,output=ck,amplitudeNL=ampNL,amplitudeLinear=amps[keep],vectors=V[:,keep]*weight[None,:],a=a,H=Hg,kEA=kEA,length=meta['speakingLengthM'],initialNonlinearPorts=rr,metadata=json.dumps(meta),fullPoles=poles,linearResidues=residues)
    # Binary contract: N,D; poles; z0; Q(D,N); B transpose(D,N); output; a; H.
    import struct
    with (STRETCH_OUT/'model.bin').open('wb') as file:
        file.write(struct.pack('<ii',len(keep),125))
        for arr in [pk,ampNL,Qweighted,modalB.T,ck]:file.write(np.asarray(arr,dtype='<c16',order='C').tobytes())
        for arr in [a,Hg,np.array([kEA])]:file.write(np.asarray(arr,dtype='<f8',order='C').tobytes())
        file.write(np.asarray(amps[keep],dtype='<c16').tobytes())
    (STRETCH_OUT/'preparation.json').write_text(json.dumps(meta,indent=2)+'\\n',encoding='utf8',newline='\\n')
    print('EXPORTED_STRETCH',json.dumps(meta),flush=True)
    return poles,residues,meta'''
source=source.replace('return poles,residues,meta',extra)
B.STRETCH_OUT=OUT
exec(compile(source,'e2_stretch_export','exec'),B.__dict__)
Axial.solve=B.export_stretch_solve
model=Axial();model.relaxationRate=2*np.pi*1000;model.solve(B.CONFIG['strings'][-1],0,40)
