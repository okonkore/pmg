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
