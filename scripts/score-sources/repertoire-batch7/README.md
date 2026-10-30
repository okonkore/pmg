# BWV 1006a: three individual guitar-edition dance movements

Local candidate against `0f6a6b97e1d56575d9ef6034d26cdfe6b786965b`; 38 existing songs retained byte-for-byte as serialized catalog objects (`checkpoint38.json`). No private MIDI, engine changes, or new UI behavior.

## Rights and source

J. S. Bach; guitar edition/engraving Hajo Dezelski, Mutopia 2008, after Bach-Gesellschaft Edition 1879 volume 42. **This guitar edition and derived score data are CC BY-SA 3.0**, distinct from the public-domain composition and from application code. Preserve attribution, license and modification notices; distribute adaptations under the same license: https://creativecommons.org/licenses/by-sa/3.0/ . Original downloaded LilyPond bytes are retained, including historical links and whitespace. Per-file SHA256 and original URLs are in `manifest.json`. Generated MIDI is the same licensed edition with separate voice tracks.

- Menuet I: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1501
- Menuet II: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1502
- Bourrée: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1498

These related but distinct dances were selected to follow the requested minuets/bourrées preference, without duplicating existing cello-suite movements. The collection is intentionally only these three movements, not a complete suite.

## Musical validation and qualifications

All three headers identify Guitar; the staff also says Laute. Ordinary treble LilyPond pitches are the written guitar register, not already octave-transposed. We lower every note 12 semitones: e.g. Bourrée's written opening bass E3 (52) becomes E2 (40); Menuet I's written G#5/E5 becomes G#4/E4. All three sound within E2–B4 (40–71), with no scordatura indicated. Range is not proof of fingering/playability. No physical guitar settings are changed.

| Movement | Written form / quarter-beat boundaries | Raw/performed notes | Performed end / last note end |
|---|---|---|---|
| Menuet I | 34 bars, 3/4; A 0–24, B 24–102 | 235 / 470 | 204 / 204 |
| Menuet II | 32 bars, 3/4; A 0–48, B 48–96 | 246 / 492 | 192 / 192 |
| Bourrée | edition 4/4; A pickup + 16 bars (0–65), B pickup + 20 bars (65–146) | 356 / 712 | 292 / 291 |

Each is A A B B. Separate Menuet II does not automatically return to Menuet I. Notes, simultaneous voices/unisons, ties, rests and durations are retained. An independent temporary compilation using LilyPond `\unfoldRepeats` matched every manually expanded MIDI event for all three movements. Compilation completed without warnings. Tests pin opening and ending chords, event counts, ranges, boundaries and final rests.

**Bourrée edition qualification:** both sections include a one-quarter pickup **and** a full closing bar ending in `s4`. Thus each repeat contains an extra silent quarter relative to a performance joining complementary pickup/end bars. The edition's literal 65 + 81 quarter beats are retained twice, including silence at 64–65, 129–130, 210–211, 291–292. We neither silently remove these written spacers nor call this a critical/urtext reading. The source metadata and selection summary flag the preserved gaps. This is suitable as an explicitly qualified local edition candidate; an editor may prefer a separately sourced/corrected edition before release.

Trill signs are not realized into alternating pitches. No source tempo is given: quarter=96 for minuets and 120 for Bourrée are fixed audition choices, not claimed historical directions. Dynamics/expressive timing are not modeled by the note-event format; app articulation remains separate.

## Reproduction and verification

```
python scripts/import_repertoire_batch7.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python -m unittest discover -s scripts -p 'test_repertoire_batch*.py'
node --test synth-demo/repertoire*.test.cjs synth-demo/bach-1012.test.cjs synth-demo/catalog-playback.test.cjs
python -m http.server 8770 --bind 127.0.0.1
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch7_browser.cjs
```

Without `--lilypond`, the importer uses the pinned, vendored MIDI; no compiler/network required. Actual browser checks cover 41 options/12 groups, search, loading all three movements, note positions, playback end markers, attribution, exported/edited/imported metadata and persistence. Catalog QA preserves all 38 prior full song objects. Deterministic playback audit schedules all 41 full pieces with the actual app code: standard 520R has no voice steals. Other preset tail/voice limitations are existing engine concerns, not changed here. This is not a real-device, acoustic/listening, or human-fingering verification. No push/deployment performed.
