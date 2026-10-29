"""Independent stable musical checkpoints plus exact MIDI conversion/provenance."""
import hashlib
import json
from pathlib import Path
import unittest
from import_bwv1012 import read_notes
from import_repertoire_batch1 import ROOT, SOURCES

class RepertoireTests(unittest.TestCase):
    def test_import(self):
        data = (ROOT / 'synth-demo/repertoire-batch1.js').read_text()
        songs = json.loads(data.split('const repertoireBatch1 = ', 1)[1].rstrip(';\n'))
        manifest = json.loads((SOURCES / 'manifest.json').read_text())
        expected = {'menuet1007': (134,72,36,64,4), 'menuet2_1007': (126,72,38,63,4), 'sor35_22': (416,143,40,71,0)}
        for m in manifest:
            with self.subTest(key=m['key']):
                song=songs[m['key']]; events=song['score']['events']
                self.assertEqual(events,read_notes((SOURCES/(m['file']+'.midi')).read_bytes()))
                self.assertEqual((len(events),max(a+d for a,_,d in events),min(p for _,p,_ in events),max(p for _,p,_ in events),sum(p<40 for _,p,_ in events)),expected[m['key']])
                self.assertEqual(song['score']['endBeat'],m['scoreBars']*3)
                self.assertEqual(song['score']['meter'],[3,4])
                self.assertIn('反復なし',song['edition'])
                for ext,sha in m['sha256'].items():
                    self.assertEqual(hashlib.sha256((SOURCES/(m['file']+ext)).read_bytes()).hexdigest(),sha)
                for field in ['credit','license','licenseUrl','url','modifications','pitch','terms']:
                    self.assertTrue(song['source'][field])
        # Opening G2/D3/B3; chord in bar 4; final G2/G3 dotted halves.
        one=songs['menuet1007']['score']['events']
        self.assertEqual(one[:3],[[0,43,.5],[.5,50,.5],[1,59,1]])
        self.assertEqual([e for e in one if e[0]==9],[[9,43,2],[9,50,2],[9,59,2]])
        self.assertEqual(one[-2:],[[69,43,3],[69,55,3]])
        two=songs['menuet2_1007']['score']['events']
        self.assertEqual(two[:3],[[0,58,.5],[.5,57,.5],[1,58,.5]])
        self.assertEqual(two[-1],[69,43,3])
        sor=songs['sor35_22']['score']['events']
        self.assertEqual(sor[:3],[[0,47,6],[0,62,.5],[0,62,2]])
        # Distinct melody/accompaniment voices at identical pitch MUST both survive.
        self.assertEqual([e for e in sor if e[0]==141],[[141,47,2],[141,50,2],[141,59,2]])
        self.assertEqual(songs['sor35_22']['score']['endBeat'],144) # final quarter rest
        self.assertEqual(songs['sor35_22']['source']['license'],'CC BY-SA 3.0')

if __name__=='__main__': unittest.main()
