"""Pinned source voices, real-pitch witnesses, complete repeats/DC and rest boundaries."""
import unittest,json,hashlib
from import_repertoire_batch6 import ROOT,SOURCES,expand
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
class Batch6Tests(unittest.TestCase):
 def test_performed_forms(self):
  songs=json.loads((ROOT/'synth-demo/repertoire-batch6.js').read_text().split('const repertoireBatch6 = ')[1].rstrip(';\n'))
  expected={'tarrega_adelita':(131,313,48,120,119,40,76),'aguado3_1':(325,763,72,168,167.5,40,72),'carcassi60_2':(413,689,96,160,159,40,77)}
  for m in json.loads((SOURCES/'manifest.json').read_text()):
   data=(SOURCES/(m['file']+'.midi')).read_bytes();raw=read_notes(data);events,end=expand(raw,m['form']);ev=songs[m['key']]['score']['events']
   self.assertEqual(ev,events);self.assertEqual((len(raw),len(ev),max(track_ends(data)),end,max(a+d for a,p,d in ev),min(e[1] for e in ev),max(e[1] for e in ev)),expected[m['key']])
   self.assertTrue(all(e[2]>=1/128 for e in ev))
   offset=0
   for a,b in m['form']:
    original=[e for e in raw if a<=e[0]<b];performed=[e for e in ev if offset<=e[0]<offset+b-a]
    self.assertEqual(performed,[[t-a+offset,p,d] for t,p,d in original]);offset+=b-a
   for f,h in m['sha256'].items():self.assertEqual(hashlib.sha256((SOURCES/f).read_bytes()).hexdigest(),h)
   for value in m['source'].values():self.assertLessEqual(len(value),500)
  a=songs['tarrega_adelita']['score']['events'];self.assertEqual(a[:2],[[0,40,3],[0,76,.5]]);self.assertIn([118,40,1],a)
  g=songs['aguado3_1']['score']['events'];self.assertEqual(g[0],[0,48,.5]);self.assertEqual(g[1][1],60)
  self.assertEqual([e for e in g if e[0]==166.5],[[166.5,48,1],[166.5,52,1],[166.5,60,1]])
  c=songs['carcassi60_2']['score']['events'];self.assertEqual(c[:2],[[0,45,.25],[0,45,2]]);self.assertEqual([e for e in c if e[0]==158],[[158,57,1],[158,57,1]])
  self.assertEqual(120,40*3);self.assertEqual(168,112*1.5);self.assertEqual(160,40*4)
 def test_source_navigation_and_cut_guard(self):
  pins={"adelita.ly":"4813dec9c4d97f36d8db88968f2e82276839ec741e8f66bf23b936f581c9dc21","aguado-op03n01.ly":"fad09a204ecbcd34c6c31c3c898de1564fd68fc320529632328fa11660347e15","carcassi-op60-02.ly":"cb7ea279ee2edd10f5962e5baa98fdf8a9f722a32cacd89c60919b48928447e7"}
  for name,sha in pins.items():self.assertEqual(hashlib.sha256((SOURCES/name).read_bytes()).hexdigest(),sha)
  a=(SOURCES/'adelita.ly').read_text();self.assertIn('D.C. al Fine',a);self.assertIn('"Fine"',a)
  g=(SOURCES/'aguado-op03n01.ly').read_text();self.assertIn('Fine.',g);self.assertIn('D. C.',g)
  with self.assertRaises(ValueError):expand([[0,60,2]],[[0,1]])
if __name__=='__main__':unittest.main()
