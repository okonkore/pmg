# App-style UI milestone

Base: `1807fc7`. Local UI-only work; no commit, push, PR or deployment.

## Structure

`app-shell.js` imports the unchanged configured-guitar module, then moves existing DOM controls into a fixed application frame. Audio/playback functions, sequencer model, song registration, source metadata and storage keys remain owned by their original modules. No duplicated controls or values.

Routes: performance (empty hash), `#piano-roll`, `#library`, `#instrument`. Four persistent navigation buttons. The shell delegates the existing editor route hooks and retains browser Back/Forward. Library rows are built from the existing `#song` options and optgroup labels, including user songs; adding repertoire needs no shell change.

Dialogs: mixer, playback, editor menu, grid/display, note inspector, song settings/files, help/sources, instrument information. Shell sheets use history state for Back dismissal and Forward restoration, Escape, focus return and native focus trapping. Existing guitar dialogs retain their validation, cancellation and dirty string-set confirmation, including cancellation requested by browser Back. Preparation concurrency and benchmark are inside expandable details.

The document is fixed; piano roll, library, instrument view and dialog bodies own their scroll. `100dvh`, safe-area padding and unscaled `visualViewport.height` handle available height. At accessibility pinch scales other than 1, the shell does not apply inverse scaling. No new touch preventDefault handlers and no global zoom restriction. Form fields are 16px in sheets. Source/license text is moved to Help, and exports retain their source fields.

## Tests

Serve the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

All commands below passed with system Chromium and installed Playwright:

```sh
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_app_shell.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_editor_gestures.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_editor_screens.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_touch_fields.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_browser.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_guitar_ui.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_guitar_integration.cjs
node --check synth-demo/app-shell.js
git diff --check
```

The new shell test covers 390x844, 375x667, 844x390, 390x430 and 1280x800; document bounds, all routes, library search, source access, dialog Back/Forward/Escape/focus, repeated navigation, vetoable dirty-set close and browser Back, song save/reload, actual keyboard voice and transport. Existing gesture assertions retain note insertion, canceled touches, movement/resize, pan, axis-specific pinch, double tap/undo and read-only protection. The former collapsed-menu assertion now checks the settings sheet and unchanged piano-roll dimensions. Existing tests navigate to moved controls through sheets/views instead of assuming the old long page.

The configured integration test used two real pitches: keyboard peak 0.02902655489742756; sequencer playback, cache reuse, cancellation, two-worker preparation, four-worker benchmark and unchanged settings all passed, with no page errors. Repertoire test verifies 22 current built-ins, score positions, actual JSON export/import with source licensing, playback end and persistence.

During implementation, initial checks caught detached-node lookup, generic button sizing leaking into piano rows, implicit grid placement when the song bar was hidden, library search missing optgroup composer text, and a stale instrument label after cancel. Fixed and verified. One test needed to await the asynchronous native dialog close before checking restored preset. No unresolved failing tests.

## Integration and limits

Repertoire batch 2 is integrated: 25 built-ins, including Sor Op.35 No.17, Sor Op.6 No.11 and BWV1009 Bourrée I. All transferred segment hashes and the full 112419-byte patch SHA256 (`fa4bdd5be9c4f73fec0393ea0ad0c63220fb44a0f1c56da9fc3cde9de44a9cbb`) matched before application. Existing UI navigation changes were preserved when adapting the two repertoire browser tests. Source/CC links remain in Help and JSON metadata. `python3 scripts/import_repertoire_batch2.py` reproduced both generated files byte-for-byte; the Python tests and actual browser playback/export/import checks passed.

The five string-catalog transfer segments and full 42554-byte patch SHA256 (`e87e7356ee318425faa3db6dadb3b40352aaa503a64e13757207867b5bc728d9`) also matched. Applied the supplied explicit segment-3 correction only. All four experimental sets are integrated; `item.readonly` protects factory originals, provenance stays in collapsed details, default JSON unchanged. The existing beforeunload draft guard is preserved. Merged the source's eight additional UI assertions with this checkout's route/details navigation. See `string-presets-integration.md` for catalog limitations and evidence.

No shared test runtime helper modifications. Changes to existing test files are UI navigation adaptations plus using the already available portable launcher for editor tests. The audio engine, waveform parameters, articulation and storage formats are unchanged. Repertoire data, experimental string catalog, and finite-input validation from the authorized sibling patches are included.

Not tested: real iPhone Safari, WebKit simulation, actual software keyboard or device safe-area hardware. Reduced viewport testing is not an actual software keyboard test. On iPhone verify Safari bars and keyboard opening/closing, portrait/landscape, input selection/paste, native pinch outside the roll, app pinch on ruler/piano column, edge navigation, modal Back/dirty-set confirmation, audio interruption/resume, and long-press/drag cancellation. The complete Node regression suite is run after integration.

Before/after screenshots and patch are local under `/tmp/pmg-app-ui/`; these paths are not shared across task executors. Transfer patch content internally when requested; do not publish or upload.

## Additional independent QA

All 28 `synth-demo/*.test.cjs` Node tests passed; exact per-file exits and durations are in `/tmp/pmg-app-ui/node-suite/results.json`. Native `codex -s read-only review --uncommitted` was attempted but could not initialize its in-process app-server client because its runtime storage is read-only. This was an environment error, not an approval denial; no reviewer result was produced.

Browser probing reproduced loss of a focused, not-yet-blurred song title on reload. The shell now flushes a valid focused song field on pagehide and saves it before leaving. Guitar string-set drafts are not silently committed: their existing dirty flag now also requests a native beforeunload confirmation. Mobile OS termination can omit beforeunload/pagehide, so this is not a guarantee against force-killing Safari.

New `test_app_shell_review.cjs` passed: focused title/BPM reload persistence, native unsaved string-set reload veto, nested-dialog Escape focus return, Tab/Shift+Tab trapping, no keyboard audition while typing, longest built-in score (>1000 notes), 844x390 / 390x320 / 320x568 scroll bounds and help close reachability. The test intentionally handles an aborted/timed-out reload after the user rejects beforeunload, then verifies the draft is still present. `test_app_shell.cjs` and `test_configured_guitar_ui.cjs` also passed after these fixes.

## Local MIDI import

`midi-import.js` is an isolated parser with generated/original fixtures only. SMF formats 0/1, PPQN, fixed tempo (including repeated identical tempo events), fixed supported meter, running status, note-on velocity-zero, overlapping notes paired FIFO per track/channel/pitch, track selection/merge, note duration/velocity and final-rest extent are supported. MIDI source names use textContent, never HTML. No source-license claim is invented (`source: null`). The file stays in browser memory and is not uploaded.

Type 2, SMPTE, changing tempo/meter, malformed/truncated chunks, missing end markers/unclosed notes, >8 MiB, >256 tracks, >500000 events, >20000 notes, >4096 beats, and unsupported note ranges/durations are explicitly rejected. Pedals/controllers/program changes/pitch bends/SysEx are not synthesized; the preview warns that selected tracks play through the currently chosen instrument. Percussion channel gets an explicit warning. Preview confirms title, tempo, meter, counts and track choice before saving.

Cancel, browser Back and parsing/selection errors leave the current song unchanged. File-read generations prevent late asynchronous reads resurrecting a closed preview. `Library.addSaved()` rolls back only the attempted new song on storage failure, retaining the existing draft and preview for retry. Existing JSON import is retained.

Tests: `node synth-demo/midi-import.test.cjs` and `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_midi_import_browser.cjs`. The latter checks preview/cancel/Back, invalid input, tempo-map refusal, empty selection, quota failure/retry, saved original draft + imported song after reload, mobile landscape and page errors. Standard format reference: https://midimusic.github.io/tech/midispec.html (Standard MIDI-File Format Spec. 1.1).

Final integration test logs are under `/tmp/pmg-app-ui/final-tests/`; exact exits/durations/commands in `results.json`. Latest screenshots are `/tmp/pmg-app-ui/final-*.png`. At the integration checkpoint, no publication, push, commit, or new large patch transfer had been performed.

Final result: all 42 commands passed (30 `synth-demo/*.test.cjs` Node files, `scripts/test_string_presets.cjs`, 10 browser test files, and `scripts/test_repertoire_batch2.py`). Additional standalone MIDI unit/browser runs also passed after adding tempo/meter/short-note and quota-retry assertions. `node --check` on the new modules/editor and `git diff --check` passed. The importer reproduction check passed byte-for-byte. No failed test remains.

## Pre-release self-review (2026-10-29)

This is a documented self-review, not an independent/native reviewer result. No repeat invocation of the unavailable reviewer was attempted.

- Corrected native dirty-dialog history restoration: entry indices now restore either Back or Forward in the right direction. Added an instrument deep-link → library → Back → dirty set → Forward rejection/acceptance regression at 390×320.
- Isolated stale asynchronous MIDI file-read failures after dialog cancel/reopen. The old error cannot replace a new valid preview; browser regression delays/rejects the original read explicitly.
- Reject invalid meta-event type bytes and nonstandard time-signature note-value mapping instead of accepting ambiguous notation. Track-name decoding is bounded before trimming. Added malformed tempo/meta/SysEx length, every truncated fixture prefix, event/track/beat bounds, nonstandard meter and corrupt-storage preservation tests.
- Browser regression covers markup in MIDI track names and imported titles plus JSON source fields/JavaScript-shaped source URLs. These remain text/input values; no injected element or script execution occurs.
- Fresh `origin/main` remained `1807fc70f08500a643d3a916d9a6ca9627a25a0e`. Compared all original 22 song objects recursively and all seven original repertoire data files plus default-settings.json byte-for-byte: unchanged.
- The initial targeted browser rerun hit an expired local HTTP-server output pipe (`ERR_EMPTY_RESPONSE`); restarting the local server with redirected logs resolved it. Both targeted browser commands then passed. This was not a product failure.

The final post-review 42-command run is recorded under `/tmp/pmg-app-ui/release-tests/results.json`. The existing GitHub Pages workflow packages the new `.js`/`.css` modules automatically. Research audio changes and new WAVs are excluded from this release.

Staged-diff inspection: eight trailing-whitespace warnings occur only in the verbatim upstream `cellosuite3_5_bourree.ly`. They are retained to preserve the source/manifest hash. `git diff --cached --check -- . ':!scripts/score-sources/repertoire-batch2/cellosuite3_5_bourree.ly'` passes for all remaining release files. No new WAV, screenshot, log, dependency directory or credential-pattern match is included in the 40-file release.

Final post-review result: 42/42 commands passed after the last implementation/test changes. Publication was subsequently authorized by the user. The staged release patch was checked against a temporary clean worktree of the unchanged remote main.
