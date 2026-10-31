# BWV1004 remaining four movements

Release prepared against `202616c38694cbd7014cf89aac937593a8035ca2`: 51→55 songs, same13 groups. Complete Partita II with existing Chaconne unchanged. Publication of these four movements subsequently authorized. No engine changes (including the existing harpsichord level adjustment), other UI or private MIDI.

## Edition and rights

Individual Mutopia records: [Allemande1423](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1423), [Courante1424](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1424), [Sarabanda1427](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1427), [Giga1428](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1428). Original violin editions after Bach-Gesellschaft1879 vol27.1; Hajo Dezelski for first two, Benjamin D. Esham for last two. Each source independently declares **CC BY-SA3.0**, also confirmed by the official piece-info pages. No modern commercial guitar arrangement copied. Original `.ly` bytes, including original whitespace, headers, credit and license, are preserved; exact raw-GitHub URLs/hashes in manifest.json. Generated MIDI and derived note data remain CC BY-SA3.0, with attribution/license/changes and share-alike terms in each song's metadata and exported JSON. Application code license is separate.

## Music and conversion

All four shift the **violin sounding score down12 semitones**, matching existing Chaconne audition. This is intentional transposition, not a guitar notation correction. D minor retained, no isolated-note shifting/removal. Separate Voice MIDI performers preserve holds and overlapping unisons. Source trill/bowing/dynamics/fermata realization is not synthesized; written note values and app articulation are separate.

| Movement | Notes with repeats | Quarter beats | Sounding range | Ending |
|---|---:|---:|---|---|
| Allemande |1094|257|G#2–D5 (44–74)|last note ends256.5, half-beat source rest/spacer|
| Courante |858|325|G2–D5 (43–74)|last note ends324.75, quarter-beat source spacer|
| Sarabanda |534|156|G2–Bb4 (43–70)|last note ends156|
| Giga |1816|480|G2–D5 (43–74)|last note ends480|

Allemande: two16-bar4/4 sections each with quarter-beat pickup, length64.25; AABB. Courante:24/30 full3/4 bars each with quarter-beat pickup,72.25/90.25; AABB. We retain this edition's closing spacers instead of silently normalizing its pickup accounting. Giga: two20-bar12/8 sections,120 beats each, complementary half-beat pickups/closing bars; AABB.

Sarabanda: A8 bars repeated, one-bar B lead,14-bar core, two-bar first ending (including the lead back), repeated14-bar core, one-bar second ending,4-bar coda:52 performed3/4 bars. Original graphical repeat signs are not played by plain LilyPond MIDI: temporary compilation input converts both Sarabanda voices' initial graphical repeats, and Giga's two graphical sections, into semantic repeats. All original bytes remain unchanged. Independent section selection from first-pass MIDI matches every unfolded event (pitch/onset/duration), and Sarabanda is additionally checked against its original semantic B-repeat expansion. No source note crosses a selected cut.

Official convert-ly/LilyPond2.24.4 used. Ten obsolete Sarabanda auto-beaming Scheme lines removed **only in temporary input**; these change engraving, not notes. Compiler succeeds; one pre-existing overlapping-slur warning remains in Sarabanda in all modes, documented rather than altering the musical source. All other movement builds succeed without warnings. First two audition tempi are chosen quarter84/108 (no source tempo); last two retain source MIDI quarter60/108.

Necessary standard6-string/frets0–19 assignment, holding strings for entire note durations, and conservative non-open fret-span≤4 screens pass for all four. This is not proof of actual fingers/barres/hand transitions or a finished classical-guitar arrangement. No physical tuning changes. Peak simultaneous voices4/3/4/1; Allemande includes two simultaneous same-pitch voice events which remain distinct.

## Validation and reproduction

```
python scripts/import_bwv1004_complete.py --lilypond /tmp/lilypond-2.24.4/bin/lilypond
python -m unittest discover -s scripts -p 'test_bwv1004*.py'
node --test synth-demo/repertoire*.test.cjs synth-demo/bach-1012.test.cjs synth-demo/bwv100*-*.test.cjs synth-demo/catalog-playback.test.cjs
python -m http.server 8776 --bind 127.0.0.1
node scripts/test_bwv1004_complete_browser.cjs http://127.0.0.1:8776/synth-demo/
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bwv1004_chaconne_browser.cjs http://127.0.0.1:8776/synth-demo/
```

Without --lilypond the importer uses vendored MIDI, no network/compiler needed. Python4 tests and Node12 test files pass. Existing51 whole-song fingerprints in checkpoint51.json cover all source/score/metadata, not only notes. Catalog test checks all55 entries and JSON round-trip. Actual app scheduler is executed with deterministic mocked clock through complete songs, every note onset/pitch/gate, transport completion, plus two loops and late seek for each new piece. This avoids a minutes-long live audio wait while exercising real scheduling code.

playback-audit.json: all new events scheduled in4 presets. Pluck/standard520R have no voice stealing or sample ending before gate. Existing SoftPad/whole-shell release tails can be reclaimed; whole-shell Sarabanda has2 natural sample endings before gate. These engine limitations are reported, not fixed in this repertoire change. No acoustic audibility guarantee.

Chromium checks all four complete piano rolls, nonzero note placement, end markers, search/group integration, start/transport endpoint, source display, actual downloaded JSON/import/reload. Full-length playback proof comes from mocked scheduling, not listening on a real phone. Existing Chaconne browser regression is also run with installed system Chromium; default Playwright-bundled binary is absent.

No source acquisition blocker remains. Known Actions API/Pages network403 was not retried or bypassed; publication is authorized, but deployment success cannot be independently verified through the restricted endpoints.
