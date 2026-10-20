# Nylon Guitar: first isolated-note reference adjustment

Six pitches were supplied as isolated guitar notes: E2 (6th string open), D3 (4th open), G3 (3rd open), E4 (1st open), F♯4 (1st fret 2) and A4 (1st fret 5), with 19 plucks in total. The user confirmed holding the F♯4 fret through its short decay, and explicitly preferred an enjoyable guitar character over exact reconstruction.

## Change

`NylonReferenceFit` changes only the 14 shared body-mode radiative fractions. Modal frequencies, losses, coupling, initial string excitation, attack energy, phases, and pluck-position mapping are unchanged. The mechanical states and energy histories remain identical to the previous profile. No pitch-specific branches, recorded waveform or measured impulse-response playback were added.

The UI explicitly passes `referenceTone: 1`. Turning **録音を参考にした音色** off selects the exact previously accepted `NylonBodyFit` profile. The API defaults `referenceTone` to 0 for compatibility with existing callers. The new switch is disabled unless both bridge and body-fit processing are enabled; it participates in worker settings and cache identity. Turning body fit off still selects the older unadjusted model.

## Method and limits

Analysis used mono averages of the original stereo recordings, decoded at 48kHz. Harmonic bands were compared at each recording's estimated pitch and the synthesizer's nominal pitch, in 40–160ms and 160–360ms windows. The first window carried more weight. Individual targets were softened to avoid pursuing tiny spectral nulls, with bounded gain changes and regularization across body modes. Broad 1.5–5kHz energy was also considered. Decay coefficients were not fitted to the recordings.

Several shared pluck mappings were explored. The selected candidate retains the original mapping and phases, changing observation gains only. All but the final pluck of each pitch were used to estimate coefficients. The final plucks were used for candidate checks; because these checks informed selection, they are not a fully independent final evaluation.

Capped mean absolute harmonic-level differences on these final plucks (dB):

| Pitch | Before | After |
| --- | ---: | ---: |
| E2 | 7.65 | 5.28 |
| D3 | 10.92 | 7.53 |
| G3 | 10.85 | 6.96 |
| E4 | 5.98 | 4.82 |
| F♯4 | 10.67 | 11.60 |
| A4 | 7.95 | 7.09 |
| Mean | 9.00 | 7.21 |

This is an early-spectrum diagnostic, not a perceptual quality score. F♯4's recording match gets worse; its distinctive rapid recorded decay is deliberately not imposed on the synthesizer. Its one-second relative tail is approximately 1dB stronger after the adjustment. Recorded microphone/room effects remain confounded with instrument response. The comparison excludes the browser's output filter, compressor and delay.

A local 30-second comparison contains synthesized E2, D3, G3, E4, F♯4 and A4, each before then after. Each clip has matched 40–140ms RMS, with a shared final gain to avoid clipping. User recordings and analysis waveforms remain in the ignored `reference-recordings` directory and are not shipped to GitHub Pages.

## Checks

`nylon-reference-tone.test.cjs` checks byte-identical previous-profile output for six pitches, unchanged mechanical energy histories, passive energy budgets, full-range finite output at 44.1/48kHz, worker settings and no forced F♯4 tail shortening. Existing synthesis and sequencer tests are retained. Browser checks cover real Worker preparation, distinct before/after caches, exact cache reuse when switching back, preview playback, and switch disabling.
