# BWV1009 complete movement catalog — local candidate

Base `522768a3c70f74530c9e9f339acb180a7a825678`,45 songs. Five additions yield **50 local songs** and seven BWV1009 selections in score order (the two bourrées are separate selections). Existing45 whole song objects are hashed in `checkpoint45.json` and unchanged. No push/Pages publication, synthesis, TAB, depth research, or UI behavior changes. The only app integration is a data script and the existing suite's catalog entries.

## Source and rights

All movements use Stelios Samelis's Mutopia edition of Bach Gesellschaft, explicitly **Public Domain** in both the source header and official listing:
https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=890
https://creativecommons.org/licenses/publicdomain/

Original downloaded bytes are retained. `header.ily`, `cellosuite3.ly` and the existing combined Bourrée I/II source were reused unchanged from the already-vendored batch2 source. The five other movement files were acquired from the official Mutopia GitHub repository; exact raw URLs, source/MIDI SHA256 and transformation details are in `manifest.json`. This is the cello edition, not the viola transposition also mentioned in the original package, and not a modern guitar arrangement.

| Score order | Selection | Status | Notes / quarter beats | Repeats |
|---|---|---|---|---|
| 1 | Prélude | new |1007 /264 | none written |
| 2 | Allemande | new |972 /192 | A A B B |
| 3 | Courante | new |990 /504 | A A B B |
| 4 | Sarabande | new |434 /144 | A A B B |
| 5a | Bourrée I | existing unchanged |191 /112 | existing single-pass version |
| 5b | Bourrée II | existing unchanged |158 /96 | existing single-pass version |
| 6 | Gigue | new |1046 /324 | A A B B |

The suite is complete as individually selectable movements, not a continuous performance with an automatic Bourrée da capo. Existing bourrée repeat/D.C. policy is intentionally preserved to satisfy the requirement that all45 prior entries remain unchanged. The new selections clearly label their repeated forms.

## Music fidelity and timing

No transposition: **C major, original cello sounding pitch, shift0**. Unlike a guitar treble edition, no notation-octave correction applies. This keeps register consistent with existing BWV1009 bourrées. Source C2/D2 and other notes below standard guitar E2 are retained, never silently raised. All five reach C2 (MIDI36); upper pitch is G4 (67), except Courante E4 (64). Below-E2 event counts: Prelude19, Allemande24, Courante20, Sarabande14, Gigue8. Source metadata and selection summaries flag original cello range. No six-string fingering or guitar-arrangement claim, no physical tuning changes. The app can schedule these pitches; that does not make them playable on a standard six-string guitar.

Original source voices, overlaps, unisons, durations and chords are preserved using separate MIDI voices. Every source compiles without warnings under LilyPond2.24.4 after official convert-ly. Full MIDI from `unfoldRepeats` matches a separate manual expansion of the first-pass MIDI exactly. A third compilation isolates the first volta section to independently check each boundary. No excerpt or generated filler substituted.

- Prelude:88 bars of3/4,264 quarter beats. Final C-major chord at261 lasts1 beat; two explicit rests carry the score to264.
- Allemande:24 bar-equivalents of4/4; pickup0.75 and complementary section endings. First section48 beats, second48. Each repeated,192 total. Final chord190.75–191.75 followed by a sixteenth rest to192. Each repeated section's closing rest is retained.
- Courante:84 bar-equivalents of3/4; pickup0.5. First section120 beats, second132, each repeated =>504. Final chord501.5–503.5 followed by the source eighth rest to504.
- Sarabande:24 bars of3/4,8-bar first section(24 beats),16-bar second(48), each repeated =>144. Final C-major chord142–144.
- Gigue:108 bar-equivalents of3/8, first section72 beats(48 bars), second90(60 bars), each repeated =>324. Pickup0.5 and complementary endings; final chord323–324.

Tempo comes from the original wrapper where explicit: Prelude quarter120, Courante dotted-half70 =quarter210, Gigue dotted-quarter65 =quarter97.5 (fraction retained in app/export). Allemande quarter84 and Sarabande quarter60 are fixed audition choices because their wrapper has no explicit tempo. Intermediate MIDI is used as a beat-based event container; app tempo is taken from this documented metadata. Trill signs, expressive bowing/dynamics and expressive timing are not realized. App articulation remains unchanged.

## Validation and reproduction

```
python scripts/import_bwv1009_complete.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python -m unittest discover -s scripts -p 'test_bwv1009_complete.py'
node --test synth-demo/repertoire*.test.cjs synth-demo/bach-1012.test.cjs synth-demo/bwv1006a-complete.test.cjs synth-demo/bwv1009-complete.test.cjs synth-demo/catalog-playback.test.cjs
python -m http.server 8773 --bind 127.0.0.1
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bwv1009_complete_browser.cjs http://127.0.0.1:8773/synth-demo/
```

Without `--lilypond`, the build uses pinned vendored MIDI (no network/compiler required). Two new Python tests verify counts, source hashes, first-section boundaries, whole repeated forms, MIDI end-of-track, explicit final rests, final chords, tempo conversions and unchanged source pitches. Eleven related Node test files pass, including JSON source/ending round trips, all45 prior fingerprints and all50 full schedules across4 presets. Standard520R has no forced voice stealing in this deterministic full-length scheduling audit. Browser checks cover50 selections/12 groups, seven BWV1009 search results, all five new loads and note placement, start/end markers, downloaded JSON/import and persisted attribution. Browser smoke playback is not a real-time listen-through; whole-track coverage is provided by the deterministic scheduling test.

Real iPhone/hardware audio, acoustic listening and human fingering have not been verified. Other sound-preset voice/tail limitations are outside this task. No new access denial occurred for these sources. The known Actions API403 was not retried or bypassed.
