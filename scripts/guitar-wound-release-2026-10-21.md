# Wound-string release — 2026-10-21

The reference recording's high band has a brief attack with little audible sustain. The previous synthesis retained audible upper partials. This update applies the reviewed high-decay sound to classical-guitar wound strings 4–6, with their approved excitation balance and two-polarization texture. It does not replay recorded audio or add a body strike.

The app enables `stringTexture:1` and `highDecay:1` together with `referenceTone:1`. The model's new optional parameters default to zero; existing reference-tone OFF and body-fit OFF paths remain available. The new wound release is restricted to strings 4–6. Plain strings 1–3 and the seventh string retain their previously published waveforms.

- The wound excitation profile redistributes, rather than increases, initial pluck energy. The fifth string interpolates between low and upper wound-string profiles; no dedicated fifth-string reference recording was supplied.
- The accepted texture changes the two polarizations' relative participation on strings 5–6. The fourth string keeps its prior polarization setting.
- Upper string modes retain their original first 25ms. Additional damping ramps in over 25–50ms, with a smooth frequency transition from 720 to 880Hz and up to 30/s amplitude loss above that. Lower modes are retained; energy only dissipates.
- The shared body radiation profile and plain-string decay remain as previously published. The reference recordings are standard tuning, so disable Drop D when comparing open E2. Drop D remains supported.

In the local E2 comparison, at identical before/after gain, the >800Hz band fell about 20dB over 80–200ms and 39dB over 200–500ms. Low/mid band RMS changed less than 0.002dB in the measured windows; the first 25ms was retained. These are before/after measurements on one reviewed note, not an independent perceptual-quality score or a claim of exact instrument identification. The app's filters and effects can further change playback.

## Validation

`nylon-wound-release.test.cjs` compares both 44.1/48kHz outputs for E2/A2/D3 with hashes saved from the reviewed implementation before integration. It also compares G3/B3/E4/F♯4/A4 and seventh-string B1 against the pre-update public implementation. `nylon-wound-approved.json` contains these synthesis-only regression hashes.

Tests cover unchanged raw attack, fixed initial energy, passive energy and radiation budgets, Drop D and worker control extremes, plus legacy OFF paths. The existing audio, score and sequencer tests pass. In a real Edge browser, the app's worker matched the reviewed waveform within 5.9e-11 maximum sample error (browser/Node floating-point differences), and preparation, reference-tone switching, cache reuse and preview playback worked without JavaScript errors.

Raw references, analysis, trial waveforms and previous comparisons are stored only under gitignored `reference-recordings/`. The public comparison WAV remains explicitly dated 2026-10-20; current 4–6 string tones can be heard using E2/A2/D3 preview buttons in the instrument.
