"""Full-piece structure, transposition witnesses and exact source integrity."""
import hashlib
import json
import unittest
from import_bwv1012 import read_notes
from import_repertoire_batch4 import ROOT,SOURCES
from test_repertoire_batch2 import track_ends

SOURCE_HASHES={
 'sor_op1_1.ly':'38a179540a0b6568704073abdee196a4eea68a78e7a3894545624fa6b0a22215',
 'sor_op1_2.ly':'109e3abbcdd31e3eb19ff6c7ffbfb56927c0044e9f93edbb69751244ea4f4ad1',
 'sor_op_1_6.ly':'4e8492532d86f12d063c99a85f4e0bb7a3a2364f977f29fba075f16beffa3e7a',
}


class Batch4Tests(unittest.TestCase):
    def setUp(self):
        self.songs=json.loads((ROOT/'synth-demo/repertoire-batch4.js').read_text().split('const repertoireBatch4 = ')[1].rstrip(';\n'))
        self.manifest=json.loads((SOURCES/'manifest.json').read_text())

    def test_complete_duration_and_all_voices(self):
        expected={'sor1_1':(221,53,54,42,74),'sor1_2':(306,71.5,72,43,71),'sor1_6':(465,159,160,41,77)}
        ends={'sor1_1':{0,54},'sor1_2':{0,71,72},'sor1_6':{142,160}}
        self.assertEqual(set(self.songs),set(expected))
        for m in self.manifest:
            ev=self.songs[m['key']]['score']['events'];data=(SOURCES/(m['file']+'.midi')).read_bytes()
            self.assertEqual(ev,[[a,p+m['shift'],d] for a,p,d in read_notes(data)])
            self.assertEqual((len(ev),max(a+d for a,_,d in ev),m['beats'],min(e[1] for e in ev),max(e[1] for e in ev)),expected[m['key']])
            self.assertEqual(set(track_ends(data)),ends[m['key']])
            beats_per_bar=m['meter'][0]*4/m['meter'][1]
            self.assertEqual(m['beats'],m['pickup']+(m['bars']-1)*beats_per_bar+m['final'])
            self.assertTrue(all(e[2]>=1/128 for e in ev))
            self.assertTrue(any(e[2]<.125 for e in ev),'Retain grace timing')
            for filename,sha in m['sha256'].items():
                self.assertEqual(hashlib.sha256((SOURCES/filename).read_bytes()).hexdigest(),sha)
            for value in m['source'].values():
                if isinstance(value,str):self.assertLessEqual(len(value),500)
        for filename,sha in SOURCE_HASHES.items():
            self.assertEqual(hashlib.sha256((SOURCES/filename).read_bytes()).hexdigest(),sha)

    def test_guitar_sounding_pitch_and_end_rests(self):
        one=self.songs['sor1_1']['score']['events']
        self.assertEqual(one[:3],[[0,43,3],[0,55,.5],[0,59,1]]) # G2/G3/B3, already sounding
        self.assertEqual(one[-2:],[[52,47,1],[52,55,1]]) # G chord then quarter rest
        two=self.songs['sor1_2']['score']['events']
        self.assertEqual(two[:4],[[0,62,.5],[.5,55,1],[.5,59,.375],[.875,62,.125]]) # written D5 -> sounding D4
        self.assertEqual(two[-2:],[[71,43,.5],[71,55,.5]]) # final G2/G3 followed by eighth rest
        six=self.songs['sor1_6']['score']['events']
        self.assertEqual(six[:4],[[0,53,2],[0,65,2],[2,57,2],[2,69,2]]) # written F4/F5 -> F3/F4
        self.assertIn([140,41,2],six) # independent low sixth-string F2 in nested voice
        self.assertEqual(six[-3:],[[158,41,1],[158,57,1],[158,65,1]])
        self.assertIn('La 6 \\super e corde en Fa',(SOURCES/'sor_op_1_6.ly').read_text())
        self.assertIn('sixth string F2',self.songs['sor1_6']['source']['pitch'])
        self.assertEqual(self.manifest[2]['tuningHighToLow'],[64,59,55,50,45,41])
        self.assertEqual(self.songs['sor1_2']['score']['bpm'],90) # dotted quarter60


if __name__=='__main__':unittest.main()
