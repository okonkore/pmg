"""Source pins, independent repeat forms, end rests and sounding octave."""
import unittest,json,hashlib
from import_bwv1004_complete import ROOT,SOURCES,expand
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
class RemainingMovements(unittest.TestCase):
 def test_complete_forms(self):
  songs=json.loads((ROOT/'synth-demo/bwv1004-complete.js').read_text().split('const bwv1004Complete = ')[1].rstrip(';\n'))
  expected=[(1094,257,256.5,[44,74]),(858,325,324.75,[43,74]),(534,156,156,[43,70]),(1816,480,480,[43,74])]
  for m,(count,end,note_end,pitches) in zip(json.loads((SOURCES/'manifest.json').read_text()),expected):
   with self.subTest(m['key']):
    raw=read_notes((SOURCES/(m['file']+'-raw.midi')).read_bytes());manual,length=expand(raw,m['form']);manual.sort()
    song=songs[m['key']];e=song['score']['events'];self.assertEqual(len(e),count);self.assertEqual(length,end);self.assertEqual(song['score']['endBeat'],end)
    self.assertEqual(max(a+d for a,n,d in e),note_end);self.assertEqual([min(n for a,n,d in e),max(n for a,n,d in e)],pitches)
    for (a,n,d),(b,p,t) in zip(manual,e):self.assertEqual(n-12,p);self.assertAlmostEqual(a,b);self.assertAlmostEqual(d,t)
    self.assertEqual(max(track_ends((SOURCES/(m['file']+'-full.midi')).read_bytes())),end)
    for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
    self.assertIn('Creative Commons Attribution-ShareAlike 3.0',(SOURCES/(m['file']+'.ly')).read_text());self.assertIn(m['credit'],song['source']['credit'])
    for v in song['source'].values():self.assertLessEqual(len(v),500)
 def test_sarabanda_alternatives(self):
  internal=read_notes((SOURCES/'bwv-1004_3_sarabanda-internal.midi').read_bytes());full=read_notes((SOURCES/'bwv-1004_3_sarabanda-full.midi').read_bytes())
  manual,end=expand(internal,[[0,24],[0,24],[24,132]]);self.assertEqual(end,156);self.assertEqual(sorted(manual),full)
if __name__=='__main__':unittest.main()
