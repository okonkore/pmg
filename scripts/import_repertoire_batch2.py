"""Rebuild batch 2 from vendored MIDI, or compile using --lilypond PATH.

Full compilation uses the sibling convert-ly; originals remain unmodified.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from import_bwv1012 import read_notes

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'scripts/score-sources/repertoire-batch2'
RAW = 'https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/'
PIECES = [
    dict(key='sor35_17', file='sorf_op35_no17', title='Fernando Sor · Op.35 No.17', option='Op.35 第17番', bpm=96, meter=[4,4], beats=129, bars=32, pickup=1, final=4, sourceId=1954, year=2014, path='SorF/O35/sorf_op35_no17/sorf_op35_no17.ly'),
    dict(key='sor6_11', file='sorf-op6n11', title='Fernando Sor · Op.6 No.11', option='Op.6 第11番', bpm=74, meter=[4,4], beats=348, bars=87, pickup=0, final=4, sourceId=2134, year=2016, path='SorF/O6/sorf-op6n11/sorf-op6n11.ly'),
    dict(key='bourree1009', file='bourree1009', title='J. S. Bach · BWV 1009 — Bourrée I', option='Bourrée I（ブーレ I）', bpm=150, meter=[2,2], beats=112, bars=28, pickup=1, final=3, sourceId=890, year=2018, path='BachJS/BWV1009/cellosuite3/cellosuite3-lys/cellosuite3_5_bourree.ly'),
]

def compile_midi(executable):
    converter = str(Path(executable).resolve().with_name('convert-ly'))
    with tempfile.TemporaryDirectory() as folder:
        for piece in PIECES:
            original = SOURCES / Path(piece['path']).name
            source = Path(folder) / (piece['file'] + '.ly')
            if piece['key'] == 'bourree1009':
                text = original.read_text()
                assert text.count('    \\pageBreak') == 1
                # The first pageBreak is exactly the movement boundary, following
                # Bourree I's second complete volta and before II's key change.
                first, second = text.split('    \\pageBreak')
                assert 'Bourree II.' in second and '<<{c2.} \\\\ {c,}>>' in first
                source.write_text(first + '}\n\\score { { \\clef "bass" \\transpose c c { \\bourree } } \\midi { \\tempo 4 = 150 } }\n')
            else:
                converted = subprocess.run([converter, str(original)], check=True, capture_output=True, text=True)
                source.write_text(converted.stdout)
            subprocess.run([executable, '-dno-print-pages', '-dbackend=null', '-o', str(SOURCES / piece['file']), str(source)], check=True)

def build():
    songs, manifest = {}, []
    for p in PIECES:
        bach = p['key'] == 'bourree1009'
        data = (SOURCES / (p['file'] + '.midi')).read_bytes()
        events = read_notes(data)
        source = {
            'credit': f"J. S. Bach / Stelios Samelis / Mutopia ({p['year']})" if bach else f"Fernando Sor / Glen Larsen / Mutopia ({p['year']})",
            'license': 'Public Domain' if bach else 'CC BY-SA 4.0',
            'licenseUrl': 'https://creativecommons.org/licenses/publicdomain/' if bach else 'https://creativecommons.org/licenses/by-sa/4.0/',
            'url': f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={p['sourceId']}",
            'modifications': ('Complete Bourree I isolated at the I/II boundary; volta repeats and da capo omitted; original cello pitch, no transposition. ' if bach else 'Official convert-ly syntax update; original guitar sounding pitch, no transposition; no sectional repeats in source. ') + f"LilyPond 2.24.4 MIDI to quarter-note events; all voices retained. Pickup {p['pickup']} beat(s); score ends at {p['beats']} beats, including rests. Fixed source tempo; app articulation separate.",
            'pitch': 'Original cello range C2-F4; notes below standard guitar E2 retained; not a guitar arrangement.' if bach else 'Original guitar sounding pitch; MIDI shift 0. Range does not establish fretboard playability.',
            'terms': 'Score edition placed in the public domain by the typesetter.' if bach else 'Adapted score data: CC BY-SA 4.0; retain attribution, license and modification notice; share adaptations under the same license. Application code is separate.',
        }
        songs[p['key']] = {
            'score': {'title':p['title'], 'bpm':p['bpm'], 'meter':p['meter'], 'endBeat':p['beats'], 'events':events},
            'label':p['title'], 'option':p['option'],
            'edition':'全曲・反復なし・チェロ原音域（E2未満あり）' if bach else '全曲・ギター実音', 'source':source,
        }
        original = SOURCES / Path(p['path']).name
        supporting = {name:hashlib.sha256((SOURCES/name).read_bytes()).hexdigest() for name in ['header.ily','cellosuite3.ly']} if bach else {}
        manifest.append({**p, 'source':source, 'lilypondUrl':RAW+p['path'],
                         'sha256':{**supporting, original.name:hashlib.sha256(original.read_bytes()).hexdigest(), p['file']+'.midi':hashlib.sha256(data).hexdigest()},
                         'notes':len(events), 'noteEndBeats':max(at+d for at,_,d in events),
                         'pitchRange':[min(n[1] for n in events),max(n[1] for n in events)],
                         'belowE2':sum(n[1]<40 for n in events), 'midiPitchShift':0})
    (ROOT/'synth-demo/repertoire-batch2.js').write_text(
        '// Generated by scripts/import_repertoire_batch2.py. Sor score data: CC BY-SA 4.0; Bach: Public Domain.\n'
        '// Source attribution, license links and modifications are retained per song. Application code is separate.\n'
        'const repertoireBatch2 = '+json.dumps(songs,ensure_ascii=False,separators=(',',':')).replace('],[','],\n[')+';\n')
    (SOURCES/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps([{k:m[k] for k in ['key','notes','beats','noteEndBeats','bars','pickup','final','pitchRange','belowE2']} for m in manifest],indent=2))

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--lilypond')
    args=parser.parse_args()
    if args.lilypond: compile_midi(args.lilypond)
    build()
