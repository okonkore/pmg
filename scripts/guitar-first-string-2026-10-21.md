# First-string listening trial — 2026-10-21

The user chose to work on string 1 while no second-string reference exists. This trial uses the supplied open E4, second-fret F♯4 and fifth-fret A4 recordings. The accepted third-string tone remains in the main instrument; first-string changes are opt-in via `firstTone:1` for the comparison only.

The three notes have substantially different excitation spectra. E4's third/eighth partials were too prominent and its tail too long; F♯4 lacked several middle/upper partials; A4's sixth partial was about 19dB too strong in the selected reference comparison. A common high shelf would not fix these differences.

`NylonFirstExcitation` contains three fret anchors, with continuous interpolation of log-amplitude excitation gains, nonnegative per-mode losses and measured stiffness. Beyond the highest anchor, stiffness scales gradually with shortening and is capped. Each note redistributes the same initial pluck energy. The body radiation profile is retained, and no reference sample is played by the model. A 12ms acoustic onset window softens the original immediate rise. These are fitted excitation/observation coefficients, not uniquely identified physical guitar parameters or a claim to remove microphone effects.

All ten recorded takes inform stiffness/decay and variability. Initial timbre is fitted mainly to the second take used by the public comparison, with a small contribution from the take median to limit outliers. F♯4's unusually rapid recorded decay is deliberately not copied: its extra loss interpolates between E4/A4, honoring the user's earlier preference. In the selected windows the candidate's F♯ tail at about 1.15s is around -14.7dB, versus the recording's -20.7dB.

For the selected reference, initial (40–140ms) mean absolute level error over harmonics 2–12 fell approximately from 4.6 to 0.2dB on E4, 7.8 to 0.3dB on F♯4, and 7.3 to 0.4dB on A4. These are diagnostics on the fitting excerpt, not an independent listening evaluation. Later envelope shape, transient texture and microphone/room differences still require the user's comparison.

`/reference-comparison/first-comparison/` lets the listener select E4/F♯4/A4, then reference/before/after in full, below500Hz, 500–2000Hz or above2000Hz. `?note=66` selects F♯ directly. All sources use the same complementary FIRs, initial full-note RMS and pitch alignment, final fade and common headroom. The optional band matching changes attack levels; start with it OFF. Only authorized 3.1-second excerpts are public; originals and measurements remain under ignored `reference-recordings/first-string-2026-10-21/`.

Reproduce with existing Node and Python/numpy:

```sh
node scripts/render_first_string_comparison.cjs
python scripts/analyze_first_string.py
python scripts/build_first_string_comparison.py
python scripts/publish_reference_comparisons.py
```

Validation: `nylon-first-tone.test.cjs` checks the targeted E/F♯/A partial changes, bounded passive energy, preserved initial pluck energy, finite interpolated/higher notes, retained F♯ sustain, OFF paths and exact accepted third/wound/second strings at 44.1/48kHz. Third-approved and responsive-worker regressions pass. `test_first_comparison.cjs` checks all 72 listening clips, three note/source selections, both gain modes, mobile width, sequence cancellation, deep links and absence of JS errors. It accepts a base URL and the existing `PMG_PLAYWRIGHT_MODULE` override.
