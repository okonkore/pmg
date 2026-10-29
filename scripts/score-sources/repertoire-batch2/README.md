# Repertoire batch 2

Three complete pieces added to published main `1807fc7` (22 existing pieces retained; 25 total). Sources and reuse permissions rechecked on 2026-10-29. Original LilyPond files are retained without edits; generated MIDI is compiled locally, not the published Mutopia MIDI download.

| Key | Piece | Events | Meter | Measures after pickup | Pickup beats | Last measure beats | Total quarter beats | Last note end | Sounding MIDI range |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| sor35_17 | Sor Op.35 No.17 | 265 | 4/4 | 32 | 1 | 4 | 129 | 128 | 40–69, E2–A4 |
| sor6_11 | Sor Op.6 No.11 | 1066 | 4/4 | 87 | 0 | 4 | 348 | 346 | 40–72, E2–C5 |
| bourree1009 | Bach BWV1009 Bourrée I | 191 | 2/2 | 28 | 1 | 3 | 112 | 112 | 36–65, C2–F4 |

Total duration is `pickup + (measures - 1) * 4 + last measure beats`. Explicit score end markers preserve Sor's final quarter rest and half rest. The first sounding event is at time zero, including each pickup. Fixed quarter-note tempi follow the editions' MIDI blocks: 96, 74 and 150 respectively (approximately 81, 282 and 45 seconds).

## Attribution and rights

- **Fernando Sor, Op.35 No.17**: engraving Glen Larsen, © 2014, Mutopia-2014/05/24-1954; source described as N. Simrock, 1924. [Edition/rights](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1954), [original engraving](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/SorF/O35/sorf_op35_no17/sorf_op35_no17.ly).
- **Fernando Sor, Op.6 No.11**: engraving Glen Larsen, © 2016, Mutopia-2016/09/17-2134; source N. Simrock, Berlin, plate 9106. [Edition/rights](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2134), [original engraving](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/SorF/O6/sorf-op6n11/sorf-op6n11.ly).
- Both Sor engravings and the derived MIDI/event score data here are **[CC BY-SA 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)**. Retain attribution, license link and modification notice; share adaptations of this score data under the same license. This is distinct from application code licensing. Per-song metadata retains these notices through the existing editor, copies, persistence and JSON export/import.
- **J. S. Bach, BWV1009 Bourrée I**: engraving Stelios Samelis, Mutopia-2018/01/29-890; source Bach Gesellschaft. [Edition/rights](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=890), [original I/II engraving](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/BachJS/BWV1009/cellosuite3/cellosuite3-lys/cellosuite3_5_bourree.ly). The typesetter placed this edition in the **Public Domain**. The unmodified `header.ily` retains this declaration; `cellosuite3.ly` records the original score wrapper and tempo.

`manifest.json` hashes original sources and the generated MIDI. Bach's supporting wrapper and licensing header are also hashed. The edition source dates are transcribed provenance, not independently asserted composition dates.

## Reproduction and musical decisions

```
# Standard library only; uses vendored MIDI:
python3 scripts/import_repertoire_batch2.py
# Full rebuild, with official LilyPond 2.24.4 and sibling convert-ly:
python3 scripts/import_repertoire_batch2.py --lilypond /path/to/lilypond
python3 scripts/test_repertoire_batch2.py
node synth-demo/repertoire-batch2.test.cjs
```

The Sor sources contain old paper/property syntax rejected by LilyPond 2.24.4. The importer runs official `convert-ly` into a temporary file, then compiles that file; originals are never modified. Both compile successfully. Bach's source emits only a deprecated TextScript.padding warning; compilation succeeds. No note or octave correction is introduced.

Sor Op.35 No.17 starts with A3 pickup and F♯4 dotted quarter; its final D3 ends at beat 128 before the final rest. Op.6 No.11 starts with an E2 bass and E3/G3 triplet accompaniment; it ends with E2/E4 half notes then a half rest. The MIDI already uses guitar sounding pitch (`treble_8` notation), so the event importer shifts by zero semitones. All generated voice events remain, without deduplication or quantization; the Op.6 triplets retain thirds of quarter beats (700 events of duration 1/3). Written `repeat unfold` shorthand is retained as musical content; neither Sor source has sectional volta repeats to omit. No manual embellishment, dynamic or fingering automation is added.

Bach's original file contains both Bourrées. The first `pageBreak` follows the complete second volta of I and precedes II's key change. The importer isolates exactly the complete I variable there, with checks on that boundary and final C-octave chord. Both volta sections play once; II and its da capo instruction are not included. The original wrapper uses `transpose c c`, so no octave shift is applied. Opening E3/F3 pickup, bar-2 G2/D3/B3 chord and final C2/C3 dotted halves are tested. The two C2 events below standard guitar E2 remain unchanged, honestly labeled as original cello range, not a guitar arrangement. Guitar range alone does not establish fretboard playability.

Tests independently read MIDI end-of-track times so end rests are not inferred from note-offs. They verify stable note counts, ranges, pickup/measure arithmetic, exact event equality, checkpoints, source hashes and provenance roundtrips. Existing 22 songs remain unchanged. Browser tests check loads, rendered note positions/counts, transport end, actual JSON download/upload and persisted metadata.

## Limits and UI integration

The existing piano-roll ruler counts from beat zero; it does not offset measure labels for pickups. Pickup timing is preserved in the events and documented in the manifest/source metadata, but engraved measure numbers will differ from the editor ruler for Op.35 No.17 and Bourrée I. No shared editor redesign is included here. Existing fixed 88% playback articulation and synthesis are untouched; headless playback testing is not an actual listening review. Real iPhone/Safari and physical fretboard performance remain untested.

Catalog wiring is confined to a new data script include, Op.35/Op.6 collection entries and a BWV1009 group in `index.html`. Attribution uses existing per-song source rendering; no additional explanatory UI panels or footer text were added. The concurrent UI redesign should retain access to per-song source/rights metadata in its intended source dialog.
