"""Full performed forms from licensed solo-guitar editions; original MIDI voices retained."""
import argparse,hashlib,json,re,subprocess,tempfile
from pathlib import Path
from import_bwv1012 import read_notes
from import_repertoire_batch4 import VOICE_MIDI
ROOT=Path(__file__).resolve().parents[1];SOURCES=ROOT/'scripts/score-sources/bwv1006a-complete'
PIECES=[
 dict(key='prelude1006a',file='bwv-1006a_1g',name='Preludio',japanese='プレリュード',bpm=100,meter=[3,4],writtenBars=139,beats=417,sourceId=1485,form=[[0,417]],formName='Through-composed; no repeat signs.',ending='139 full bars; final bass E lasts 3 beats; fermata not lengthened.'),
 dict(key='loure1006a',file='bwv-1006a_2g',name='Loure',japanese='ルール',bpm=80,meter=[6,4],writtenBars=24,beats=294,sourceId=1486,form=[[0,67.5],[0,67.5],[67.5,147],[67.5,147]],formName='A A B B: 1.5-beat pickup + 11/13 full bars per section.',ending='Edition closing 1.5-beat spacers retained in each section; final note ends292.5.'),
 dict(key='gavotte1006a',file='bwv-1006a_3g',name='Gavotte en Rondeau',japanese='ガヴォット・アン・ロンドー',bpm=100,meter=[4,4],writtenBars=100,beats=402,sourceId=1500,form=[[0,402]],formName='All written-out rondo returns; this edition has no initial repeat sign.',ending='2-beat pickup + 100 full bars; final2-beat spacer retained.'),
 dict(key='gigue1006a',file='bwv-1006a_7g',name='Gigue',japanese='ジーグ',bpm=100,meter=[6,8],writtenBars=32,beats=194,sourceId=1499,form=[[0,48.5],[0,48.5],[48.5,97],[48.5,97]],formName='A A B B: 0.5-beat pickup + 16 full bars in each section.',ending='Edition closing half-beat spacers retained in each section; final note ends193.5.')
]

def expand(raw,form):
 result=[];offset=0
 for start,end in form:
  section=[e for e in raw if start<=e[0]<end]
  if not section or any(a+d>end+1e-8 for a,p,d in section):raise ValueError('Section boundary cuts a source note')
  result.extend([[offset+(a-start),p,d] for a,p,d in section]);offset+=end-start
 return result,offset

def compile_midi(executable):
 with tempfile.TemporaryDirectory() as directory:
  for p in PIECES:
   original=SOURCES/(p['file']+'.ly')
   text=subprocess.run([str(Path(executable).with_name('convert-ly')),str(original)],capture_output=True,text=True,check=True).stdout
   text,n=re.subn(r'\\midi\s*\{',lambda _: '\\midi { '+VOICE_MIDI,text);assert n==1
   # Source instrument-name typo affects only MIDI program, never music.
   if p['key']=='gavotte1006a':
    assert text.count('"acoustic guitar nylon"')==1
    text=text.replace('"acoustic guitar nylon"','"acoustic guitar (nylon)"')
   for unfold in [False,True]:
    name=p['file']+('-full' if unfold else '')
    music=text.replace('\\melody  }','\\unfoldRepeats \\melody  }') if unfold else text
    tmp=Path(directory)/(name+'.ly');tmp.write_text(music)
    subprocess.run([executable,'-dno-print-pages','-dbackend=null','-o',str(SOURCES/name),str(tmp)],check=True)

def build():
 songs,manifest={},[]
 for p in PIECES:
  raw=read_notes((SOURCES/(p['file']+'.midi')).read_bytes());events,end=expand(raw,p['form']);assert end==p['beats']
  full=read_notes((SOURCES/(p['file']+'-full.midi')).read_bytes())
  assert len(events)==len(full) and all(p==q and abs(a-b)<1e-9 and abs(d-e)<1e-9 for (a,p,d),(b,q,e) in zip(events,full)), 'Independent LilyPond repeat expansion must match (floating triplet tolerance)'
  events=full
  events=[[a,pitch-12,d] for a,pitch,d in events]
  source=dict(credit='J. S. Bach / guitar edition Hajo Dezelski / Mutopia (2008), after BGA 1879 vol.42',license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',url=f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={p['sourceId']}",modifications='Complete individual BWV1006a guitar-edition movement. '+p['formName']+' convert-ly/LilyPond2.24.4; separate voices. All MIDI notes/holds retained, written pitches -12 for guitar real pitch. Fixed audition tempo; ornaments/dynamics/fermata not performed. MIDI program-name typo corrected for Gavotte only; source bytes unchanged.',pitch='E major retained; written guitar register lowered12 semitones (notation correction, not reuse of BWV1006 violin data). Standard tuning range, but string/hand feasibility not guaranteed; see fingering audit. No notes removed to hide conflicts; no physical tuning changes.',terms='Derived score data CC BY-SA 3.0; retain attribution, license and changes; share adaptations under the same license. Application code separate.',endingStatus=p['ending'])

  warning={'prelude1006a':' Conservative fret-span4 screen fails at beat111.75 (overlapping unisons).','loure1006a':' Conservative fret-span4 screen fails at beat24 (overlapping unisons).','gavotte1006a':' Necessary string/span checks pass; fingers/barres/hand motion remain unverified.','gigue1006a':' Conservative fret-span4 screen fails at beat118.5 (overlapping unisons).'}[p['key']]
  source['pitch']+=warning
  assert all(len(v)<=500 for v in source.values())
  title='J. S. Bach · BWV 1006a — '+p['name']
  songs[p['key']]=dict(score=dict(title=title,bpm=p['bpm'],meter=p['meter'],endBeat=end,events=events),label=title,option=p['name']+'（'+p['japanese']+'）',edition='全楽章・ギター実音・運指未検証／'+('反復あり・版の節末休止を保持' if len(p['form'])>1 else '記譜どおり'),source=source)

  manifest.append({**p,'source':source,'rawNotes':len(raw),'notes':len(events),'noteEndBeats':max(a+d for a,p,d in events),'pitchRange':[min(e[1] for e in events),max(e[1] for e in events)],'tempoBasis':'fixed audition choice, no source tempo','pitchShift':-12,'lilypondUrl':'https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/'+'BachJS/BWV1006a/'+p['file']+'/'+p['file']+'.ly','sha256':{p['file']+ext:hashlib.sha256((SOURCES/(p['file']+ext)).read_bytes()).hexdigest() for ext in ['.ly','.midi','-full.midi']}})
 (ROOT/'synth-demo/bwv1006a-complete.js').write_text('// Generated by import_bwv1006a_complete.py. Score data CC BY-SA 3.0, Hajo Dezelski guitar edition; application code separate.\nconst bwv1006aComplete = '+json.dumps(songs,ensure_ascii=False,separators=(',',':')).replace('],[','],\n[')+';\n')
 (SOURCES/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print([(m['key'],m['notes'],m['beats'],m['pitchRange']) for m in manifest])
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--lilypond');args=parser.parse_args()
 if args.lilypond:compile_midi(args.lilypond)
 build()
