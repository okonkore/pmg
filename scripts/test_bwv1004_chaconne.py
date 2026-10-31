"""Full edition and four-voice preservation; explicit non-realization of arpeggio text."""
import unittest,json,hashlib
from import_bwv1004_chaconne import ROOT,SOURCES
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
from audit_bwv1006a_fingering import screen
class ChaconneTests(unittest.TestCase):
 def test_full_four_voices_and_transposition(self):
  m=json.loads((SOURCES/'manifest.json').read_text());data=(SOURCES/'chaconne.midi').read_bytes();raw=read_notes(data)
  song=json.loads((ROOT/'synth-demo/bwv1004-chaconne.js').read_text().split('const bwv1004Chaconne = ')[1].rstrip(';\n'))['chaconne1004'];e=song['score']['events']
  self.assertEqual(len(raw),3123);self.assertEqual(e,[[a,p-12,d] for a,p,d in raw]);self.assertEqual(max(track_ends(data)),770)
  voices=[]
  for i,count in enumerate([2085,306,117,615],1):
   d=(SOURCES/f'voice{i}.midi').read_bytes();v=read_notes(d);self.assertEqual(len(v),count);self.assertEqual(max(track_ends(d)),770)
   voices.extend([[a+(2 if i==3 else 0),p,d] for a,p,d in v])
  self.assertEqual(sorted(voices),raw)
  self.assertEqual((min(n[1] for n in e),max(n[1] for n in e)),(43,79))
  self.assertEqual(e[:3],[[0,50,2],[0,53,2],[0,57,1.5]])
  self.assertEqual([n for n in e if n[0]==264],[[264,50,2],[264,53,2],[264,69,2]])
  self.assertEqual([n for n in e if n[0]==599],[[599,50,1],[599,66,1]])
  self.assertEqual(e[-2:],[[767,50,3],[767,50,3]])
  self.assertEqual(song['score']['endBeat'],2+256*3)
  self.assertEqual(max(a+d for a,p,d in e),770)
  for a,b in [(0,395),(395,623),(623,770)]:self.assertTrue(any(a<=x[0]<b for x in e))
  for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
  for v in m['source'].values():self.assertLessEqual(len(v),500)
  self.assertTrue(screen(e)['passNecessaryCheck']);self.assertEqual(screen(e,4)['firstFailureBeat'],491.5)
 def test_edition_marks(self):
  s=(SOURCES/'bwv-1004_5.ly').read_text();self.assertNotIn('\\repeat',s);self.assertEqual(s.count('\\key d \\major'),4)
  self.assertEqual(s.count('markup { arpeggio }'),2);self.assertIn('\\partial 2 \\melody',s);self.assertIn('s2 | % 1',s)
  self.assertIn('Creative Commons Attribution-ShareAlike 3.0',s)
if __name__=='__main__':unittest.main()
