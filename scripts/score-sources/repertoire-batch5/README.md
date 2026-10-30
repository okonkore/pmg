# Batch5 — three contrasting complete guitar works

Original sources are byte-exact Mutopia engravings. `manifest.json` pins their
SHA256, source URLs, rights, pitch transform, performed form and durations.
Derived score data retains each piece's rights; application code is separate.

| Key | Piece / typesetter | License | Notes | Quarter beats | Sounding MIDI |
|---|---|---|---:|---:|---|
| sor35_13 | Sor Op.35No.13, Andante / Glen Larsen | CC BY-SA4.0 |368|64|41–67 (F2–G4)|
| giuliani50_18 | Giuliani Op.50No.18, Allegretto / Stephen Rhen | CC BY3.0 |180|33|42–67 (F#2–G4)|
| carcassi60_9 | Carcassi Op.60No.9, Allegretto grazioso / Jeff Covey | Public Domain |836|248|40–76 (E2–E5)|

Official source pages:
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1945
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1346
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=306

## Musical verification

Sor:32 bars of2/4, no sectional repeats; written `repeat unfold` accompaniment
patterns are musical content and retained. Three voices remain separate in MIDI.
Opening C3 is simultaneous in bass (half note) and middle voice (sixteenth), with
E4 melody; these are not discarded as duplicates. Last bar begins at62: bass
C3 continues to64 while the upper voice rests. Fixed source quarter tempo90.
Source treble_8 already encodes sounding pitch: no additional octave shift.
Texture: sustained melody with running inner voice and bass.

Giuliani:1-quarter pickup,16 full2/4 bars, total33. No repeats. Ordinary treble
MIDI encodes written pitch; subtract12 semitones. Opening written G3/B4 becomes
sounding G2/B3. Final six-note G-major chord at31 sounds for1beat, then a full
quarter rest through33. Fixed source quarter tempo132. Texture: alternating
sixteenth-note melody and active bass, unlike the sustained Sor melody.
CC BY3.0 is attribution-only; do not mistakenly label this engraving ShareAlike.

Carcassi: printed A8 + repeated(B19 + C8), with C returning to A's music. The
source contains a separate MIDI score explicitly playing A B C B C, totaling
62 performed bars/248quarterbeats from35 written bars. Preserve that exact full
form; label it `後半反復あり`. Tests establish identical A/C/C event subsequences,
identical B/B subsequences and boundaries0/32/108/140/216/248. Last A2/A3
quarters at246 end247, followed by a quarter rest. Source `transposition c`
already supplies sounding pitch; apply no additional octave shift. Opening bass
A2 and chromatic-neighbor C4 are checked. Texture: chromatic scalar/neighbor
figures and moving register over bass; no claim of independently verified fingering.

Tempo-label discrepancy resolved at the selected edition level: the fetched
LilyPond header explicitly says `Allegretto grazioso`, with MIDI quarter=120.
A newly rendered PDF from these exact bytes displays that same heading. Search
preview text for an older PDF said `Allegro`; it is not used to override this
source. Do not claim120 is a universal performance tempo. The source's historical
bibliography is `Not known`; the credited typesetter explicitly placed this
engraving in the public domain. This is a qualification, not an invented source.

All3 compile without warnings under official LilyPond2.24.4/convert-ly. Temporary
per-voice MIDI performer configuration preserves overlapping unisons; original
files are not modified. Fixed source MIDI tempo is used for audition, without
modeling expressive rallentando/tempo changes. App articulation remains separate.
Range does not establish six-string fingering or physical string allocation.

## Catalog integration and verification

35 selections in9 groups:17 Sor,16 Bach,1 Giuliani,1 Carcassi. Existing32 event
fingerprints, provenance and four unknown-ending statuses remain unchanged.
New composer groups include English/Japanese names; searches for composer, opus,
Japanese title and no-match cases are tested without redesigning the interface.
No claim that the selected studies constitute a complete opus collection.

```
python3 scripts/import_repertoire_batch5.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python3 scripts/test_repertoire_batch5.py
node synth-demo/repertoire-batch5.test.cjs
node synth-demo/repertoire-catalog.test.cjs
python3 -m http.server 8770
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch5_browser.cjs http://127.0.0.1:8770/synth-demo/
```

Python validates pinned source bytes, exact event transforms, note/pitch counts,
voice overlaps, pickup/closing chords, EOT vs final rests, and repeated sections.
Node validates immutable originals, copies, JSON source/license/end metadata,
storage reload, menu placement and displayed duration. Chromium validates35-song
search/grouping, all3 loads/piano-roll placements/playback endpoints, actual JSON
download/import and reload. Compiler regeneration is byte-identical. Playback
endpoint checks do not constitute full-duration listening or human performance
review. Real-device Safari and listening/fingering review remain unrun.
