"""Musical checkpoints and exact, source-faithful MIDI import checks."""
import hashlib
import json
import unittest
from import_bwv1012 import read_notes
from import_repertoire_batch3 import ROOT, SOURCES
from test_repertoire_batch2 import track_ends


class Batch3Tests(unittest.TestCase):
    def setUp(self):
        self.songs=json.loads((ROOT/'synth-demo/repertoire-batch3.js').read_text().split('const repertoireBatch3 = ')[1].rstrip(';\n'))
        self.manifest=json.loads((SOURCES/'manifest.json').read_text())

    def test_full_scores_end_rests_and_provenance(self):
        expected={'sor60_8':(81,63,64,43,67,0),'sor60_9':(151,63,64,43,67,0),'sor60_10':(153,65,65,40,67,0),'bourree2_1009':(158,96,96,36,63,1)}
        self.assertEqual(set(self.songs),set(expected))
        for m in self.manifest:
            with self.subTest(key=m['key']):
                song=self.songs[m['key']];score=song['score'];ev=score['events']
                data=(SOURCES/(m['file']+'.midi')).read_bytes()
                self.assertEqual(ev,read_notes(data))
                self.assertEqual((len(ev),max(a+d for a,_,d in ev),score['endBeat'],min(e[1] for e in ev),max(e[1] for e in ev),sum(e[1]<40 for e in ev)),expected[m['key']])
                # Voice routing leaves an empty staff metadata track at tick zero.
                self.assertEqual(set(track_ends(data)),{0,score['endBeat']} if m['key'].startswith('sor') else {score['endBeat']})
                self.assertEqual(score['endBeat'],m['pickup']+(m['bars']-1)*4+m['final'])
                self.assertEqual(m['midiPitchShift'],0)
                for filename,sha in m['sha256'].items():
                    self.assertEqual(hashlib.sha256((ROOT/filename).read_bytes()).hexdigest(),sha)
                self.assertEqual(song['source']['license'],'Public Domain' if m['key'].startswith('bourree') else 'CC BY-SA 3.0')
                for field in ['credit','license','licenseUrl','url','modifications','pitch','terms']:
                    self.assertTrue(song['source'][field]);self.assertLessEqual(len(song['source'][field]),500)
                self.assertEqual(score['bpm'],150 if m['key'].startswith('bourree') else 80)

    def test_notated_landmarks_and_overlapping_voices(self):
        e8=self.songs['sor60_8']['score']['events']
        self.assertEqual(e8[:4],[[0,48,4],[1,55,1],[2,60,2],[2,64,2]])
        self.assertEqual(e8[-2:],[[62,52,1],[62,60,1]]) # E3/C4 followed by final quarter rest
        e9=self.songs['sor60_9']['score']['events']
        # Same E4 belongs to a half-note melody and an eighth-note accompaniment.
        self.assertEqual([e for e in e9 if e[0]==2],[[2,64,.5],[2,64,2]])
        self.assertIn([0,48,4],e9);self.assertEqual(e9[-1],[62,48,1])
        e10=self.songs['sor60_10']['score']['events']
        self.assertEqual(e10[0],[0,55,1]) # G3 quarter pickup, not G4
        self.assertEqual([e for e in e10 if e[0]==1],[[1,67,.5],[1,67,1]])
        self.assertEqual(e10[-1],[63,48,2]) # last full measure's second half
        bach=self.songs['bourree2_1009']['score']['events']
        self.assertEqual(bach[:3],[[0,60,.5],[.5,62,.5],[1,63,1]])
        self.assertEqual(bach[-2:],[[93,36,3],[93,48,3]])
        self.assertEqual(self.songs['bourree2_1009']['score']['meter'],[2,2])
        self.assertIn('return to Bourree I omitted',self.songs['bourree2_1009']['source']['modifications'])


if __name__=='__main__': unittest.main()
