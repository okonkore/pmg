# Provisional open-nut damping (local candidate)

Baseline: `ffa847989198917828302974b3df6c74c4b62a3f`. No push or publication.

The configured guitar adds a passive endpoint rotational resistance of
`2e-7 N·m·s/rad` on selected-string open pitches. Explicit and automatic opens
use the same coefficient. Explicit fretted notes keep `8e-7`; non-open Auto
notes and virtual basses keep their previous behavior. Existing nut/body
coupling remains. The shared scalar reaches the existing JS and WASM matrix
assembly; neither solver, ABI, nor gain is changed. Changed PCM namespace and
module URLs force regeneration while retaining old cached records.

This is a provisional extra loss, not an identified nut impedance. The
coefficient is one quarter of the listening-selected finger proxy; that ratio
has no independent material-measurement basis. Both transverse axes use the
same frequency-independent coefficient, measured relative to the moving
endpoint chord. The added power loss is `c * sum(thetaDot²) >= 0` in the
underlying continuous model. Support motion, groove friction, the string
behind the nut and frequency-dependent neck response are not resolved.

For an isolated weakly damped fundamental, the estimated **additional**
amplitude attenuation (dB/s) is shown below. This is an analytic estimate,
not fitted output decay or recorded data. The nth mode scales approximately
as n², and scale dependence at fixed linear density is L⁻³.

| String | 650 mm | 100 mm |
| --- | ---: | ---: |
| 1 | 0.16942 | 46.528 |
| 2 | 0.12150 | 33.366 |
| 3 | 0.07654 | 21.019 |
| 4 | 0.03362 | 9.232 |
| 5 | 0.02066 | 5.675 |
| 6 | 0.01160 | 3.185 |

Thus high partials can change substantially while low-string fundamentals
change little at normal scale. At short scale this same assumption becomes
strong and may over-damp real instruments. There is no arbitrary length cap
or scale-dependent fitted compensator. Numerical success does not validate
physical realism, material safety, or any universal parameter range.

The delegated prior analysis reported fourth-string open fundamental recording
4.7–5.3 dB/s versus old model 19.5 dB/s. Additional loss can worsen that mismatch.
The six Library recordings were not fetched, listened to, or remeasured in this
implementation. Recording agreement and perceptual improvement remain unverified.

## Verification

- `test_stopped_contact.cjs`: all 16 stopped-note/loss cases passed, including
  all six strings at fret20, sixth-string frets5/12, loss .02/.14, stable poles,
  finite/unclipped output, JS/WASM agreement and block2/block1 convergence.
- `test_nut_contact.cjs`: pinned-baseline binary comparisons for explicit
  stopped notes (frets1/20), non-open Auto notes and virtual bass; six automatic
  opens receive the nut coefficient. Six-string open waveform checks at
  650 and 100 mm include negative poles, output guards and backend/step errors.
- `test_short_scale_render.cjs`: all seven full preparations passed, including
  300 mm E2, 100 mm E4, 60 mm B3, 60 mm B5, 55 mm G3, 1000 mm E2, 2000 mm B5
  at 44.1/48 kHz. The deliberate 10 mm thin-string case still fails safely.
  The 100 mm E4 render retries from block2 to block1 after its refinement check.
- Chromium `test_stopped_contact_browser.cjs`: real Workers generated open and
  stopped PCM, reused both on repeat, retained prior-cache sentinel, and raised
  no page errors. Fret20 editor integration also passed.
- `note-string`, `sequencer-model`, `song-playback`: passed.
- `test_configured_render_retry.cjs` and `test_configured_refinement.cjs`: passed
  with pinned zero-contact fixtures (including original B3 retry and probe-state
  restoration). `git diff --check`: passed.

The historical retry regression now explicitly loads the pinned zero-contact
settings fixture to preserve its original B3 failure and block4-exactness
checks. Current open-note integration is covered by the nut/full-render tests.
The general refinement regression likewise uses pinned zero-contact settings
so its original block4 fixture remains independent of nut loss.


Accuracy qualification: 650 mm all-six-string JS/WASM relative RMS differences
were at most 3.95e-8 and block2/block1 differences at most 0.000445 (0.0445%),
with 2-second 48 kHz renders. At 100 mm string1, block1 JS/WASM difference was
0.023346 (2.33%) and block1 versus half-step was 0.010243 (1.02%). These exceed
the normal 0.3%/0.5% comparison budgets. Full render completion and negative
poles do not establish those accuracy budgets. Short-scale diagnostics report
both current and baseline errors instead of labeling this an accuracy pass.

650 mm output peaks across six strings: 0.31376, 0.43093, 0.42134, 0.26314, 0.50333, 0.26245. No clipping or unstable poles were observed.

## Completed 100 mm diagnostics

Errors below are relative RMS percentages over two seconds (48 kHz). Backend
compares JS/WASM at block1; step compares WASM block1 against 96 kHz block1.
These are diagnostics, **not** passes of the normal accuracy budgets. All six
outputs were finite/unclipped with negative poles.

| String | New backend % | Old backend % | New step % | Old step % |
| --- | ---: | ---: | ---: | ---: |
| 1 | 2.3346 | 0.0000 | 1.0243 | 10.3598 |
| 2 | 2.9333 | 3.4144 | 0.7854 | 5.8738 |
| 3 | 0.6670 | 1.5833 | 2.8409 | 11.9306 |
| 4 | 1.7790 | 1.0570 | 0.0414 | 0.0933 |
| 5 | 0.4922 | 0.4693 | 0.0460 | 0.1559 |
| 6 | 0.3015 | 0.2895 | 0.0171 | 0.0450 |

Machine-readable results: `nut-damping-results.json`. The initial nut test
failed the normal accuracy thresholds at 100 mm; the final test deliberately
keeps strict 650 mm assertions and reports 100 mm failures as diagnostic
limitations. No production guard or tolerance was weakened to obtain completion.
