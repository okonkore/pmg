# Sample repertoire batch 1

Three complete individual movements, no repeats and no da capo, added to the existing 19 samples.
Sources retrieved and rights checked 2026-10-29. Source `.ly`/`.ily` files are unmodified.

| PMG key | Work | Notes | Bars (3/4) | Score beats / last note end | Sounding MIDI range | Notes below E2 |
|---|---|---:|---:|---:|---|---:|
| menuet1007 | Bach BWV 1007 Menuet I | 134 | 24 | 72 / 72 | 36–64 (C2–E4) | 4 |
| menuet2_1007 | Bach BWV 1007 Menuet II | 126 | 24 | 72 / 72 | 38–63 (D2–E♭4) | 4 |
| sor35_22 | Sor Op.35 No.22 | 416 | 48 | 144 / 143 | 40–71 (E2–B4) | 0 |

## Rights and attribution

- **Fernando Sor, Op.35 No.22**, original edition N. Simrock; engraving Glen Larsen, © 2013, Mutopia-2013/08/18-1850. [Edition and rights](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1850); [source](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/SorF/O35/sorf_op35_no22/sorf_op35_no22.ly).
  Original engraving and the derived MIDI/event score data here are **[CC BY-SA 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/)**. Preserve attribution, license link and indication of modifications; share adaptations of this score data under the same license. This notice does not relicense the application code.
- **J. S. Bach, BWV 1007 Menuet I and II**, Schirmer 1916; engraving Andreas Scherer, Mutopia-2018/01/19-517. [Edition and public-domain declaration](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=517). The typesetter placed this edition in the public domain; retained `header.ily` includes that declaration. [Source directory](https://github.com/MutopiaProject/MutopiaProject/tree/master/ftp/BachJS/BWV1007/bwv1007/bwv1007-lys) contains the retained wrapper `bwv1007.ly`, header and two movement sources.

## Conversion and musical checks

MIDI was compiled locally with GNU LilyPond 2.24.4 from these sources, rather than fetched from Mutopia's MIDI download. No external MIDI dependencies are needed to regenerate event JSON from the vendored `.midi` files. The manifest hashes both engraving and MIDI and records source URLs and modifications.

```
python3 scripts/import_repertoire_batch1.py
# Optional full MIDI rebuild with a separately installed LilyPond 2.24.4:
python3 scripts/import_repertoire_batch1.py --lilypond /path/to/lilypond
python3 scripts/test_repertoire_batch1.py
node synth-demo/bach-1012.test.cjs
```

The Bach compile wrapper exactly retains the edition's `transpose c c,` (one octave down) and clef. Do **not** shift the resulting MIDI a second time. The two 24-bar movements play separately without repeats or Menuet I da capo after II. Source tempo half-note = 60 becomes quarter-note = 120. Low cello notes remain unchanged. These are original cello pitches, **not guitar arrangements**.

Sor compiles its original MIDI block without transposition (quarter-note = 100). `treble_8` already displays the written octave above the sounding pitches used by this LilyPond source: the opening is bass B2, melody D4, accompaniment D4–B3–F♯3. Checkpoints include all three opening events, the six-beat bass tie across bars 1–2, the final B2/D3/B3 chord and the last quarter rest. All voices, including overlapping unisons, remain: there is no deduplication. The final notes end at beat 143; explicit `endBeat: 144` preserves the final rest in playback, copies and JSON. Range alone does not prove guitar fretboard playability.

Bach checkpoints include Menuet I's opening G2/D3/B3, the G2/D3/B3 chord in bar 4 and final G2/G3 dotted halves; Menuet II's opening B♭3/A3/B♭3 and final G2 dotted half. Tests check exact event equality to MIDI, stable counts/ranges/ends, source hashes, menu integration and source metadata through copy/export/import.

Notation-only dynamics, fingering, slurs and fermatas are not expressive event automation; tempo is fixed and the application's existing playback articulation remains unchanged. LilyPond reports one harmless deprecated property-path warning in Sor's original layout block; all three compilations succeed without bar-check failures.

## Follow-up candidates (not imported)

Sor Op.35 No.17 and Op.6 No.11 (candidate editions CC BY-SA 4.0), Bach BWV 1009 Bourrée I (candidate PD edition). Reverify edition, rights and sounding pitches before importing. For the minuets, a separately labeled guitar arrangement could be considered later; no low notes have been silently replaced here.
