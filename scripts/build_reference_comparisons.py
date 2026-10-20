"""Build private listening pages; requires numpy. Never publishes reference audio.
Run render_reference_comparison.cjs first. Output is under ignored reference-recordings/.
The existing wound-comparison/ snapshot is deliberately never overwritten.
"""
from pathlib import Path
import json, wave
import numpy as np
repo = Path(__file__).resolve().parent.parent
private = repo / 'reference-recordings'
out = private / 'tuning-2026-10-20/reference-comparison'
treble = out / 'treble-comparison'
(treble / 'audio').mkdir(parents=True, exist_ok=True)
rate, pre, length, half = 48000, 2400, 148800, 1024
catalog = {e['midi']: e for e in json.loads((private/'catalog.json').read_text(encoding='utf-8'))}
manifest = {'sampleRate': rate, 'firTaps': 2049, 'seconds': 3.1, 'notes': [], 'splits': {'treble': [500, 2000], 'wound': [180, 800]}}
t = np.arange(2049)-half
unit = np.zeros(2049); unit[half] = 1
rms = lambda q: float(np.sqrt(np.mean(q[4320:9120]**2)))
clips = {}
for midi, label in [(55,'3弦開放 G3'),(59,'2弦開放 B3（参考録音なし）'),(64,'1弦開放 E4'),(66,'1弦2フレット F♯4'),(69,'1弦5フレット A4')]:
    entry = {'midi': midi, 'label': label, 'reference': midi in catalog}
    f0 = 440*2**((midi-69)/12)
    signals = {}
    if midi in catalog:
        base = private / catalog[midi]['folder']
        take = json.loads((base/'measurements.json').read_text(encoding='utf-8'))['measurements'][1]
        f0 = take['fundamentalHz']; start = round(take['onsetSeconds']*rate)-pre
        ref = np.fromfile(base/'decoded-mono-48k.f32',dtype='<f4').astype(float)[start:start+length]
        assert len(ref)==length
        signals['reference'] = ref
        entry.update(referenceF0=f0, take=2)
    raw = np.fromfile(private/f'treble-comparison-2026-10-21/{midi}.f32',dtype='<f4').astype(float)
    ratio = f0 / (440*2**((midi-69)/12))
    signals['synth'] = np.r_[np.zeros(pre),np.interp(np.arange(length-pre)*ratio,np.arange(len(raw)),raw)]
    for key in signals: signals[key] *= .1/max(rms(signals[key]),1e-12)
    for split,(lo,hi) in manifest['splits'].items():
        def lp(hz):
            h=2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(2049)
            return h/h.sum()
        a,b=lp(lo),lp(hi)
        kernels={'full':unit,'low':a,'mid':b-a,'high':unit-b}
        assert np.max(abs(kernels['low']+kernels['mid']+kernels['high']-unit))<1e-15
        for source,signal in signals.items():
            parts={band:np.convolve(signal,h,mode='full')[half:half+len(signal)] for band,h in kernels.items()}
            assert np.max(abs(parts['low']+parts['mid']+parts['high']-signal))<1e-12
            for band,q in parts.items():
                assert np.all(np.isfinite(q))
                name=f'{midi}-{split}-{band}-{source}'
                clips[name]=q
                gain=.1/max(float(np.sqrt(np.mean(q[pre:pre+2400]**2))),1e-12)
                clips[name+'-matched']=q*gain
    manifest['notes'].append(entry)
# One common safety gain for all notes, bands and modes preserves their relative levels.
gain=min(1,.92/max(float(np.max(abs(q))) for q in clips.values()))
manifest['commonHeadroomGain']=gain
for name,q in clips.items():
    q=q.copy()*gain;q[-1920:]*=np.linspace(1,0,1920)
    assert np.max(abs(q))<1
    with wave.open(str(treble/'audio'/f'{name}.wav'),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(q*32767).astype('<i2').tobytes())
(treble/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
page=(repo/'scripts/reference-comparison.html').read_text(encoding='utf-8').replace('__CONFIG__',json.dumps(manifest,ensure_ascii=False))
(treble/'index.html').write_text(page,encoding='utf-8')
(out/'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ギター音色の比較</title><style>body{background:#201810;color:#f4e4cb;font:18px/1.9 system-ui;max-width:720px;margin:60px auto;padding:20px}a{color:#f3cf90;display:block;padding:20px;border:1px solid #99734e;margin:20px 0;border-radius:12px}</style><h1>ギター音色の比較</h1><a href="wound-comparison/">保存版：6弦Eの低域・中域・高域比較<br>参考録音／調整前／採用した調整後</a><a href="treble-comparison/">1〜3弦：参考録音と合成音の帯域比較</a><p>参考録音を含むページは、このPC内だけで配信しています。</p></html>''',encoding='utf-8')
print(f'Built {len(clips)} private WAVs. Complementary bands, reconstruction, finite samples and headroom verified.')
