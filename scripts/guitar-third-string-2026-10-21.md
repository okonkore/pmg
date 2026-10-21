# Third-string G3 listening trial — 2026-10-21

The current synthesis had a second harmonic almost level with its fundamental, versus roughly 15dB lower in the user's G3 recordings. Several following harmonics were also much too strong. A broadband low-pass alone would not correct this balance.

`NylonThirdExcitation` provides a third-string-only excitation balance and nonnegative per-mode loss, fitted across the three supplied G3 takes. `thirdTone:1` opts into it when the shared reference profile is enabled; its default is zero. Initial pluck energy is redistributed, not increased. The passive body/string exchange and body radiation remain unchanged. Higher modes use the final profile entry. These are synthesis coefficients, not recorded playback or a measured physical impedance.

The production instrument retains its current sound while the new candidate is available at `/reference-comparison/third-comparison/`. It presents reference / unchanged synthesis / candidate, with full / below500Hz / 500–2000Hz / above2000Hz and optional independent band attack level matching. Start with full sound and matching OFF. The original treble and wound comparison audio is retained.

Measured against the same three takes used for fitting, mean absolute harmonic-level error fell from 18.79 to 3.82dB, for harmonics 2–8 in four windows (40–140, 150–400, 500–800 and 1000–1300ms), excluding reference components below -50dB relative to the initial fundamental. Mean absolute overall decay error across the selected windows through 2.3 seconds fell from 1.41 to 0.57dB. These are fit-set diagnostics, not an independent listening evaluation or proof of identical timbre. Microphone, room, beating and recording noise remain part of the references.

Reproduce with existing Node and Python/numpy:

```sh
node scripts/render_third_string_comparison.cjs
python scripts/analyze_third_string.py
python scripts/build_third_string_comparison.py
python scripts/publish_reference_comparisons.py
```

Raw intermediate notes, three-take measurements and energy diagnostics remain under ignored `reference-recordings/third-string-2026-10-21/`. Selected listening excerpts are published under the user's existing authorization.

Validation: `nylon-third-tone.test.cjs` checks significant second/third harmonic reduction, unchanged initial pluck energy, passive radiation/energy budgets, finite fretted notes, and exact unchanged other strings / OFF paths at both common rates. Existing wound-release and responsive-worker tests pass. At a 390px touch viewport, all 24 comparison WAVs decoded and played; gain modes, per-band/global sequences, stop and seek worked without JS errors.
