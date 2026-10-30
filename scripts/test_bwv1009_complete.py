"""Source-faithful cello range, complete forms/voices and final rests."""
import unittest,json,hashlib
from import_bwv1009_complete import ROOT,SOURCES,PIECES,expand
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
class CompleteTests(unittest.TestCase):
 def test_source_forms_and_endings(self):
  songs=json.loads((ROOT/'synth-demo/bwv1009-complete.js').read_text().split('const bwv1009Complete = ')[1].rstrip(';\n'))
  expected={'prelude1009':(1007,1007,264,264,262,67,19),'allemande1009':(486,972,96,192,191.75,67,24),'courante1009':(495,990,252,504,503.5,64,20),'sarabande1009':(217,434,72,144,144,67,14),'gigue1009':(523,1046,162,324,324,67,8)}
  for m in json.loads((SOURCES/'manifest.json').read_text()):
   rawdata=(SOURCES/(m['name']+'-raw.midi')).read_bytes();raw=read_notes(rawdata)
   data=(SOURCES/(m['name']+'-full.midi')).read_bytes();full=read_notes(data);manual,end=expand(raw,m['form']);e=songs[m['key']]['score']['events']
   self.assertEqual(full,manual);self.assertEqual(e,full)
   self.assertEqual((len(raw),len(e),max(track_ends(rawdata)),end,max(a+d for a,p,d in e),max(p for a,p,d in e),sum(p<40 for a,p,d in e)),expected[m['key']])
   self.assertEqual(min(p for a,p,d in e),36);self.assertEqual(max(track_ends(data)),end)
   self.assertEqual(songs[m['key']]['score']['bpm'],m['bpm'])
   if m['name']!='prelude':
    firstdata=(SOURCES/(m['name']+'-first.midi')).read_bytes();boundary=m['form'][0][1]
    self.assertEqual(max(track_ends(firstdata)),boundary)
    self.assertEqual(read_notes(firstdata),[e for e in raw if e[0]<boundary])
   for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
   for value in m['source'].values():self.assertLessEqual(len(value),500)
   self.assertEqual(m['source']['license'],'Public Domain');self.assertIn('NOT a guitar arrangement',m['source']['pitch'])
  p=songs['prelude1009']['score']['events'];self.assertEqual(p[:3],[[0,60,.5],[.5,59,.25],[.75,57,.25]])
  for key,beat,duration in [('prelude1009',261,1),('allemande1009',190.75,1),('courante1009',501.5,2),('sarabande1009',142,2),('gigue1009',323,1)]:
   self.assertEqual([e for e in songs[key]['score']['events'] if e[0]==beat],[[beat,p,duration] for p in [36,43,52,60]])
  for key,ends,gap in [('prelude1009',[264],2),('allemande1009',[48,96,144,192],.25),('courante1009',[120,240,372,504],.5)]:
   for end in ends:self.assertFalse(any(a<end and a+d>end-gap+1e-9 for a,p,d in songs[key]['score']['events']))
  self.assertEqual(songs['courante1009']['score']['bpm'],70*3)
  self.assertEqual(songs['gigue1009']['score']['bpm'],65*1.5)
 def test_cut_guard(self):
  with self.assertRaises(ValueError):expand([[0,60,2]],[[0,1]])
if __name__=='__main__':unittest.main()
