"""Exact source, full voice accounting, sounding pitch and performed-form checks."""
import unittest,json,hashlib
from import_repertoire_batch5 import ROOT,SOURCES
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
class Batch5Tests(unittest.TestCase):
 def test_sources_and_events(self):
  expected={'sor35_13':(368,64,64,41,67),'giuliani50_18':(180,32,33,42,67),'carcassi60_9':(836,247,248,40,76)}
  pins={'sorf_op35_no13.ly':'665771bbda69b3c7943cdacd2a6e3a03a2be017d3e408725dab1908282660d19','giuliani-op50n18.ly':'731dee9b646bd541f66154031a163a55f7c97c99732ea0df9078fdf4fda68c27','carcassi-op60-09.ly':'c14ffb32944ddc2690a90b8cf429abfb9b10ffec5858c356b5d55260feb77387'}
  songs=json.loads((ROOT/'synth-demo/repertoire-batch5.js').read_text().split('const repertoireBatch5 = ')[1].rstrip(';\n'))
  for m in json.loads((SOURCES/'manifest.json').read_text()):
   d=(SOURCES/(m['file']+'.midi')).read_bytes();ev=songs[m['key']]['score']['events']
   self.assertEqual(ev,[[a,n+m['shift'],t] for a,n,t in read_notes(d)])
   self.assertEqual((len(ev),max(a+t for a,n,t in ev),m['beats'],min(e[1] for e in ev),max(e[1] for e in ev)),expected[m['key']])
   self.assertEqual(max(track_ends(d)),m['beats'])
   for f,sha in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),sha)
   for v in m['source'].values():self.assertLessEqual(len(v),500)
  for f,sha in pins.items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),sha)
  s=songs['sor35_13']['score']['events'];self.assertEqual(s[:3],[[0,48,.25],[0,48,2],[0,64,1]]) # C3 unison voices, E4 melody
  self.assertIn([62,48,2],s) # final bass holds through upper-voice rest
  g=songs['giuliani50_18']['score']['events'];self.assertEqual(g[:2],[[0,43,.5],[0,59,.25]]) # written G3/B4 -> sounding G2/B3
  self.assertEqual([e[1] for e in g if e[0]==31],[43,47,50,55,59,67]);self.assertTrue(all(e[0]+e[2]<=32 for e in g))
  c=songs['carcassi60_9']['score']['events']
  def section(a,b):return [[at-a,n,t] for at,n,t in c if a<=at<b]
  self.assertEqual(section(0,32),section(108,140));self.assertEqual(section(0,32),section(216,248));self.assertEqual(section(32,108),section(140,216))
  self.assertEqual(248,(8+19+8+19+8)*4);self.assertEqual([e for e in c if e[0]==246],[[246,45,1],[246,57,1]])
  self.assertEqual(c[:2],[[0,45,2],[0,60,.25]]) # sounding A2 bass, C4 chromatic neighbor
  self.assertIn('Allegretto grazioso',(SOURCES/'carcassi-op60-09.ly').read_text())
  self.assertIn('make-moment 120 4',(SOURCES/'carcassi-op60-09.ly').read_text())
if __name__=='__main__':unittest.main()
