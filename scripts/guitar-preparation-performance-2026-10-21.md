# Guitar preparation responsiveness — 2026-10-21

The reported symptom was intermittent unresponsive mouse movement after the wound-string release. Guitar preparation previously queued every visible, preview and selected-score pitch in one burst, and continued obsolete work after settings changed.

## Changes

- The normal bridge model exposes resumable 1024-sample steps. The synchronous `render` API consumes the same steps without waiting; the Worker consumes them asynchronously, giving the CPU an 8ms pause after roughly 6ms of work. A chunk can overshoot that budget, so this is cooperative throttling, not a real-time scheduling guarantee. Normal loops are used to keep arithmetic overhead low.
- Worker requests run sequentially even when asynchronous rendering pauses. The audio calculation and its sample-time clock are unchanged. The resulting samples match the approved hashes at both sample rates.
- Initial preparation covers the 13 visible keyboard notes. Preview buttons and note auditions request their own pitch. Score pitches are prepared when playback is requested, before scheduling starts; they are not generated just to play the keyboard.
- Stop, settings changes, instrument changes, octave changes and leaving the page terminate obsolete Worker work. A generation token prevents stale completion from filling the cache or restarting preparation; pending consumers finish without reporting a false synthesis error.
- Obsolete settings are pruned toward a 32MiB guitar-cache target. Notes belonging to the current setting are retained, so a very large current score can exceed this target. There is no unbounded retention of every old settings combination.
- The waveform display updates at about 30fps, and pauses when hidden. Worker/module URLs carry a matching version to avoid using an old cached synthesis implementation after deployment.

First use of an uncached low preview or a new score can require preparation. Giving CPU time back can increase per-note wall-clock generation time; the aim is to keep interaction responsive while reducing unnecessary work.

## Validation

`nylon-worker-responsive.test.cjs` exercises the asynchronous Worker path, verifies repeated yields, one active render at a time and FIFO completion, and compares output with the approved release hashes. The existing synthesis, score and editor tests cover the synchronous API and audio invariants.

`scripts/test_guitar_preparation.cjs [app-url]` runs the browser integration checks using an existing Playwright installation (`PMG_PLAYWRIGHT_MODULE` may point to its module path). It checks initial keyboard-only preparation, single-note previews, rapid-setting cancellation, instrument/stop cancellation, approved settings through the real Worker, score-only preparation and cache pruning. It runs in an isolated browser context, with a temporary in-memory test score; built-in scores remain protected. No dependencies are installed by the test.

Local Edge verification also exercised the existing sequencer browser test: editing, playback, loop transport, persistence and reload passed. The scripted editor test requires an autoplay-permissive headless launch because its DOM-triggered clicks do not create user activation.

A local three-note Node benchmark (E2/A2/D3, 48kHz) measured 1.87s process CPU / 1.71s elapsed before, and 1.82s CPU / 3.16s elapsed with cooperative pauses. All three output hashes matched. Process CPU includes runtime threads, so these ratios are not whole-machine CPU percentages and will vary by machine. The browser integration run recorded a 16.8ms 95th-percentile frame interval, including a roughly 250ms maximum across initial page load and all test actions. This does not establish that every OS-level cursor stall has been reproduced or eliminated.

A deployment test caught a late error callback from a terminated Worker. Handlers now capture their Worker instance and ignore stale callbacks; a canceled Worker cannot terminate or reject its replacement. `nylon-preparation-cancel.test.cjs` covers both this race and cleanup after a genuine current-Worker error. The browser test also invokes a late canceled callback explicitly.
