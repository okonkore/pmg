"""Regression checks for the score converter; no external packages or network."""
import json
from pathlib import Path
import re
import struct
import unittest
from import_bwv1012 import read_notes, SOURCES


def midi(*tracks):
    header = b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), 96)
    return header + b''.join(b'MTrk' + len(t).to_bytes(4, 'big') + t for t in tracks)


class ScoreImportTests(unittest.TestCase):
    def test_chords_rests_tracks_and_running_status(self):
        # Initial rest, two-note chord, velocity-zero note-off, and a later note.
        a = bytes([96, 0x90, 60, 90, 0, 64, 80, 96, 60, 0,
                   0, 0x80, 64, 0, 96, 0x90, 67, 90, 96, 0x80, 67, 0,
                   0, 0xff, 0x2f, 0])
        b = bytes([96, 0x91, 48, 90, 96, 0x81, 48, 0, 0, 0xff, 0x2f, 0])
        self.assertEqual(read_notes(midi(a, b)),
                         [[0, 48, 1], [0, 60, 1], [0, 64, 1], [2, 67, 1]])

    def test_unfinished_notes_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unfinished'):
            read_notes(midi(bytes([0, 0x90, 60, 90, 0, 0xff, 0x2f, 0])))

    def test_existing_gavotte_is_preserved_exactly(self):
        original = (Path(__file__).resolve().parents[1] / 'synth-demo/gavotte.js').read_text()
        existing = json.loads(re.search(r'const gavotteScore = (.*);', original)[1])
        self.assertEqual(read_notes((SOURCES / 'bwv-1012-5-1.mid').read_bytes()), existing['events'])


if __name__ == '__main__':
    unittest.main()
