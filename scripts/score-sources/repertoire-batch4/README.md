# Sor Op.1: Andante, Waltz and Marcia

Three complete individual guitar pieces, separate from batch3. The combined
catalog contains32 unique selections. This edition is credited to Mark Van den
Borre / Mutopia and follows its editorial readings; it is not represented as an
urtext or a new guitar arrangement. Original source whitespace/bytes are retained.
Score-data licensing is separate from the application's code licensing.

| Selection | Source / rights | Form without volta repeats | Events | Sounding range |
| --- | --- | --- | ---: | --- |
| Op.1 No.1 Andante | Mutopia413,2015, CC BY-SA4.0 | 18 bars,3/4;54 quarter beats | 221 | F#2–D5 |
| Op.1 No.2 Waltz | Mutopia452,2015, CC BY-SA4.0 | 48 numbered bars with eighth pickup/complementary ending,3/8;72 quarter beats | 306 | G2–B4 |
| Op.1 No.6 Marcia | Mutopia458,2013, CC BY-SA3.0 | 40 bars,4/4;160 quarter beats | 465 | F2–F5 |

Source pages:
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=413
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=452
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=458

Exact approved GitHub acquisition URLs and SHA256 values are in `manifest.json`.
Each source declares its corresponding license and credits Mark Van den Borre.
The headers cite the Danish Royal Library early19th-century edition and name a
Golden Music Press/GFA/Frederic Noad facsimile. We use the explicitly licensed
Mutopia engraving, not a separate contemporary Noad arrangement. Original source
No.1 comments document editorial changes from its facsimile at bars12,13,16; these
readings are retained and the exported notice qualifies the edition accordingly.

## Sounding pitch and tuning

No.1 encodes sounding notes directly: treble_8, first bass G2 (MIDI43), middle G3
(55) and melody B3 (59). No transposition is applied.

No.2 uses violin/ordinary treble clef and written register without a MIDI octave
transposition. The initial d' in relative c' resolves to written D5 (74), played
as D4 (62) on guitar. Its first accompanying written G4 (67) becomes sounding G3
(55). Every MIDI pitch is shifted exactly-12; source durations/attacks are intact.

No.6 uses default treble and written register. Its opening written F4/F5
(MIDI65/77) becomes sounding F3/F4 (53/65). At bar36, a separately notated low
written F3 (53) becomes F2 (41). The source explicitly marks
`La 6 \super e corde en Fa`: tune the sixth string to F2, NOT standard E2 and NOT
Drop D. Required tuning low-to-high is F2 A2 D3 G3 B3 E4. This is visible in the
menu option/edition and exported `source.pitch`; the manifest also stores the six
open-string pitches. Metadata does not reconfigure the synth's physical string
model; event playback uses these explicit sounding MIDI pitches.

Range checks do not establish comfortable fingering or human playability. These
are original guitar editions; no human performance/fretboard validation is claimed.

## Timing, rests and polyphony

- Each explicitly written section is present once; no volta unfolding, section
  deletion or inferred da-capo. Waltz's six written sections include the written
  return of its opening material: this is retained, not deduplicated as a repeat.
- Andante sections: bars1–10 [0,30), bars11–18 [30,54). All notes release by53;
  [53,54) is the final quarter rest.
- Waltz: each of six sections occupies12 quarter beats, including its .5-beat
  pickup and1-beat complementary ending. First pickup [0,.5), bars1–7 [.5,11),
  bar8.1 [11,12), then bar8.2 (next pickup) [12,12.5). Final G2/G3 eighths occupy
  [71,71.5), followed by an eighth rest [71.5,72). Lower voice ends at71 because
  the final octave belongs to upperVoice; this is not a missing bass note.
- Marcia sections: bars1–14 [0,56), bars15–40 [56,160). Final F2/A3/F4 chord is
  [158,159), then quarter rest [159,160). Nested voices at bar36 end at142;
  they are intentionally local voices, not truncated40-bar parts.
- Temporary compilation uses official convert-ly and per-voice MIDI channels,
  preserving overlapping notes with equal pitch. No importer deduplication.
  Raw default merged output counts217/286/456 are NOT the correct separate-voice
  counts221/306/465 used here. Grace/tuplet MIDI timings are preserved, including
  durations shorter than an eighth. No fixed88% articulation is baked into data.
- Source tempi: Andante quarter84; Waltz dotted-quarter60 = quarter90. Marcia
  has no explicit MIDI tempo; app quarter96 is a disclosed audition choice.

## Validation and regeneration

```sh
python3 scripts/import_repertoire_batch4.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python3 scripts/test_repertoire_batch4.py
node synth-demo/repertoire-batch4.test.cjs
node synth-demo/repertoire-catalog.test.cjs
python3 -m http.server 8768
# In another terminal:
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch4_browser.cjs http://127.0.0.1:8768/synth-demo/
```

All three compile without warnings. Without --lilypond, the importer rebuilds
from vendored MIDI using only the Python standard library. Python tests anchor
original source hashes, entire event transforms, note counts, voice-track ends,
final rests, tuning and known opening/final chords. Model tests preserve all
source fields through edit/copy/export/import/storage. Browser tests exercise
three loads, piano-roll notes, playback/end markers, sixth-string-F metadata,
actual JSON download/import and reload, plus English/Japanese composer search,
opus, title and tuning search. Real-device Safari/listening review remains unrun.

Catalog-wide audit:32 unique keys and options; original25 retained unchanged;
all32 have credited source URL/license and successful event/metadata JSON round
trips. All seven batch3/4 additions have dedicated licenseUrl, pitch, modifications,
terms and endBeat. Nineteen older selections predate dedicated licenseUrl/endBeat
fields; those existing gaps are reported by the catalog test, not fabricated or
silently filled from note ends. Source links/license labels remain present.

Quality follow-up: see ../catalog-audit/README.md. All32 now have licenseUrl;
15 legacy end markers verified, four explicitly unverified. No note changes.
Op.1No.6 required tuning is now structured in source.requiredTuning, validated
and exported; it is explicitly not applied to physical settings.
