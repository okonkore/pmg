# Fernando Sor — Op.60 Nos.1–5,12

Engraving: Fabrice De Volder / Mutopia Project. Original LilyPond and symbolic MIDI files are retained here. Nos.1, 2 and 4 are CC BY-SA 2.5 (https://creativecommons.org/licenses/by-sa/2.5/); Nos.3 and 5 are CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Derived event data retains these licenses. Individual source URLs, MIDI hashes and statistics are in manifest.json.

Regenerate with `python3 scripts/import_sor_op60.py`. This reuses the standard-library MIDI reader from import_bwv1012.py. All tracks, chords, rests and note lengths are preserved; written sections play once (the source MIDI does not unfold volta repeats). Initial MIDI setup silence is removed. Nos.1–2 lack the guitar transposition present in Nos.3–5, so their MIDI pitches are lowered by 12 semitones to sounding pitch. Fixed audition tempi replace source tempi; the existing player applies its normal note gate and release. Nos.4–5 begin with pickups, retained at beat zero.

Vendored LilyPond source whitespace and line endings are normalized; musical content is unchanged.

No.12: engraving by Hajo Dezelski, Mutopia-2010/04/04-1752, CC BY-SA 3.0. Source MIDI pitches are retained, with a fixed quarter-note tempo of 80 BPM and 2/4 meter. Both written alternate endings are retained as encoded in the source MIDI, without unfolding repeats.
