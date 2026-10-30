# Distinct transport controls

Base: `3ebb5ece2aaa85ad0324701c6719b923b39fddea`; initially isolated local candidate; subsequently approved for release with the preparation tiles and room-tail adjustment.

The user's image `libfile_a6a3b86f2710819186f1b73b24ff2ce1` was resolved using Library prepare_materialize. The current official transfer helper returned `library file transfer failed: download failed` (exit 1). No image bytes were inspected and no alternate transfer route was used. The failure did not expose a more specific reason; it is not asserted to be an authorization denial.

Independent code/reproduction finding: the editor's seq-play toggled to Stop during transport and called exactly the same api.stop() as adjacent seq-stop. That stops all voices/tails and saves the cursor position, not a separately implemented pause. seq-rewind stops and resets the cursor/scroll to zero. The performance view's demo button instead starts/restarts the song from zero; its separate global stop has a distinct action and is unchanged. We cannot confirm the user's particular screenshot context without viewing it.

The editor now keeps Play as Play, disabled while transport is active, and retains one enabled Stop control. Stopping/natural ending restores Play; manual stop retains the cursor for restart. Space still toggles transport directly, including while Play is disabled. No audio, note timing, MIDI, preparation or reverb code changes.

Passed commands:
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_transport_buttons.cjs`
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_app_shell.cjs http://127.0.0.1:8769/synth-demo/`
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_editor_screens.cjs http://127.0.0.1:8769/synth-demo/`
- `node synth-demo/playback-timing.test.cjs`

New test covers labels/enabled state, stop/cursor resume, rewind, Space toggle, repeated Play, Stop while AudioContext.resume is pending, natural end, navigation/key release and unchanged performance restart/global stop. Local reproduction screenshot: `/tmp/pmg-stop-playing.png`. Chromium mobile emulation, not actual iPhone Safari. Preparation/reverb candidate hashes remain intact in their separate worktree. No MIDI-investigation changes are included.
