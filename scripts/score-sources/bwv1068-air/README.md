# BWV1068 Air — PMG two-voice classical-guitar reduction

## Source and rights

J. S. Bach's underlying composition is public domain. The source edition used
here is **jeff covey / Mutopia 242**, orchestral Air after Bach-Gesellschaft,
licensed **CC BY-SA 3.0**, not a modern guitar arrangement.

- Catalogue: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=242
- License: https://creativecommons.org/licenses/by-sa/3.0/
- Vendored LilyPond source: https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/BachJS/BWV1068/bach-air/bach-air-lys/bach-air-notes.ly
- Source footer: Mutopia-2008/10/28-242 (inner header also retains 2006/08/16).
- Exact source SHA256 and parsed voices: `audit.json`.

This derived score/arrangement (2026, PMG) is also CC BY-SA 3.0. Retain
attribution, these change notices and the license; share adapted score data
under the same license. Code licensing is separate. No endorsement is implied.
The familiar Japanese title is used for discoverability; this is **not** a copy
of Wilhelmj's violin arrangement or a third-party modern solo-guitar score.

## Musical decisions

The original D-major Air is transposed to C major. The first-violin main melody
moves down14 semitones. All its main-note onsets, rhythmic values and tied holds
are retained. The three acciaccaturas and final trill ornament realization are
omitted. The other violin and viola parts are omitted: this is an intentionally
sparse two-voice solo arrangement, not a full four-part transcription.

The continuo note sounding on each quarter beat supplies the bass, transposed
by -2 semitones then octave-folded into E2–D#3. This replaces octave alternations
and short runs with quarter-note pulses. The last half-note of each B repeat
is retained. Melody/bass velocities are fixed editorial balances .85/.65,
not extracted dynamics. No extra fermata duration is added.

4/4, quarter=56 (an editorial audition choice, not an urtext tempo). The source
contains 19 printed bars including separate first and second endings. Performance
order is bars1–6, bars1–5+7, bars8–19 twice: 36 bars, 144 quarter beats,
approximately154.29 seconds. The melody has276 events, bass142: total418.
No silent padding is added at the ending. The entire Air is represented.

Standard E2 A2 D3 G3 B3 E4, no retuning and no changed guitar physics. Actual
range E2–B-flat4 (MIDI40–70); explicit strings on every event; actual frets0–6.
Melody uses strings1–3; bass uses4–6. At most two simultaneous notes, no overlap
on the same string over the full scored holds, maximum nonzero-fret difference4.
This is a necessary playability screen: finger numbers, hand shifts, legato,
right-hand pattern and real-instrument performance have **not** been verified.
Do not label this a professionally fingered or human-tested edition.

## Build and checks

`python scripts/build_bwv1068_air.py` needs only Python's standard library.
The reader is intentionally restricted to the two monophonic source variables;
it checks all19 written bars have exactly4 beats, ties join identical pitches,
and each part ends at76 quarters. Relative octave marks and explicit
accidentals are read from LilyPond. No external MIDI performance is imported.
`audit.json` records the source melody/bass, repeated segments and physical
assignment checks. This is not independently compared with a LilyPond MIDI
render; source anchors and bar totals are covered in the Node regression.

- `node synth-demo/bwv1068-air.test.cjs`
- `node synth-demo/repertoire-catalog.test.cjs`
- `node synth-demo/note-string.test.cjs`
- `node synth-demo/song-playback.test.cjs`
- `node synth-demo/sequencer-model.test.cjs`
- Serve `synth-demo`, then `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bwv1068_air_browser.cjs http://127.0.0.1:8804/`

No listening evaluation, full-song physical-audio render, iPhone Safari, or
human guitar performance is claimed. The earlier text-selection CSS/docs/test
are retained untouched; index.html also contains that earlier independent link.
These checks describe local pre-publication verification.

Observed verification: all listed Node suites and both default/v2 Chromium
browser cases passed. The catalog test compares all55 previous song objects
against published baseline `e19b2dba02f0cf273ca9f249533ace23165a0e5f`;
all are byte-equivalent when serialized. Catalog size is now56 with one new
`air1068` option. The catalog harness now selects the inline catalog script by
content instead of assuming it is the first script (the boot script precedes it).
`git diff --check` passes for authored files. The byte-preserved upstream
LilyPond file contains two original whitespace-only lines (8 and20); these are
retained to preserve its recorded source hash.
