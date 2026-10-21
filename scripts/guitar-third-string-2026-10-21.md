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

## High-band revision (g3-high-2)

The user's comparison feedback identified the recording as brighter. The original high-partial analysis used narrow bands around integer multiples of f0. G3 upper partials are measurably stretched: clear peaks across the three takes give a median stiffness coefficient about 0.0001037, versus the model's original 0.000003. For example the reference's strong thirteenth partial is near 2.56kHz, beyond the old integration window. Its energy had been underestimated and the candidate attenuated it too far.

The opt-in third-string trial now uses the measured stiffness, 48 individual excitation/loss entries, and a revised upper-partial balance. Baseline pluck energy is explicitly retained even though the frequency-dependent release response changes with stiffness. Loss remains nonnegative; other strings and the main instrument's default remain unchanged.

At 50–150ms, relative to the full-note initial RMS, the three references' median 2–3kHz level is approximately -29.5dB. The previous trial was -38.4dB and the revised trial is about -30.2dB. The 3–4kHz and 4–6kHz band balances also move closer in this window. This does not mean the spectral centroid must rise: restoring missing 2.5kHz energy changes the high-band color rather than applying a broad high shelf. Very early broadband contact sound and late recording noise are not reproduced by this harmonic fit.

The comparison's “前回” now plays the previous G3 trial (`previous.f32`), while “今回” plays the revision. The prior public page and WAVs were archived locally under `reference-recordings/third-string-2026-10-21/previous-public/`. Audio URLs include `v=g3-high-2` so an iPhone with cached older clips receives the new versions. `analyze_third_high.py` reproduces the time/band measurements; `test_third_comparison.cjs` accepts an optional base URL and exercises the 24 WAVs and touch-width playback. The third-tone regression also checks the high partial's actual shifted peak and restored level.

## Thin/dry upper texture revision (g3-high-3)

The user still described the real high band as thinner. Onset band levels alone were already close, but the synthesized upper band was almost entirely discrete partials. In a common FFT-mask analysis, the reference's off-partial share in the first 40ms was about 10–14%, versus 0.8% for high-2. This is an observation proxy: room reflections, spectral leakage and microphone processing also contribute, so it does not uniquely identify a physical contact mechanism.

This candidate tests a short contact response while slightly reducing the dominant thirteenth partial by 2dB. It reserves 0.000002 of the remaining pluck energy in a separate contact reservoir, drives an orthogonal high-body port with deterministic band-limited roughness, and detaches it after 120ms with a fade. Three rapidly damped high body modes add upper bandwidth; their participation in the regular string port is zero. The output remains the radiating body states, without mixing a noise track or a reference sample into the sound. Every exchange preserves energy, body radiation dissipates it, and unused contact energy is counted in the release remainder. This remains opt-in and third-string-only; the main instrument is unchanged.

The resulting first-40ms off-partial share is approximately 6.9%. The 5–10kHz band changes from about -66.8 to -39.4dB relative to initial full-note RMS; the references are around -40 to -44dB. The model's 40–120ms level is about -50.8dB, versus reference -52 to -58dB. This improves the missing short upper component but is not a claim of identical perceptual texture. Late noise is not filled in to match the recording floor.

`high3/before.f32` retains high-2, and `high3/after.f32` retains this candidate under the private reference directory. `analyze_third_texture.py` reports the common mask/band measurements. The comparison now labels high-2 as “前回”, and audio URLs use `g3-high-3`. The high-2 public page and clips are archived locally in `high3/previous-public/`.

`nylon-third-contact.test.cjs` checks finite reserved energy, passive budgets, a restored but short 5–10kHz attack, and exact deterministic sync/async output at both normal sample rates. Third-tone, wound-release and responsive-worker regressions pass. No new browser audio computation is needed: the comparison uses the generated WAVs.
