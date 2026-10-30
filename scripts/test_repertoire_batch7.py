"""Source pins, full repeated forms, octave witnesses and explicit silent endings."""
import unittest,json,hashlib
from import_repertoire_batch7 import ROOT,SOURCES,expand
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
class Batch7Tests(unittest.TestCase):
 def test_complete_edition(self):
  songs=json.loads((ROOT/'synth-demo/repertoire-batch7.js').read_text().split('const repertoireBatch7 = ')[1].rstrip(';\n'))
  expected={'menuet1006a':(235,470,102,204,204),'menuet2_1006a':(246,492,96,192,192),'bourree1006a':(356,712,146,292,291)}
  for m in json.loads((SOURCES/'manifest.json').read_text()):
   data=(SOURCES/(m['file']+'.midi')).read_bytes();raw=read_notes(data);events,end=expand(raw,m['form']);events=[[a,p-12,d] for a,p,d in events]
   self.assertEqual(events,songs[m['key']]['score']['events'])
   self.assertEqual((len(raw),len(events),max(track_ends(data)),end,max(a+d for a,p,d in events)),expected[m['key']])
   self.assertEqual((min(e[1] for e in events),max(e[1] for e in events)),(40,71))
   for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
   for v in m['source'].values():self.assertLessEqual(len(v),500)
  self.assertEqual(songs['menuet1006a']['score']['events'][:2],[[0,64,1],[0,68,1]])
  self.assertEqual(songs['menuet2_1006a']['score']['events'][:3],[[0,52,1],[0,56,1],[0,59,1]])
  b=songs['bourree1006a']['score']['events'];self.assertEqual(b[:2],[[0,40,1],[0,59,1]])
  for boundary in [65,130,211,292]:
   self.assertFalse(any(a<boundary and a+d>boundary-1 for a,p,d in b),'Source final silent quarter retained')
  self.assertEqual([e for e in b if e[0]==288][0],[288,40,3])
  for key,pitches in [('menuet1006a',[40,52,56,59,64]),('menuet2_1006a',[40,56,59,64])]:
   end=songs[key]['score']['endBeat'];self.assertEqual([p for a,p,d in songs[key]['score']['events'] if a==end-3],pitches)
 def test_cut_guard(self):
  with self.assertRaises(ValueError):expand([[0,60,2]],[[0,1]])
if __name__=='__main__':unittest.main()
