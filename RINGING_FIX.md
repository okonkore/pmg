# 400 mm intermittent ringing: local numerical correction

Base `d21657aac555f10dc68e785798e6bdadfbae957e`. Local candidate only; no push/deployment. Catalog, text TAB, physical parameters, gain, reverb and filters are unchanged.

## Reproduction and cause

The catalog's `default` set is named `520R 推定条件（標準）`; it is an estimate, not manufacturer-calibrated strength or sound. Start from default settings with scale 400 mm, bridge pluck position 80 mm and force 1.5457651114447049 N. Only scale and the standard set are confirmed by the user; position/force remain assumptions. Reverb 25% is user-confirmed. iOS device sample rate remains unknown.

BWV 1004 Sarabanda uses Bb3/MIDI 58 (Auto: string 3, fret 3) 38 times, first at beat 1 (one second at default quarter=60), held for 1.5 beats before playback articulation. The old block-4 integrator at 48000 Hz produces a narrow 6000 Hz component, growing during approximately 0.03–0.1 seconds of that note and settling near amplitude 0.0858. This equals the Nyquist frequency of the nonlinear block update, 48000/(2*4). It is a numerical period-two oscillation, not supported evidence of a physical body resonance. Full 15-second old production rendering succeeds without hitting the existing absolute-output guard, so bad PCM can be cached.

Refining block 4 to 2 removes the component; block 2 and block 1 agree over the full first three seconds to relative RMS difference 0.0033235 (48 kHz). At 44.1 kHz this specific 6 kHz artifact is absent; block 2 versus 1 differs by 0.0039479. Ten relevant pitches were sampled for three seconds each at both rates, not the entire song/all-note space. Other parameters and hardware may behave differently. This is a strong reproduction consistent with the report, not confirmation of the user's actual device rate.

Actual RoomReverb in Chromium OfflineAudioContext, same mono source, no normalization, channel 0, Hann measurement over 1–2 seconds:

| Source | Reverb | 6000 Hz amplitude |
|---|---:|---:|
| old block 4 | 0 | 0.0857528 |
| old block 4 | 0.25 | 0.0726726 |
| refined block 2 | 0 | 1.92e-10 |
| refined block 2 | 0.25 | 4.22e-8 |

The effect can carry the source artifact but is not required to create it. This test isolates the room convolution; it is not the entire live compressor/output chain or an iOS test.

## Correction

`render-note.js` probes a shorter integration step from the same state at each 2048-sample chunk boundary. It compares the first 128 pressure samples with the ordinary chunk. A local RMS discrepancy above 1%, and above the existing 1e-6 absolute tail floor, rejects that attempt. The 1% is an explicit numerical accuracy budget, not a frequency/timbre criterion. There is no spectral filter or special case for 400 mm/Bb3/6000 Hz.

Rejected output is discarded entirely. A fresh model state renders at blocks 4 → 2 → 1, at most three attempts, with unchanged absolute-output guards and existing cancellation/yield behavior. The probe reuses one WASM engine, restoring modal state, age, phase, failed flag, tension diagnostic and half-step propagators even on exceptions. Scratch buffers are recomputed at the required block boundary. A few Float64 arrays are added, not another full engine per Worker.

The probe checks only blocks 4 and 2 and only sampled local windows; it is not a proof of global waveform error or unconditional stability. Block 1 retains the original safe-output checks. The unchanged production approximation switches to linear propagation after 12 seconds, where the probe is skipped. Quiet errors below the tail floor are not rejected. These limits are explicit rather than claiming universal convergence.

Both tested rates select block 2 for 400 mm Bb3 (at the first chunk). The 44.1 kHz attack also exceeds the local 1% budget despite not having this whistle; the refinement changes that note's numerical waveform, without changing strings, tuning, body, force, or gain. Standard 650 mm E4 remains sample-exact and block 4. The previous 500 mm/100 mm pluck B3 case is caught earlier at sample 10240 by the accuracy check; the unchanged raw coarse engine still hits its original guard at sample 11840. Its accepted block-2 PCM is unchanged.

Cache namespace changes from `full-pressure-m256-guard-retry-4-2-1-v1` to `full-pressure-m256-refinement-retry-4-2-1-v1`. Browser module URLs also change. Old suspect PCM is not reused; previously active playable bank survives cancellation/failure. Publication would require waveform regeneration.

## Cost and evidence

One same-machine sequential before/after measurement (not device benchmarks):

- 650 mm E4: 7.48 → 8.56 s (+14.5%), same complete output.
- 400 mm Bb3: 8.98 → 13.47 s (+50%), including restart and finer integration.

Local diagnostic scripts, JSON spectra, complete before/after PCM and two 1.5-second dry WAV clips are retained in `/workspace/pmg-400-ringing-logs`. Both clips use identical original gain and a shared 10 ms end fade; no peak normalization. They are not uploaded.

Regression tests cover real 400 mm generation at both rates, comparison with block 1 and a 96 kHz half-step reference, restoration on probe success/failure, a genuine linear 6 kHz component (no spectral rejection), exact 650 mm output, original 500 mm failure and full-duration refinement, actual Worker cache separation/cancel/stale response/old-bank retention, parallel pool behavior, per-note fingering/playback/loop/seek, 55-song catalog and text TAB. Native iOS listening and the user's complete song at their exact settings remain unverified.

Final local verification: 18 repository test commands passed (10 Node/catalog/model suites; two numerical rendering suites; six browser suites). `git diff --check` passed. During harness work, the old 500 mm assertion expecting detection at sample 11840 was updated to verify the new earlier accuracy detection at 10240 while independently retaining the raw-engine 11840 regression. One guessed text-TAB test filename and a missing local HTTP server were corrected before the actual text-TAB tests passed. No production assertions or safety thresholds were relaxed.
