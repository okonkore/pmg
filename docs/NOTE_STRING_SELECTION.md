# Per-note fixed-pitch guitar string selection (local candidate)

Base: `cb2bff3a31f4d87d8fc66c0dd82628d4d8ebb97e`. No publication authorized.

## User behavior

Select one editable note, then open **音符**. **ギターの弦・フレット** offers Auto or valid standard-tuning combinations from fret0 through19 (matching the existing TAB range). Pitch remains unchanged. E4 offers first/open, second/5, third/9, fourth/14, fifth/19. A pitch edit or drag that makes an explicit choice impossible is rejected, preserving the previous note; choose Auto before moving it outside that string's range. Undo/redo, note/song copies, save/reload and JSON retain the choice. Built-in scores remain read-only and require copying to edit.

The attribute affects **Physical Guitar（弦を設定）** and TAB. It is retained but has no timbral effect on harpsichord or other existing engines; the note dialog says so. Existing songs and MIDI imports have no explicit string and remain Auto. Required-tuning metadata does not change instrument tuning: manual choices on a string whose required open pitch differs from standard are excluded/rejected. Unaffected strings remain available. Do not silently reinterpret Drop D as standard or retension a string to achieve a negative fret.

TAB preserves explicit assignments and automatically plans the rest. An impossible simultaneous hold on the same string is reported as unassigned rather than silently moved to a different string. Audio keeps the existing independent-voice polyphony; this change does not implement real-string voice stealing or left-hand playability.

## Data and preparation

Notes add optional integer `stringNumber` (1–6). Fret is derived from pitch minus standard open pitch, avoiding two conflicting sources of truth. Score event tuples optionally append this as element5, after velocity. Model normalization validates pitch/string/range/tuning and all event timing/strum/seek paths retain it. Existing version1 documents without the field are unchanged; older application versions do not understand the new field and may discard it if edited there.

Bank requests retain numeric MIDI for Auto, and use canonical `midi@string` for explicit variants (e.g. `64@2`). Validation resolves the request to physical string conditions before starting work. Worker forwards `stringNumber` into the existing coefficient builder. Numeric Auto cache keys, config signatures and PCM remain unchanged. Explicit keys have a distinct suffix, so no alternate string can masquerade as an existing Auto note. Preparation, load/decode, voice playback, memory LRU, in-flight requests and progress tiles all use the same variant identity.

Only requested song variants are generated; repeated notes reuse the same variant. The existing keyboard/all88 preparation choice remains, with only explicitly used extra variants added. There is no six-times-all88 sweep. Explicit first-string E4 currently has a distinct cache entry even though its coefficients equal Auto E4; cross-alias deduplication is deliberately not added. Up to15s of48000Hz PCM24 costs2.16MB per variant (decoded monoFloat32 2.88MB), subject to the existing negligible-tail cutoff and64MiB decoded LRU.

The existing bounded guard retries (4→2→1), fresh engines, failed-buffer discard, cancellation, worker termination, generation tokens and previous active bank are retained. Module URL versions are advanced so existing browsers load the changed validation and selection routing. Coefficient/kernel WASM, body data, synthesis engine and default settings are unchanged.

## Physical meaning and limits

Selected strings use their own mass density, stiffness, loss and open-string tension. Fretted vibrating length is solved at unchanged tension using the current stiff-string target-frequency formula. Pluck distance remains the same absolute bridge-relative setting, limited to90% of the remaining vibrating length. Thus this is a newly generated physical waveform, not a transposed recording or an EQ preset.

MIDI target pitch is fixed; existing coupled-model detuning is not corrected. The model does not add finger compliance, fretting stretch, fret collisions/buzz, damping by the finger, or fret-position-specific neck mobility. A real instrument's exact timbre is not established by these tests.

## Validation

- `node synth-demo/note-string.test.cjs`: choices, invalid input/pitch/tuning, Undo, copy, storage, JSON and event preservation, TAB fixed assignments/conflicts, legacy Auto.
- `node scripts/test_note_string_physics.cjs`: E4 first/open, second/5, third/9; fixed pitch/tension, differing lengths/waveforms, finite half-second renders; Auto/explicit first-string coefficient bytes exactly equal; invalid frets rejected. No full parameter sweep.
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_note_string_browser.cjs`: actual app/Workers/IndexedDB, mobile note dialog, Undo, invalid pitch, reload, TAB, full waveform generation of same-pitch variants, PCM cache separation, loop/seek, cancel/retry of missing third-string variant, existing second-string reuse, no guitar preparation for harpsichord. Browser output gives PCM fingerprints for diagnosis, not golden assertions.
- Existing targeted Node suites: sequencer-model, song-playback, tab-model, bach-1012, playback-timing, midi-import, string-sets, repertoire-catalog. All55 sample metadata/event round-trips and existing fingerprints remain intact.
- Existing browser checks: configured retry Worker, parallel pool, configured settings UI, touch fields, transport buttons, TAB browser and harpsichord level. For scripts with fixed localhost ports, tests used an in-memory URL-only substitution to the candidate's server on8790; repository test assertions were unchanged.

Browser coverage is Linux Chromium with mobile emulation, not actual iPhone Safari/Windows listening. No real-guitar recordings or realism claims. Tests do not cover every string/material/fret combination.
