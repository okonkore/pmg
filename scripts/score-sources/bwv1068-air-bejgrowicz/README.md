# Bejgrowicz Air — supplied transcription / local implementation

J. S. Bach, Air from Orchestral Suite No. 3, BWV 1068; classical-guitar
arrangement by **Seweryn Bejgrowicz**, credited on the PDF with `www.sew.prv.pl`.
Catalog key `air1068_bejgrowicz` is separate from the unchanged two-voice
`air1068` arrangement. This implementation uses the parent-provided voices-v1
transcription; it has **not been independently compared with the visible PDF
in this execution environment**.

## Source and license

- Source: https://cantorion.org/music/4244/Orchestral-Suite-(Overture)-No.-3-Air-on-the-G-String
- License: **CC BY-SA 3.0 Unported**, https://creativecommons.org/licenses/by-sa/3.0/
- Legal code: https://creativecommons.org/licenses/by-sa/3.0/legalcode
- Source page checked2026-11-05: arranger “Seweryn B”, CC BY-SA3.0.
- PDF text identifies “arr. Seweryn Bejgrowicz”. The page's D-major label must
  not override the supplied guitar transcription's C-major sounding pitches.

The supplied transcription and this derived playable score are distributed
under CC BY-SA3.0. Retain the title, composer, arranger, supplied attribution,
source/license links and modification notices; distribute adaptations under
the same license without additional restrictions or implied endorsement.
This does not relicense unrelated application code or the existing arrangement.
Credits and modifications are also in the song metadata shown by the editor
and retained during export/import.

## Musical treatment and limitations

`transcription.json` preserves all37 supplied bars, voice tokens and explicit
tie flags. Melody/inner/bass token counts are161/169/146. No melody, bass or
inner passage was replaced with the older arrangement. Sounding pitches are
used without an extra octave shift: E2–B-flat4, opening melody E4.

The supplied order1–12,1–11,13,14–37,14–37 yields72 performed bars,4/4,
288 quarter beats. All15 explicit ties are joined, including bar18→19.
Unmarked repeated notes are rearticulated. Gaps remain rests; neither missing
notes nor implicit ties are invented. Ornament realizations are omitted rather
than guessed. Quarter=56 and melody/inner/bass velocities .85/.70/.72 are
editorial playback choices, not source markings.

Three overlapping unisons are coalesced to one continuous physical note:
bar5 G4 (inner attack at beat3 lies inside the held melody), bar7 F4 (same),
and bar24 G3 at beat1 (melody1 beat and inner2 beats become a2-beat hold).
The first two inner attacks are therefore suppressed. This is an explicit
playback interpretation, not claimed as a verified reading of the original.
Original tokens and all merge provenance remain in the audit. Adjacent
repeated pitches without overlap are not merged.

Playback has903 events and at most5 simultaneous notes. A global integer
assignment chooses standard-tuning strings with no held-string collisions;
actual frets are0–8. This is **not recommended human fingering**. Keeping every
supplied hold requires nonzero fret spread up to6 in this assignment. A
spread limit4 or5 had no feasible assignment under the model. Bars18,22,33,
36 contain spans greater than4. Barre feasibility, finger independence,
position changes, and original articulation have not been verified. No note
lengths were shortened to conceal these constraints.

The generic app scheduler releases notes at88% of their scheduled duration;
the stored score retains full notated durations, and ties remain a single
attack. Instrument tails/articulation are existing app behavior, not an exact
reconstruction of a human performance. Full Physical Guitar bank rendering
and auditory fidelity to the source arrangement are not claimed.

## Build and verification

The builder requires Python, NumPy and SciPy (MILP for string assignment).

```
python scripts/build_bwv1068_bejgrowicz.py
node synth-demo/bwv1068-bejgrowicz.test.cjs
node synth-demo/bwv1068-air.test.cjs
node synth-demo/repertoire-catalog.test.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bejgrowicz_browser.cjs
```

The audit records the source hash, tie/unison provenance, all source and
performed notes, repeat order, range and polyphony. Tests check independent
supplied-data anchors, cross-bar ties, rests, ending, unique simultaneous
pitches/strings and metadata round-trip. The browser smoke test selects the
new entry and checks actual Web Audio output and forwarded strings at the
opening, second section and final chord using the existing organ preset.
It is not an iPhone or full Physical Guitar timbre test.

## Acquisition history

Original PDF download was blocked by proxy403; web extraction returned music
glyphs without readable staff positions. The parent then provided Library
`libfile_fc6c2d985c28819197c7153c9152aab0` (`bach-seweryn.pdf`). Current Library
helpers resolved it but materialization and one explicitly requested retry
failed with `download failed`; neither destination existed. Work resumed only
when the parent supplied explicit transcription data. No independent visual
score verification is claimed. The earlier acquisition failures are no longer
an implementation blocker, but remain a source-fidelity limitation.

No publication/deployment or acoustic-model change is part of this task.
