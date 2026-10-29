"""Full-score checkpoints, track ends (including silent rests), and source integrity."""
import hashlib
import json
import unittest
from import_bwv1012 import read_notes
from import_repertoire_batch2 import ROOT, SOURCES


def track_ends(data):
    """Independently read MIDI EOT times, not last note-offs."""
    division = int.from_bytes(data[12:14], 'big')
    offset, ends = 14, []
    while offset < len(data):
        assert data[offset:offset+4] == b'MTrk'
        size = int.from_bytes(data[offset+4:offset+8], 'big')
        track = data[offset+8:offset+8+size]
        offset += 8+size
        pos = tick = 0
        running = None
        def vlq():
            nonlocal pos
            value = 0
            while True:
                byte = track[pos]; pos += 1
                value = (value << 7) | (byte & 127)
                if byte < 128: return value
        while pos < len(track):
            tick += vlq()
            status = track[pos]
            if status & 128: pos += 1
            else: status = running
            if status == 255:
                kind = track[pos]; pos += 1
                length = vlq(); pos += length
                if kind == 47: ends.append(tick/division)
            elif status in (240,247):
                length = vlq(); pos += length
            else:
                running = status
                pos += 1 if status >> 4 in (12,13) else 2
    return ends


class Batch2Tests(unittest.TestCase):
    def setUp(self):
        self.songs = json.loads((ROOT/'synth-demo/repertoire-batch2.js').read_text().split('const repertoireBatch2 = ')[1].rstrip(';\n'))
        self.manifest = json.loads((SOURCES/'manifest.json').read_text())

    def test_complete_data_and_sources(self):
        expected = {'sor35_17':(265,128,129,40,69,32,1,4,0), 'sor6_11':(1066,346,348,40,72,87,0,4,0), 'bourree1009':(191,112,112,36,65,28,1,3,2)}
        self.assertEqual(set(self.songs),set(expected))
        for m in self.manifest:
            with self.subTest(key=m['key']):
                song = self.songs[m['key']]; score = song['score']; events = score['events']
                data = (SOURCES/(m['file']+'.midi')).read_bytes()
                self.assertEqual(events,read_notes(data))
                self.assertEqual((len(events),max(a+d for a,_,d in events),score['endBeat'],min(n[1] for n in events),max(n[1] for n in events),m['bars'],m['pickup'],m['final'],sum(n[1]<40 for n in events)),expected[m['key']])
                self.assertEqual(set(track_ends(data)),{score['endBeat']})
                self.assertEqual(score['endBeat'],m['pickup']+(m['bars']-1)*4+m['final'])
                self.assertEqual(m['midiPitchShift'],0)
                for name,sha in m['sha256'].items():
                    self.assertEqual(hashlib.sha256((SOURCES/name).read_bytes()).hexdigest(),sha)
                for field in ['credit','license','licenseUrl','url','modifications','pitch','terms']:
                    self.assertTrue(song['source'][field]); self.assertLessEqual(len(song['source'][field]),500)
                self.assertEqual(song['source']['license'],'Public Domain' if m['key']=='bourree1009' else 'CC BY-SA 4.0')

    def test_score_landmarks_and_tuplets(self):
        sor35=self.songs['sor35_17']['score']['events']
        self.assertEqual(sor35[:2],[[0,57,1],[1,66,1.5]]) # A3 pickup, F#4 dotted quarter
        self.assertEqual(sor35[-1],[127,50,1]) # D3 ends before the final quarter rest
        sor6=self.songs['sor6_11']['score']['events']
        self.assertEqual(sor6[:4],[[0,40,4],[1/3,52,1/3],[2/3,55,1/3],[1,59,1]])
        self.assertEqual(sor6[-2:],[[344,40,2],[344,64,2]]) # E2/E4, then half rest
        self.assertEqual(sum(abs(n[2]-1/3)<1e-12 for n in sor6),700)
        bach=self.songs['bourree1009']['score']['events']
        self.assertEqual(bach[:3],[[0,52,.5],[.5,53,.5],[1,55,1]]) # original cello E3/F3 pickup
        self.assertEqual([n for n in bach if n[0]==5],[[5,43,1],[5,50,1],[5,59,1]])
        self.assertEqual(bach[-2:],[[109,36,3],[109,48,3]]) # complete Bourree I final C octaves

if __name__=='__main__': unittest.main()
