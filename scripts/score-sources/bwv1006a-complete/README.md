# BWV1006a: complete seven-movement local catalog

Base `c3ac1398ed8cfca0148bd2221f8fccf8782b53dc` (41 songs). This adds four movements, giving **45 local songs** and all seven BWV1006a selections in movement order. The preceding 41 complete catalog objects are pinned in `checkpoint41.json` and unchanged. No batch8 BWV1006 violin candidate, synthesis, TAB or UI behavior changes; only data loading/catalog wiring. No push/publication in this task. The preceding Pages run remains unverified following its API403; no retry/bypass attempted.

## Edition and movement coverage

The Mutopia guitar-edition source headers explicitly number movements1–7, identify BWV1006a, name Hajo Dezelski as arranger, and cite Bach-Gesellschaft Edition1879 volume42. All seven use the same edition family. This is a complete catalog of individual movements, not an automatically chained suite or a claim of a critical/urtext edition.

| Order | Movement | Status | Official source | Performed notes / quarter beats |
|---|---|---|---|---|
| 1 | Preludio | added locally | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1485 | 1731 / 417 |
| 2 | Loure | added locally | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1486 | 658 / 294 |
| 3 | Gavotte en Rondeau | added locally | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1500 | 849 / 402 |
| 4 | Menuet I | retained unchanged | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1501 | 470 / 204 |
| 5 | Menuet II | retained unchanged | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1502 | 492 / 192 |
| 6 | Bourrée | retained unchanged | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1498 | 712 / 292 |
| 7 | Gigue | added locally | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1499 | 862 / 194 |

No acquisition/rights blocker for the four additions. All source pages explicitly license the edition **CC BY-SA3.0**, Hajo Dezelski/Mutopia2008. Source and derived MIDI/score data retain attribution, license, changes and share-alike terms: https://creativecommons.org/licenses/by-sa/3.0/ . This is separate from application code and from the public-domain underlying composition. Raw `.ly` bytes, historical links/whitespace and exact SHA256 are retained; `manifest.json` includes raw source URLs and all eight MIDI checksums. Temporary compilation only updates syntax, separates voices, and fixes Gavotte's MIDI program-name typo `acoustic guitar nylon` to `acoustic guitar (nylon)`. The program-name fix changes no note event; compiler warnings disappear. No copyrighted performance transcription used.

## Source fidelity and real pitch

BWV1006a data is acquired independently from `ftp/BachJS/BWV1006a/*g` and must not be confused with BWV1006 violin original data. In particular the1006a Gavotte has849 events/402 beats, a bass beginning E4 written (E3 sounding), written-out rondo returns, and **no opening repeat sign**. The held1006 violin candidate has821 events/440 beats after its own repeat. It is not relabeled or reused here.

All new sources use ordinary treble guitar written register; every MIDI pitch is lowered12 semitones for sounding pitch, retaining E major. This is guitar notation correction, not the intentional violin-transposition operation of batch8. Example: Preludio written bass E3 and melody E6 become E2/E5. No octave changes within voices, removed notes, collapsed unisons or shortened holds. Sounding ranges: Preludio E2–E5 (40–76); Loure E2–C#5 (40–73); Gavotte E2–D5 (40–74); Gigue E2–B4 (40–71).

- Preludio:139 complete3/4 bars, no repeats. Four voices; final bass E lasts3 beats ending417; notated fermata is not lengthened.
- Loure:6/4, first section pickup1.5 +11 full bars =67.5; second pickup1.5 +13 full bars =79.5. Both repeat, total294. Closing1.5-beat spacers at each section are preserved; final chord starts291, ends292.5, then silence to294.
- Gavotte:4/4, pickup2 +100 full bars =402. All rondo returns already written out; no extra unmarked repeat added. Last chord398–400; final2 silent beats preserved.
- Gigue:6/8, each section pickup0.5 +16 full bars =48.5. Both repeat, total194. Closing0.5-beat spacers retained; final chord192.5–193.5, silence to194.

These source pickup/closing spacers can create gaps relative to performances joining complementary bars. They are explicitly preserved/qualified, not silently corrected. First-pass MIDI plus manual section expansion matches independent LilyPond `unfoldRepeats` output, including every pitch/duration/event, within1e-9 beat floating tolerance for Loure triplets. Canonical data uses the unfolded MIDI timing. Full tails checked by MIDI end-of-track, not just latest note. All raw counts, ranges, onset/final-chord witnesses, repeats and rests are tested.

Tempo is an audition choice, no source tempo claimed: quarter100 for Preludio/Gavotte/Gigue and80 for Loure. Trill/mordent signs, expressive dynamics and fermata extension are not rendered; app articulation is unchanged.

## Guitar feasibility qualification

All pitches are in six-string standard range and no physical tuning setting is changed. `fingering-audit.json` screens separate voice events without collapsing overlapping unisons. A state retains each note's string for its full duration, frets0–19, standard tuning. Necessary distinct-string assignments exist for all four; max simultaneous events5/5/4/4 respectively. This is not a playable-performance guarantee.

With a conservative additional maximum4-fret spread among non-open notes, the first failure is Preludio beat111.75 (two C#3 events), Loure beat24 (two E3 events), Gigue beat118.5 (two A3 events). Gavotte passes this necessary bound, but finger count, barre, transitions, technique and human performance remain unverified for all four. Failures/warnings and no-fingering-guarantee text survive source metadata export. No source music was deleted to make these checks pass.

## Verification/reproduction

```
python scripts/import_bwv1006a_complete.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python scripts/audit_bwv1006a_fingering.py
python -m unittest discover -s scripts -p 'test_bwv1006a_complete.py'
node --test synth-demo/repertoire*.test.cjs synth-demo/bach-1012.test.cjs synth-demo/bwv1006a-complete.test.cjs synth-demo/catalog-playback.test.cjs
python -m http.server 8772 --bind 127.0.0.1
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bwv1006a_complete_browser.cjs http://127.0.0.1:8772/synth-demo/
```

Without `--lilypond`, import reuses the pinned MIDI with no network/compiler needed. Two new Python tests pass. Ten related Node test files pass, including all45 complete scheduling runs across4 presets; standard520R has no voice stealing. Chromium passes45 selections/12 groups, all7 suite selections searchable, four new scores loaded with all notes positioned, playback end markers, attribution, JSON download/import and persisted source/ending metadata. Existing41 song objects unchanged. Physical device, acoustic listening and human fingering are not verified. Other preset voice/tail limitations are unchanged and not fixed here.
