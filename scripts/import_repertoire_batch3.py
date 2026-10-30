"""Generate complete Sor studies and Bach Bourree II from licensed sources.

Rebuild events: python3 scripts/import_repertoire_batch3.py
Recompile MIDI: add --lilypond /path/to/lilypond (2.24.4 and sibling convert-ly).
Original source bytes are never edited. No network access during builds.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from import_bwv1012 import read_notes

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'scripts/score-sources/repertoire-batch3'
BACH = ROOT / 'scripts/score-sources/repertoire-batch2'
PIECES = [
    dict(key='sor60_8', file='sor_op60-08', title='Fernando Sor · Op.60 No.8', option='Op.60 第8番', meter=[4,4], bpm=80, beats=64, bars=16, pickup=0, final=4, sourceId=1748),
    dict(key='sor60_9', file='sor_op60-09', title='Fernando Sor · Op.60 No.9', option='Op.60 第9番', meter=[4,4], bpm=80, beats=64, bars=16, pickup=0, final=4, sourceId=1749),
    dict(key='sor60_10', file='sor_op60-10', title='Fernando Sor · Op.60 No.10', option='Op.60 第10番', meter=[4,4], bpm=80, beats=65, bars=16, pickup=1, final=4, sourceId=1750),
    dict(key='bourree2_1009', file='bourree1009ii', title='J. S. Bach · BWV 1009 — Bourrée II', option='Bourrée II（ブーレ II）', meter=[2,2], bpm=150, beats=96, bars=24, pickup=1, final=3, sourceId=890),
]
# Separate MIDI tracks per voice prevent LilyPond merging overlapping unisons.
VOICE_MIDI = '\\context { \\Staff \\remove "Staff_performer" } \\context { \\Voice \\consists "Staff_performer" }'


def compile_midi(executable):
    converter = str(Path(executable).resolve().with_name('convert-ly'))
    with tempfile.TemporaryDirectory() as directory:
        for p in PIECES:
            if p['key'].startswith('sor'):
                original = SOURCES / (p['file'] + '.ly')
                text = subprocess.run([converter, str(original)], check=True, capture_output=True, text=True).stdout
                assert text.count('\\midi {') == 1
                text = text.replace('\\midi {', '\\midi { ' + VOICE_MIDI)
                text = text.replace('\\context Staff <<', "\\context Staff << \\set Score.midiChannelMapping = #'voice")
            else:
                original = (BACH / 'cellosuite3_5_bourree.ly').read_text()
                assert original.count('    \\pageBreak') == 1
                first, second = original.split('    \\pageBreak')
                assert 'Bourree I.' in first and 'Bourree II.' in second and 'da Capo' in second
                # II inherits I's 2/2 and quarter-note pickup; explicitly restore both.
                text = '\\version "2.24.4"\nbourree = { \\time 2/2 \\partial 4\n' + second
                text += '\n\\score { { \\clef "bass" \\bourree } \\midi { \\tempo 4 = 150 } }\n'
            temporary = Path(directory) / (p['file'] + '.ly')
            temporary.write_text(text)
            subprocess.run([executable, '-dno-print-pages', '-dbackend=null', '-o', str(SOURCES / p['file']), str(temporary)], check=True)


def build():
    songs, manifest = {}, []
    for p in PIECES:
        bach = p['key'].startswith('bourree')
        data = (SOURCES / (p['file'] + '.midi')).read_bytes()
        events = read_notes(data)
        source = {
            'credit': 'J. S. Bach / Stelios Samelis / Mutopia (2018)' if bach else 'Fernando Sor / Hajo Dezelski / Mutopia (2010)',
            'license': 'Public Domain' if bach else 'CC BY-SA 3.0',
            'licenseUrl': 'https://creativecommons.org/licenses/publicdomain/' if bach else 'https://creativecommons.org/licenses/by-sa/3.0/',
            'url': f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={p['sourceId']}",
            'modifications': ('Complete Bourree II isolated at I/II boundary; restored inherited 2/2 and quarter pickup. Volta repeats and return to Bourree I omitted; trill not realized. ' if bach else 'Official convert-ly syntax update; separate MIDI tracks per voice preserve overlapping unisons. Complete study; each volta section once. ') + f"LilyPond 2.24.4 to quarter-note events; no pitch shift. End marker {p['beats']} beats including rests. Fixed tempo; app articulation separate.",
            'pitch': 'Original cello sounding pitch C2-Eb4; below standard guitar E2, not a guitar arrangement.' if bach else 'Original guitar sounding pitches, MIDI shift 0; not an added arrangement. No human fretboard performance verification.',
            'terms': 'Score edition placed in the public domain by the typesetter.' if bach else 'Adapted score data: CC BY-SA 3.0; retain attribution, license and modification notice; share adaptations under the same license. Application code is separate.',
        }
        assert all(len(s) <= 500 for s in source.values())
        songs[p['key']] = dict(score=dict(title=p['title'],bpm=p['bpm'],meter=p['meter'],endBeat=p['beats'],events=events), label=p['title'],option=p['option'],edition='全曲・反復なし・チェロ原音域（E2未満あり）' if bach else '全曲・反復なし・ギター実音',source=source)
        files = [BACH / n for n in ['cellosuite3_5_bourree.ly','header.ily','cellosuite3.ly']] if bach else [SOURCES / (p['file']+'.ly')]
        files += [SOURCES / (p['file']+'.midi')]
        raw = 'https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/'
        manifest.append({**p,'source':source,'lilypondUrl':raw+('BachJS/BWV1009/cellosuite3/cellosuite3-lys/cellosuite3_5_bourree.ly' if bach else f"SorF/O60/{p['file']}/{p['file']}.ly"), 'sha256':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files}, 'notes':len(events),'noteEndBeats':max(e[0]+e[2] for e in events),'pitchRange':[min(e[1] for e in events),max(e[1] for e in events)],'belowE2':sum(e[1]<40 for e in events),'midiPitchShift':0})
    (ROOT/'synth-demo/repertoire-batch3.js').write_text('// Generated by scripts/import_repertoire_batch3.py. Sor score data: CC BY-SA 3.0; Bach: Public Domain.\n// Credits, license and changes are attached per song; application code is separate.\nconst repertoireBatch3 = '+json.dumps(songs,ensure_ascii=False,separators=(',',':')).replace('],[','],\n[')+';\n')
    (SOURCES/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps([{k:m[k] for k in ['key','notes','beats','noteEndBeats','pitchRange','belowE2']} for m in manifest],indent=2))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--lilypond')
    args=parser.parse_args()
    if args.lilypond: compile_midi(args.lilypond)
    build()
