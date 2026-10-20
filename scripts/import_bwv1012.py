"""Convert the vendored Mutopia MIDI scores without third-party dependencies.

Run from any directory: python3 scripts/import_bwv1012.py
MIDI supplies note data only; the browser plays the synthesizer, never MIDI audio.
"""
from collections import defaultdict, deque
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'scripts/score-sources/bwv1012'
# Tempos are fixed audition choices in quarter notes per minute, not source tempi.
MOVEMENTS = [
    ('prelude1012', 'Prélude', 'プレリュード', '1', 1494, 144),
    ('allemande1012', 'Allemande', 'アルマンド', '2', 1503, 36),
    ('courante1012', 'Courante', 'クーラント', '3', 1504, 132),
    ('sarabande1012', 'Sarabande', 'サラバンド', '4', 1505, 72),
    ('gavotte', 'Gavotte I', 'ガヴォット I', '5-1', 1506, 108),
    ('gavotte2', 'Gavotte II', 'ガヴォット II', '5-2', 1507, 108),
    ('gigue1012', 'Gigue', 'ジーグ', '6', 1508, 168),
]


def read_notes(data):
    """Read absolute quarter-note onset/pitch/duration, preserving all tracks."""
    if data[:4] != b'MThd':
        raise ValueError('Missing MIDI header')
    size = int.from_bytes(data[4:8], 'big')
    fmt, tracks, division = struct.unpack('>HHH', data[8:14])
    if fmt not in (0, 1) or not division or division & 0x8000:
        raise ValueError('Expected synchronous PPQN MIDI')
    offset, notes = 8 + size, []
    for _ in range(tracks):
        if data[offset:offset + 4] != b'MTrk':
            raise ValueError('Missing MIDI track')
        size = int.from_bytes(data[offset + 4:offset + 8], 'big')
        track = data[offset + 8:offset + 8 + size]
        if len(track) != size:
            raise ValueError('Truncated MIDI track')
        offset += 8 + size
        pos = tick = 0
        running = None
        active = defaultdict(deque)

        def vlq():
            nonlocal pos
            value = 0
            for _ in range(4):
                byte = track[pos]
                pos += 1
                value = (value << 7) | (byte & 127)
                if byte < 128:
                    return value
            raise ValueError('Invalid MIDI variable-length integer')

        while pos < len(track):
            tick += vlq()
            status = track[pos]
            if status & 128:
                pos += 1
            elif running is not None:
                status = running
            else:
                raise ValueError('Invalid MIDI running status')
            if status == 0xff:
                pos += 1  # meta type
                length = vlq()
                pos += length
                continue
            if status in (0xf0, 0xf7):
                length = vlq()
                pos += length
                running = None
                continue
            if status >= 0xf0:
                raise ValueError('Unsupported MIDI system event')
            running = status
            kind, channel = status >> 4, status & 15
            length = 1 if kind in (0xc, 0xd) else 2
            payload = track[pos:pos + length]
            if len(payload) != length or any(b >= 128 for b in payload):
                raise ValueError('Invalid MIDI channel data')
            pos += length
            if kind not in (0x8, 0x9):
                continue
            pitch, velocity = payload
            key = channel, pitch
            if kind == 0x9 and velocity:
                active[key].append(tick)
            else:
                if not active[key]:
                    raise ValueError('Unmatched MIDI note-off')
                start = active[key].popleft()
                if tick <= start:
                    raise ValueError('Nonpositive note duration')
                notes.append([start / division, pitch, (tick - start) / division])
        if any(active.values()):
            raise ValueError('Unfinished MIDI notes')
    if not notes:
        raise ValueError('Empty score')
    # Trim the initial MIDI setup delay; retain all musical rests and note lengths.
    first = min(n[0] for n in notes)
    return sorted([[at - first, midi, duration] for at, midi, duration in notes])


def build():
    songs, manifest = {}, []
    for key, title, japanese, suffix, source_id, bpm in MOVEMENTS:
        name = f'bwv-1012-{suffix}'
        data = (SOURCES / f'{name}.mid').read_bytes()
        events = read_notes(data)
        if not all(21 <= e[1] <= 108 for e in events):
            raise ValueError(f'{title}: note outside keyboard range')
        end = max(at + duration for at, _, duration in events)
        manifest.append({
            'key': key, 'title': title, 'sourceId': source_id,
            'source': f'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={source_id}',
            'midi': f'https://www.mutopiaproject.org/ftp/BachJS/BWV1012/{name}/{name}.mid',
            'sha256': hashlib.sha256(data).hexdigest(),
            'notes': len(events), 'beats': end, 'bpm': bpm,
        })
        print(f'{title}: {len(events)} notes; {end:g} quarter beats; {end * 60 / bpm:.1f} seconds')
        if key == 'gavotte':
            # Preserve the existing score and its URL/menu key; validate it in tests.
            continue
        songs[key] = {
            'score': {'title': f'J. S. Bach · BWV 1012 — {title}', 'bpm': bpm, 'events': events},
            'label': title, 'edition': '全曲・反復なし',
            'option': f'{title}（{japanese}）',
        }
    header = '''// J. S. Bach, BWV 1012. Engraving: Hajo Dezelski / Mutopia Project, 2008.
// Adapted note events: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/
// Sources and hashes: ../scripts/score-sources/bwv1012/manifest.json
// Generated by scripts/import_bwv1012.py. Fixed audition tempi; repeats omitted.
'''
    (ROOT / 'synth-demo/bach-1012.js').write_text(
        header + 'const bach1012Songs = ' + json.dumps(songs, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (SOURCES / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    build()
