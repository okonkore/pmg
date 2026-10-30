# Bounded guard recovery for configured guitar

Local fix based on main `804c02f88fd6c63b46037b85a055eafaef1f3eef`.

Reproduction: shipped 520R, 500 mm scale, 100 mm pluck position, other settings at initial values (force 1.5457651114447049 N), B3/MIDI59/string2/open, 44100 Hz. Block4 fails at sample11840 (0.2684807256 s), guarded output -2.0265184902; state is still finite. Dense matrices also fail, at0.3084353741 s. Finer integration succeeds. This supports timestep instability, not removal of the output guard. User's Windows device sample rate is not yet confirmed.

`render-note.js` keeps the original block4 algorithm and termination rule. Only the exact safe-output guard error retries, using block2 then block1. Every attempt instantiates a fresh WASM engine from the same coefficients and allocates a fresh output array. Failed chunks and previous successful chunks of a failed attempt are discarded. No coefficient tuning, gain changes, clipping or guard relaxation. Three failed attempts stop with rate/string/fret/time/reason; worker adds the note name. Other exceptions are not retried. Worker termination remains the cancellation mechanism, including between attempts.

Cache namespace now includes `guard-retry-4-2-1-v1`. All old records remain but are not reused in this namespace (one-time regeneration cost). Persisted records identify the successful block and failed-attempt times. No partially rendered record is written. Active bank is replaced only on complete preparation success, as before. This policy version must change if retry order, numerical options or acceptance rules change. This bounded fallback does not promise stability for every setting or detect all sub-threshold integration errors.

## Targeted verification

Run from the checkout root:

```
node scripts/test_configured_render_retry.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_retry_worker.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_guitar_parallel_pool.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_guitar_ui.cjs
git diff --check
```

The numerical test compares the complete 15-second B3 wave at block2 and block1 against block1 at twice the integration sample rate (88200 Hz), holding the 44100-Hz coefficient model fixed. Even samples align because flow emits the pre-update pressure. This is timestep convergence, not a separately validated physical truth or a new coefficient model. The test requires refinement to reduce relative RMS error by more than 2.85 times in each of 0–1, 1–5, 5–12 and 12–15 seconds; exponential midpoint is second order. It compares raw full-duration waves, separately asserting that the worker's retained prefix is identical to block2. The existing negligible-tail cutoff is not mistaken for numerical error. It also compares successful standard650/80 E4 rendering bit-for-bit against the original direct block4 loop.

Browser test uses real module Workers and real IndexedDB, reproduces the exact B3 failure, cancels during retry, supersedes a retry with changed settings, injects a stale response after termination, checks previous-bank preservation, cache isolation and reuse, and persisted integration provenance. Existing pool test covers terminal failure cleanup, partial note reuse and concurrency. UI test checks normal configuration interactions. These are Linux Chromium checks, not Windows Chrome or iPhone tests. No broad note/parameter sweep, default-model changes, or publication is included.

## Observed results (local Linux run)

All four commands passed. B3 block2 versus the half-step reference: full15s relative RMS0.0048053164 (0.4805%), max absolute sample error0.0026119351. Window relative RMS:

| Seconds | block2 | block1 |
|---|---:|---:|
| 0–1 | 0.0050830694 | 0.0010304357 |
| 1–5 | 0.0021652456 | 0.0004334974 |
| 5–12 | 0.0004312483 | 0.0000851151 |
| 12–15 | 0.0002786961 | 0.0000544449 |

Real Worker saved573440 frames (~13.0032s) after the unchanged tail-bound cutoff; peak0.5123341084. Prior same-machine standalone15s probes took13.94s with block2 and18.97s with block1, including coefficient generation. Recovery additionally pays for the failed initial attempt (here only0.268s of simulated audio), plus new engine initialization; worst case can repeat almost15s three times. The convergence suite's79.04s timing covers recovery plus three full reference renders, not interactive preparation. Timing is machine-specific. No assertion equates this numerical convergence with real-guitar accuracy.
