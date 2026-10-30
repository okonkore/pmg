"""Full seven-movement edition completion, repeat expansion and honest limitations."""
import unittest,json,hashlib
from import_bwv1006a_complete import ROOT,SOURCES,PIECES,expand
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
from audit_bwv1006a_fingering import screen
class CompleteTests(unittest.TestCase):
 def test_events_and_edition(self):
  songs=json.loads((ROOT/'synth-demo/bwv1006a-complete.js').read_text().split('const bwv1006aComplete = ')[1].rstrip(';\n'))
  expected={'prelude1006a':(1731,1731,417,417,417,76),'loure1006a':(329,658,147,294,292.5,73),'gavotte1006a':(849,849,402,402,400,74),'gigue1006a':(431,862,97,194,193.5,71)}
  for m in json.loads((SOURCES/'manifest.json').read_text()):
   rawdata=(SOURCES/(m['file']+'.midi')).read_bytes();raw=read_notes(rawdata)
   full=read_notes((SOURCES/(m['file']+'-full.midi')).read_bytes());manual,end=expand(raw,m['form'])
   self.assertEqual(len(full),len(manual))
   for a,b in zip(full,manual):
    self.assertEqual(a[1],b[1]);self.assertAlmostEqual(a[0],b[0],places=9);self.assertAlmostEqual(a[2],b[2],places=9)
   e=songs[m['key']]['score']['events'];self.assertEqual(e,[[a,p-12,d] for a,p,d in full])
   self.assertEqual((len(raw),len(e),max(track_ends(rawdata)),end,max(a+d for a,p,d in e),max(p for a,p,d in e)),expected[m['key']])
   self.assertEqual(min(p for a,p,d in e),40)
   self.assertEqual(max(track_ends((SOURCES/(m['file']+'-full.midi')).read_bytes())),end)
   for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
   for v in m['source'].values():self.assertLessEqual(len(v),500)
   self.assertTrue(screen(e)['passNecessaryCheck'])
   self.assertEqual(screen(e,4)['firstFailureBeat'],{'prelude1006a':111.75,'loure1006a':24,'gavotte1006a':None,'gigue1006a':118.5}[m['key']])
  p=songs['prelude1006a']['score']['events'];self.assertEqual(p[:2],[[0,40,1],[.5,76,.25]]);self.assertEqual(p[-1],[414,40,3])
  l=songs['loure1006a']['score']['events'];self.assertEqual(l[:2],[[0,59,.5],[.5,71,1]]);self.assertEqual([p for a,p,d in l if a==291],[40,56,59,64])
  g=songs['gavotte1006a']['score']['events'];self.assertEqual(g[:2],[[0,52,2],[0,59,1]]);self.assertEqual([p for a,p,d in g if a==398],[40,56,64])
  j=songs['gigue1006a']['score']['events'];self.assertEqual(j[0],[0,71,.5]);self.assertEqual([p for a,p,d in j if a==192.5],[40,56,59,64])
  for key,ends,gap in [('loure1006a',[67.5,135,214.5,294],1.5),('gigue1006a',[48.5,97,145.5,194],.5),('gavotte1006a',[402],2)]:
   for end in ends:self.assertFalse(any(a<end and a+d>end-gap+1e-9 for a,p,d in songs[key]['score']['events']))
  # This 1006a edition is NOT the 821-event, 440-beat BWV1006 violin candidate.
  self.assertEqual(len(g),849);self.assertNotIn('\\repeat', (SOURCES/'bwv-1006a_3g.ly').read_text())
 def test_screening_guards(self):
  self.assertFalse(screen([[0,40,2],[1,41,1]])['passNecessaryCheck'])
  self.assertTrue(screen([[0,40,2],[2,41,1]])['passNecessaryCheck'])
  self.assertFalse(screen([[0,40,1]]*7)['passNecessaryCheck'])
  self.assertTrue(screen([[0,40,1],[0,45,1]])['passNecessaryCheck'])
  with self.assertRaises(ValueError):expand([[0,60,2]],[[0,1]])
if __name__=='__main__':unittest.main()
