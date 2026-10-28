"""Check photo-derived sections and positive coupled mechanical energy."""
import importlib.util
from pathlib import Path
s=importlib.util.spec_from_file_location('fixed520r',Path(__file__).with_name('build_520r_spruce.py'))
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
np=m.np
assert abs(sum(s['nominalTensionKgf'] for s in m.CONFIG['strings'])*9.80665-364.80738)<1e-9
model=m.Model()
for string in m.CONFIG['strings']:
    sec=m.section(string)
    assert sec['mu']>0 and sec['ei']>0
    if string['construction']=='wound':
        assert abs(sec['estimatedCoreDiameterMm']+2*sec['estimatedWireDiameterMm']-string['outerDiameterMm'])<1e-10
    for fret in [0,12,24]:
        M,K,C,F,meta=model.matrices(string,fret)
        for a in [M,K,C]:assert np.max(abs(a-a.T))<1e-6
        assert np.linalg.eigvalsh(M).min()>0
        assert np.linalg.eigvalsh(K).min()>0
        assert np.linalg.eigvalsh(C).min()>-1e-7
        assert abs(meta['fixedEndHz']/meta['targetHz']-1)<1e-10
        assert F@np.linalg.solve(K,F)>0
    print('PASS string',string['number'],sec,flush=True)
print('PASS: six sections, nominal preload, 18 positive mechanical systems and tuning')
string=m.CONFIG['strings'][-1];sec=m.section(string);openM,openK,openC,openF,openMeta=model.matrices(string)
previous=0
for midi in range(21,40):
    M,K,C,F,meta=model.matrices(string,0,midi)
    assert meta['string']==6 and meta['fret']==0 and meta['speakingLengthM']==.65
    assert meta['mu']==sec['mu'] and meta['ei']==sec['ei']
    assert previous<meta['tension']<sec['tension'];previous=meta['tension']
    expected=(sec['mu']*(2*np.pi*440*2**((midi-69)/12))**2-sec['ei']*(np.pi/.65)**4)/(np.pi/.65)**2
    assert abs(meta['tension']/expected-1)<1e-12
    assert np.allclose(M,openM,rtol=1e-10,atol=1e-12)
    assert np.linalg.eigvalsh(K).min()>0
    assert np.linalg.eigvalsh(C).min()>-1e-7
    assert 0<meta['pullMm']<=5.00000001 and 0<meta['pluckForceN']<=m.CONFIG['assumptions']['pluckForceN']
    assert abs(meta['fixedEndHz']/meta['targetHz']-1)<1e-10
    assert abs(F@np.linalg.solve(K,F)/meta['pluckForceN']*1000-meta['pullMm'])<1e-7
    print('PASS low tuning',midi,meta['tensionKgf'],'kgf',meta['pullMm'],'mm',flush=True)
print('PASS: 19 low notes keep sixth-string mass and length, lower tension monotonically, retain positive energy and limit pull to 5 mm')
