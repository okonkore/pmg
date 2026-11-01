# Positive scales without fixed dimension bounds (local candidate)

Base: `428a0f4f8c40a47a8aae6c086f4e9a98ad9574a6`. No publication.

The former 500–750 mm range was a settings restriction, not a demonstrated physical boundary. Scale now accepts any finite positive number, with no fixed lower or upper dimension cap. Fractional millimetres are retained in settings and cache identity. Existing v1 settings need no migration. Browser modules have new URLs; the waveform cache policy is unchanged because previously accepted, successfully rendered conditions have unchanged numerical inputs.

This is not a promise that every positive scale renders. All six open strings must have positive finite inferred tension, because the coupled model also uses their total load. With linear density μ, bending rigidity EI and desired open frequency f, the existing stiff-string relation gives

`T = 4 μ f² L² − EI π² / L²`.

The zero-tension boundary is `(EI π² / (4 μ f²))^(1/4)`. It depends on the selected string, not a universal UI minimum. Initial 520R parameters reach the first limiting boundary at approximately 53.783376 mm (third string, G3). Zero/negative tension is rejected, not replaced with another tuning. Virtual bass notes below E2 have their own tension check; explicit string choices still require frets 0–19.

The former 10 mm lower endpoint in the stopped-length solver is replaced by the smaller of that endpoint and half the ideal flexible-string length. Positive bending stiffness makes the required length at least the ideal flexible-string length; thus the new endpoint brackets the root without inventing a length cutoff. The upper endpoint and 64 iterations remain. A relative frequency residual above 1e-10 rejects unresolved results. Historical 650/500 mm note conditions match exactly for all 88 pitches each; two representative C++ coefficient binaries match exactly as well.

Existing numerical protection remains: coefficient validity, finite safe output, complete restart at blocks 4 → 2 → 1, at most three attempts, no partial failed audio, no guard threshold change. Failure retains the prior bank and terminates Workers. Errors identify the string/note or fret and sample rate where relevant. No clipping, normalization, retuning or substitute audio is introduced.

## Bounded verification

`node scripts/test_short_scale.cjs` checks analytical boundaries, extreme numbers, exact fractional settings/cache identity, a 3.425 mm stopped length against an independent quadratic solution, and pinned historical parity (requires the base commit in local Git history).

`node scripts/test_short_scale_render.cjs` uses actual WASM coefficients and the complete production rendering duration:

| Scale | Note / string / fret | Sample rate | Result |
|---|---|---|---|
| 300 mm | E2 / 6 / 0 | 44100 | pass, block 4, peak 0.17451 |
| 100 mm | E4 / 1 / 0 | 48000 | pass, block 4, peak 0.10207 |
| 60 mm | B3 / 2 / 0 | 44100 | pass, block 4, peak 0.07255 |
| 60 mm | B5 / 1 / 19 | 48000 | pass, block 4, peak 0.07954 |
| 55 mm | G3 / 3 / 0 | 44100 | pass, block 4, peak 0.07352 |
| 10 mm, deliberately thin/soft/dense virtual strings | B5 / 1 / 19 | 48000 | safe-output rejection after all three attempts |

The last example uses all plain strings, diameter 0.1 mm, Young modulus 0.1 GPa, density 20000 kg/m³ and loss 0.02. Positive tension alone does not guarantee numerically acceptable audio. The rejection is not evidence that every 10 mm configuration must fail. Successful preparations took approximately 6.7–9.4 seconds each on this cloud machine, generating 12–15 seconds according to the existing tail cutoff. This does not predict Windows/iPhone speed.

`PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_short_scale_browser.cjs` covers fractional input and actual one-note preparation, persisted reload, cancelled drafts, invalid settings, actual failed Worker cleanup, old bank retention and cache reuse. Existing retry lifecycle tests additionally exercise cancellation, setting replacement, stale replies and 500 mm retry provenance.

## Limits

The body remains fixed; changing scale does not regenerate its shape. Standard tuning and existing diameter/material ranges remain. Pluck position is still limited to 90% of the vibrating length, and actual force is still limited by the existing 5 mm static-displacement cap. At very short scales displacement can be large relative to length; the thin-string/elastic approximation and idealized fretting are not validated as a real instrument. Finite, bounded output is not proof of acoustical accuracy or full time-step convergence. Existing sample-rate support (32000–96000 Hz), finite mode resolution, maximum 15-second note, memory limits and finite retries remain practical limits. No all-pitch/all-material sweep or physical-device listening was performed.

## Final local checks

Previous lower-bound-only checkpoint: 17 commands passed:

- Three new checks: `test_short_scale.cjs`, `test_short_scale_render.cjs`, `test_short_scale_browser.cjs`.
- Nine Node suites: `note-string`, `sequencer-model`, `song-playback`, `tab-model`, `bach-1012`, `playback-timing`, `midi-import`, `string-sets`, `repertoire-catalog` (`synth-demo/*.test.cjs`). Catalog remains 55 songs.
- Two physics/render checks: `scripts/test_note_string_physics.cjs`, `scripts/test_configured_render_retry.cjs`. The latter reconfirms the original 500 mm B3 case: block 4 fails at sample 11840, block 2 succeeds; whole-wave relative RMS difference versus the half-step reference is 0.0048053 and finer steps improve all four time windows. The successful default block-4 path remains sample-exact.
- Three browser regressions: `scripts/test_configured_guitar_ui.cjs`, `scripts/test_guitar_parallel_pool.cjs`, `scripts/test_configured_retry_worker.cjs` (same Chromium executable environment variable as above).
- `git diff --check` passed.

Test development failures were test-harness issues: zero-input message wording, then a mutated built-in score being restored by the editor, and the import action closing the settings dialog. The final browser test imports a one-note document, reopens setup, and runs real Workers. It passed with exact `100.123456789` mm persistence and confirmed that the deliberate 10 mm failure preserves the old playable bank. No Windows Chrome or iPhone hardware was available.


## Upper-bound extension and rupture uncertainty

The 750 mm cap is also removed in this local extension. UI `max` is absent; positive finite scales are accepted. Aggregate six-string tension is checked for finite arithmetic in addition to each string. `Number.MAX_VALUE` and `1e200` pass dimension syntax but are rejected before WASM because the inferred tension calculation exceeds numerical range. No new dimensional cutoff is substituted.

Actual retained inputs contain diameter, density, Young modulus, damping and inferred winding geometry, but no ultimate tensile strength, breaking load, elastic limit or creep data. `scripts/build_520r_spruce.py:22–37` derives density/core geometry from nominal tuning tensions, not breaking loads. In the current `settings.js` section calculation, plain-string axial stiffness is E times circular area; wound-string axial stiffness is E times `coreFill * π * coreDiameter² / 4`. The wrap contributes helical mass and the model distinguishes bonded and relaxed bending rigidity; it does not provide a measured combined core/wrap rupture criterion. Neither modulus nor density establishes Savarez breaking strength. Existing virtual preset notices already exclude rupture, creep and neck strength.

Accordingly the UI explicitly states that rupture is not assessed and numerical success does not establish real-world safety. No automatic "string will not break" label or guessed cutoff is added. If physical rupture gating is wanted later, the minimum decision/data is a credible per-string breaking load (with applicable conditioning and uncertainty), or explicitly user-supplied assumed strength together with a chosen load-bearing section. Wound-string composite rupture and pluck-induced additional tension require a separate defined model; they are not implemented here.

At high tension the fixed-body model updates geometric preload but does not rebuild body geometry, material failure or prestress equilibrium. This is an extrapolated virtual instrument, not a validated long physical guitar. Existing 61 string-mode ceiling, finite note duration, output guard, finite retries and cache/memory constraints remain unchanged.

Final upper-bound-extension verification: 13 commands passed (updated analytical test, full short/long render test, browser test, nine Node suites listed above, configured-guitar UI browser regression). The upper-bound browser run uses `1000.123456789` mm and confirms exact save/reload, cancelled drafts, real generation, old-bank retention after the deliberate 10 mm failure and cache reuse. The analytical test now checks per-string overflow at `Number.MAX_VALUE`/`1e200` and aggregate tension overflow at `1e156`; all are rejected before coefficient generation. Historical 176 note conditions and two coefficient binaries still match exactly.

Additional full-duration render observations (unchanged common production gain):

| Scale | Note / string / fret | Sample rate | Static tension | Result |
|---|---|---|---|---|
| 1000 mm | E2 / 6 / 0 | 44100 | 146.22934 N | block 4, peak 0.27364, 9.95 s computation |
| 2000 mm | B5 / 1 / 19 | 48000 | 640.62892 N | block 4, peak 0.22035, 8.09 s computation |

The five earlier short-scale cases passed again. The thin 10 mm case still fails with the unchanged guard after three attempts. These large tension values are reported model inputs, not verified survivable string loads. No long-scale whole-wave step-refinement study, all-material sweep, real-world rupture test or hardware listening was performed. Existing retry/cancel/stale protections were not modified. No push or publication occurred.
