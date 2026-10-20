# BWV 1012 score sources

Music: Johann Sebastian Bach, Cello Suite No. 6 in D major, BWV 1012.
Engraving: Hajo Dezelski, Mutopia Project (2008), based on Bach-Gesellschaft Edition 1879, Band 27.

The seven original MIDI files and the derived note-event data are licensed under **Creative Commons Attribution-ShareAlike 3.0 Unported**:
https://creativecommons.org/licenses/by-sa/3.0/

`manifest.json` records individual Mutopia source pages, original MIDI URLs, SHA-256 hashes, and conversion statistics. The MIDI files contain symbolic note data, not audio recordings, and are not included in the Pages deployment.

Run `python3 scripts/import_bwv1012.py` from the repository root to regenerate `synth-demo/bach-1012.js` and the manifest. Only Python's standard library is needed. The existing `synth-demo/gavotte.js` is retained and its events match the same conversion exactly.

Adaptation: absolute quarter-note onsets and durations are extracted from every MIDI track, retaining chords, rests and ornaments. The initial MIDI setup delay is removed. Fixed audition tempi replace the default MIDI tempo; original pitch and note length are retained, with the player's existing 88% gate and release applied during playback. Volta repeats are not unfolded in the source MIDI; each written section is played once. Gavotte I and II are separately selectable; there is no automatic da capo.

No changes to the guitar synthesis or recorded reference audio are involved.
