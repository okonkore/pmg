# Preparation tiles and room-tail candidate

Base: `3ebb5ece2aaa85ad0324701c6719b923b39fddea`. Initial candidate review was local only. The user subsequently approved publishing this candidate together with the distinct transport controls.

The shared preparation view contains exactly one tile per unique requested MIDI note. Configured-guitar prepares a chosen subset, all 88 keys, or the benchmark's four pitches; legacy Nylon prepares its existing 88-key range. Symbols distinguish waiting (dot), running (ring), completed (check), cached (return arrow), failure (!) and cancelled (dash), with per-note accessible names. A reduced-motion preference disables the running glow. Dialogs scroll internally; no full-document scrolling is added. Legacy preparation now has a keyboard-accessible Cancel/Escape control. Failure leaves the dialog available to inspect and dismiss. Unattempted notes retain their waiting state instead of falsely claiming they failed.

Configured progress uses the bank's existing checked note/stage events and reused counter; no new completion estimates, random animation progress or synthesis work is introduced. The bank already rejects old-generation worker responses. View tokens reject updates after cancellation/restart; legacy preparation keeps its generation/signature checks. Actual two-note WASM preparation verifies completed tiles, actual cache replay verifies reused tiles, and existing concurrency/cancellation/settings tests remain intact. Separate injected-failure/deferred-response fixtures test UI orchestration only, not audio correctness.

The previous room impulse was 1.4 seconds with exponent -6 and a maximum linear wet mix of .35. The candidate impulse is 3.2 seconds with exponent -6.9 and a maximum mix of .65. The existing single amount slider remains; no new controls or persistence schema. Default remains zero and convolver input is disconnected at zero. Existing 30 ms mix ramps, 15 ms master smoothing and protected output branch remain unchanged. Stop/navigation continue clearing room history; normal note release allows the tail to ring. Instrument physics, coefficients, note data and tuning are untouched.

Real OfflineAudioContext measurements on the same decaying 220 Hz test pulse, maximum amount:

| Quantity | Published | Candidate |
| --- | ---: | ---: |
| Total squared sample energy | 2.4218465 | 1.1489725 |
| Energy after 0.5 seconds | .0017841 | .0839620 |
| Energy after 1.5 seconds | ~0 | .0009419 |
| Peak | .0923755 | .0497406 |

Late energy as a share of total rises from about .074% to 7.31%; this is a decay/distribution change, not added overall loudness. A different signal may respond differently; no perceptual listening claim is made. Old/new zero-amount sample error is exactly 0 in the fixture. Existing full normal/physical default-path test also reports 0. Repeated live wet changes and output protection remain covered by real WebAudio tests.

Screenshot `/tmp/pmg-preparation-tiles.png` uses explicitly set demonstration states to show the 88-tile layout; it is not a measured generation-progress snapshot. The actual-generation assertions are in `test_configured_guitar_integration.cjs`. Test logs are under `/tmp/pmg-preparation-tests`. Chromium mobile emulation covers 390×844, 320×568, 844×390 and 390×320; real iPhone Safari and human listening remain unverified.

Final validation: 58/58 commands passed after the product changes (36 module, one preset, 16 browser, five Python scripts). Repeated wet automation fixture maximum adjacent-sample step and peak are recorded in test_preparation_visuals.cjs.log. No commit/push/deployment was performed during that initial candidate validation.

Approved combined release validation: 59/59 commands passed (36 module tests, one preset test, 17 browser tests and five Python scripts). Logs: `/tmp/pmg-ui-release-tests/results.json`. Initial reverb remains 0; full default-path sample error is 0; protected boosted peak .95708. All 542 baseline instrument/model-lab/reference/audio assets are byte-identical. No MIDI timing/import or tuning changes are included. Public Pages hostname remains outside the executor network allowlist; Actions confirmation is distinct from live-site inspection. Real-device iPhone Safari and human listening remain unverified.
