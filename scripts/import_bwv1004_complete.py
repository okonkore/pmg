"""Remaining four BWV1004 movements; licensed violin editions, deliberate octave down."""
import argparse,hashlib,json,re,subprocess,tempfile
from pathlib import Path
from import_bwv1012 import read_notes
from import_repertoire_batch4 import VOICE_MIDI
from import_bwv1006a_complete import expand
ROOT=Path(__file__).resolve().parents[1];SOURCES=ROOT/'scripts/score-sources/bwv1004-complete'
PIECES=[
 dict(key='allemande1004',file='bwv-1004_1',name='Allemande',jp='アルマンド',variable='melody',meter=[4,4],bpm=84,id=1423,credit='Hajo Dezelski',year=2010),
 dict(key='courante1004',file='bwv-1004_2',name='Courante',jp='クーラント',variable='melody',meter=[3,4],bpm=108,id=1424,credit='Hajo Dezelski',year=2008),
 dict(key='sarabanda1004',file='bwv-1004_3_sarabanda',name='Sarabanda',jp='サラバンド',variable='sarabanda',meter=[3,4],bpm=60,id=1427,credit='Benjamin D. Esham',year=2008),
 dict(key='giga1004',file='bwv-1004_4_giga',name='Giga',jp='ジーグ',variable='giga',meter=[12,8],bpm=108,id=1428,credit='Benjamin D. Esham',year=2008)
]
def mark_repeats(text,p):
 # convert-ly modernizes graphical bar spellings; only temporary input is changed.
 if p['key']=='sarabanda1004':
  assert text.count('\\bar ":|."')==2
  for token in ['<d f>4 bes','<d a\'>4 g']:
   assert text.count(token)==1;text=text.replace(token,'\\repeat volta 2 { '+token)
  text=text.replace('\\bar ":|."','}')
 if p['key']=='giga1004':
  assert text.count('\\bar ":..:"')==1 and text.count('\\bar ":|."')==1
  text=text.replace('\\partial 8','\\repeat volta 2 { \\partial 8').replace('\\bar ":..:"','}').replace('\\bar ":|."','}')
 return text
def compile_midi(executable):
 with tempfile.TemporaryDirectory() as directory:
  for p in PIECES:
   text=subprocess.run([str(Path(executable).with_name('convert-ly')),str(SOURCES/(p['file']+'.ly'))],capture_output=True,text=True,check=True).stdout
   # Legacy beaming Scheme is engraving-only and unsupported by modern LilyPond.
   if p['key']=='sarabanda1004':
    text,n=re.subn(r'^.*(?:revert-auto-beam-setting|override-auto-beam-setting).*\n','',text,flags=re.M);assert n==10
   text,n=re.subn(r'\\midi\s*\{',lambda _: '\\midi { '+VOICE_MIDI,text);assert n==1
   for mode in ['raw','full']+(['internal'] if p['key']=='sarabanda1004' else []):
    music=mark_repeats(text,p) if mode=='full' else text
    if mode!='raw':
     if p['variable']=='melody':music=music.replace('\\melody  }','\\unfoldRepeats \\melody  }')
     else:
      target='\\score {\n\t\\'+p['variable'];assert target in music;music=music.replace(target,'\\score {\n\t\\unfoldRepeats \\'+p['variable'])
    f=Path(directory)/(p['file']+'-'+mode+'.ly');f.write_text(music)
    subprocess.run([executable,'-dno-print-pages','-dbackend=null','-o',str(SOURCES/(p['file']+'-'+mode)),str(f)],check=True)
FORMS=[[[0,64.25],[0,64.25],[64.25,128.5],[64.25,128.5]],[[0,72.25],[0,72.25],[72.25,162.5],[72.25,162.5]],[[0,24],[0,24],[24,27],[27,69],[69,75],[27,69],[75,78],[78,90]],[[0,120],[0,120],[120,240],[120,240]]]
def build():
 from audit_bwv1006a_fingering import screen
 from test_repertoire_batch2 import track_ends
 songs={};manifest=[]
 for p,form in zip(PIECES,FORMS):
  raw=read_notes((SOURCES/(p['file']+'-raw.midi')).read_bytes());full=read_notes((SOURCES/(p['file']+'-full.midi')).read_bytes())
  manual,end=expand(raw,form);manual.sort()
  assert len(manual)==len(full) and all(p==q and abs(a-b)<1e-8 and abs(d-e)<1e-8 for (a,p,d),(b,q,e) in zip(manual,full)),p['key']
  assert max(track_ends((SOURCES/(p['file']+'-full.midi')).read_bytes()))==end
  events=[[a,n-12,d] for a,n,d in full];audit=screen(events);span=screen(events,4)
  ending={'allemande1004':'32 written 4/4 bars plus two quarter-beat pickups; AABB=257 quarter beats. Final half-beat rest/spacer retained.', 'courante1004':'54 written 3/4 bars plus two quarter-beat pickups; AABB=325 quarter beats. Final quarter-beat spacer retained.', 'sarabanda1004':'A(8 bars) twice, B lead(1), core(14), first ending(2), core(14), second ending(1), coda(4): 52 performed 3/4 bars,156 beats.', 'giga1004':'40 written 12/8 bars including complementary pickups/closing bars; both20-bar halves repeated:480 quarter beats.'}[p['key']]
  source=dict(credit=f"J. S. Bach / violin engraving {p['credit']} / Mutopia ({p['year']}); BGA 1879 vol.27.1",url=f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={p['id']}",license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',modifications='Complete violin edition, all voices/holds retained; LilyPond2.24.4 separate-voice MIDI. All repeat signs unfolded, including graphical signs in Sarabanda/Giga and Sarabanda alternative endings. Entire sounding score -12 semitones; not guitar notation correction. Ornaments/dynamics/fermata not realized. '+('Source MIDI quarter tempo retained.' if p['key'] in ['sarabanda1004','giga1004'] else 'Fixed audition tempo; none specified in source.'),pitch=f"D minor retained; violin MIDI {min(n for a,n,d in full)}-{max(n for a,n,d in full)} shifted -12 to {min(n for a,n,d in events)}-{max(n for a,n,d in events)}. Standard6-string range. Necessary held-string check: {audit['passNecessaryCheck']}; conservative fret-span4: {span['passNecessaryCheck']}. Fingers/barres/hand motion unverified; this is octave-down audition, not a completed guitar arrangement. No tuning changes.",terms='Derived score data CC BY-SA 3.0; retain attribution, license and changes; share adaptations under the same license. Application code separate.',endingStatus=ending)
  assert all(len(v)<=500 for v in source.values())
  title='J. S. Bach · BWV 1004 — '+p['name']
  songs[p['key']]=dict(score=dict(title=title,bpm=p['bpm'],meter=p['meter'],endBeat=end,events=events),label=title,option=p['name']+'（'+p['jp']+'）',edition='全楽章・原ヴァイオリン譜−1oct・反復あり・運指未検証',source=source)
  files=[p['file']+ext for ext in ['.ly','-raw.midi','-full.midi']]
  if p['key']=='sarabanda1004':files.append(p['file']+'-internal.midi')
  manifest.append({**p,'form':form,'notes':len(events),'rawNotes':len(raw),'endBeat':end,'noteEndBeat':max(a+d for a,n,d in events),'pitchRange':[min(n for a,n,d in events),max(n for a,n,d in events)],'source':source,'fingering':audit,'span4':span,'lilypondUrl':f"https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/BachJS/BWV1004/{p['file']}/{p['file']}.ly",'sha256':{f:hashlib.sha256((SOURCES/f).read_bytes()).hexdigest() for f in files}})
 (ROOT/'synth-demo/bwv1004-complete.js').write_text('// Generated by import_bwv1004_complete.py. Score data CC BY-SA3.0; individual attribution below.\nconst bwv1004Complete = '+json.dumps(songs,ensure_ascii=False,separators=(',',':')).replace('],[','],\n[')+';\n')
 (SOURCES/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print([(m['key'],m['notes'],m['endBeat'],m['fingering'],m['span4']) for m in manifest])
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--lilypond');args=parser.parse_args()
 if args.lilypond:compile_midi(args.lilypond)
 build()
