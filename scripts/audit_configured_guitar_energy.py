"""Compare reduced device preparation with frozen full-model waveforms and energy."""
from pathlib import Path
import json,numpy as np
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'experiments/string-v2/results';D=R/'configured-body';report={"bodyStates":256,"pressureModes":1704,"sampleRate":48000,"referenceSeconds":3,"cases":[]}
refs={'e2':R/'e2-stretch/long-tail/nonlinear-1x.f32','fourth-open':R/'d3-string-comparison/fourth-open/nonlinear-48000.f32','sixth-fret10':R/'d3-string-comparison/sixth-fret10/nonlinear-48000.f32'}
for key,ref in refs.items():
 data=json.loads((D/f'256-{key}.json').read_text());d=data['debug'];V=np.array(d['V']);E=np.array(d['E']);rr=np.array(d['R']);keep=d['keep'];binary=(D/f'256-{key}.bin').read_bytes();n=int.from_bytes(binary[:4],'little');z=np.fromfile(D/f'256-{key}-states.f64',dtype='float64').reshape(7,n,2);flat=np.frombuffer(binary,dtype='<f8',offset=8);offset=2*n*3+2*125*n*2 # poles,initial,? use layout explicitly below
 offset=2*n+2*n+2*125*n+2*125*n+2*n;a=flat[offset:offset+125];H=flat[offset+125:offset+125+15625].reshape(125,125);ea=flat[offset+125+15625];energies=[]
 for state in z:
  c=np.zeros(len(V));
  for k,j in enumerate(keep):
   c[j]=state[k,0]
   if j+1<len(c) and j+1 not in keep:c[j+1]=-state[k,1]
  y=V@c;r=rr@y;g=.5*r@H@r;energies.append(float(.5*y@E@y+ea*((a@r)*g+.5*g*g)))
 assert min(energies)>0 and all(energies[i+1]<=energies[i]*(1+1e-6) for i in range(6)),energies
 actual=np.fromfile(D/f'256-{key}.f32',dtype='float32');reference=np.fromfile(ref,dtype='float32')[:len(actual)]*.4286610858558977
 error=lambda length:float(np.linalg.norm(actual[:length]-reference[:length])/np.linalg.norm(reference[:length]))
 report['cases'].append(dict(key=key,waveRelativeL2=error(len(actual)),attack100msRelativeL2=error(4800),energyJ=energies,initialDeltaT=data['physics']['initialDeltaT']))
report['scope']='Approximate passive body mobility; original pressure poles retained. L2 waveform errors include phase drift. No recording fit or arbitrary output EQ. Not hardware-tested on iPhone.'
(D/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
