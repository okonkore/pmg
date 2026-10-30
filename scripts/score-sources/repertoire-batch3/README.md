# Repertoire batch 3: complete Sor studies and Bach Bourrée II

Adds four selections to the 25-song catalog. Score-data rights are separate from
application-code licensing. Original LilyPond files are stored byte-for-byte;
SHA256 values and exact source URLs are in `manifest.json`. MIDI is locally
compiled from these sources, not copied from a performance or modern recording.

| Selection | Edition / rights | Scope and sound |
| --- | --- | --- |
| Sor Op.60 No.8 | Hajo Dezelski, Mutopia 1748 (2010), CC BY-SA 3.0 | All 16 bars, 4/4, 64 quarter beats; last quarter rest retained; G2–G4; 81 voice events |
| Sor Op.60 No.9 | Hajo Dezelski, Mutopia 1749 (2010), CC BY-SA 3.0 | All 16 bars, 4/4, 64 quarter beats; last quarter rest retained; G2–G4; 151 voice events |
| Sor Op.60 No.10 | Hajo Dezelski, Mutopia 1750 (2010), CC BY-SA 3.0 | All 16 numbered bars plus pickup, 4/4, 65 quarter beats; E2–G4; 153 voice events |
| Bach BWV1009 Bourrée II | Stelios Samelis, Mutopia 890 (2018), Public Domain | Complete individual movement, 24 numbered bars with pickup/complementary final bar, 2/2, 96 quarter beats; C2–Eb4; 158 events |

Source pages:
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1748
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1749
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1750
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=890
- Sor license: https://creativecommons.org/licenses/by-sa/3.0/

Sor attribution, license link, modification notice and share-alike terms are
attached to every song and survive PMG JSON export. Derived Sor event data remains
CC BY-SA 3.0. Bach typesetter's public-domain declaration is in the already-vendored
`../repertoire-batch2/header.ily`; II uses the second half of that batch's unmodified
`cellosuite3_5_bourree.ly`. These source/header bytes were rechecked against the
approved Mutopia GitHub repository before importing. Both source hashes, plus the
original cello wrapper hash, are recorded in this batch's manifest.

## Musical and conversion decisions

- Every volta section is played once. No sections are cut. Bourrée II is offered
  separately: its written return to Bourrée I is not appended, and its trill is
  not realized. Both facts are in its exported modification notice.
- Sor is the original guitar edition at sounding pitch; no MIDI transposition.
  Bach retains original cello pitch including the final C2 (MIDI 36). It is
  explicitly not a guitar arrangement. MIDI range alone is no playability claim.
- Sor No.8 develops chordal voices, No.9 adds moving broken-chord accompaniment,
  and No.10 exchanges material between upper and lower voices. The related Nos.8
  and 9 are distinct complete studies, not generated variants.
- Official `convert-ly` only updates a temporary copy's old LilyPond syntax.
  In the temporary MIDI configuration, `Staff_performer` is moved to each Voice
  and `Score.midiChannelMapping` is set to `voice`. This preserves separately
  notated overlapping unisons: No.9 beat 2 has E4 durations 0.5 and 2 beats;
  No.10 beat 1 has G4 durations 0.5 and 1. No importer deduplication occurs.
  A shared staff track would incorrectly reduce the event totals to 126/121.
  Separate voice routing also leaves an empty metadata track ending at tick zero;
  all musical track ends are explicitly tested against score duration.
- No.10's first section is pickup + seven full bars + a three-beat bar (32 beats).
  The second starts with its own one-beat pickup and eight full bars (33 beats).
  LilyPond warns at bar 8's three-quarter boundary because the old source lacks a
  partial-bar reset. Source durations and pickup placement are preserved, not
  padded. The warning is documented rather than hidden or 'fixed' musically.
- Bach II is isolated at the unique pageBreak separating I and II, restoring its
  inherited 2/2 and quarter pickup. The original wrapper uses `transpose c c`:
  there is no extra octave shift. Final C2/C3 lasts three quarter beats.
- Tempo: Sor's source MIDI setting is quarter=80; Bach quarter=150 is a fixed
  audition choice. App articulation remains separate and unchanged.

## Reproduction

From repository root:

```sh
python3 scripts/import_repertoire_batch3.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python3 scripts/test_repertoire_batch3.py
node synth-demo/repertoire-batch3.test.cjs
python3 -m http.server 8768
# Separate terminal:
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch3_browser.cjs http://127.0.0.1:8768/synth-demo/
```

Without `--lilypond`, rebuilding uses the vendored MIDI and Python standard
library only. Original whitespace is retained, including upstream trailing spaces.
The browser test exercises four selections, note placement, playback/end markers,
actual JSON download/import, and reload persistence. Model tests round-trip all
four selections' source metadata. Real iPhone/Safari, listening review and human
fretboard performance have not been validated. Pickup-aware ruler numbering is
an existing UI limitation; event timing is preserved.
