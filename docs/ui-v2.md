# PMG UI V2 candidate

V2 is the optional `?ui=v2` presentation of the same entry point, not a second app or data migration. After a separately approved release its URL is `https://okonkore.github.io/pmg/?ui=v2`; the original URL remains unchanged. Both menus offer a switch to the other UI. The switch saves the current song and carries its ID, route and selected preset in the URL. Playback stops when leaving the page; this is not background playback.

## Layout

- Compact header: current song/title, audio enable, menu.
- Editor: tool and string-layer sheets; persistent Undo, play, stop, position and note details. Redo, loop, rewind, zoom and other existing actions remain in sheets.
- Songs and instruments retain distinct routes. Instrument preparation and string-set editing use the existing native dialogs and cancellation logic.
- MIDI, text TAB/copy/TXT, print, licensing and source details remain accessible from the existing actions.
- Only V2 gates startup painting, with retry and a link to the original UI if loading fails. The separate original-UI startup-gate candidate is not included.

## Shared state

No storage keys are renamed or introduced for V2. `pmg.songs.v1`, playback/mix settings, guitar settings/drafts and string-set storage retain their current schemas and owners. No automatic song duplication, assignment or migration occurs when switching UI. Factory songs and audio code are unchanged.

Before saving the song collection, `Library` compares current storage with the snapshot it loaded or last wrote. A stale collection is not written; local edits remain exportable as JSON. Both UIs show a blocking reload/export dialog when another tab changes a PMG storage key. This is conflict detection, not live merging or a fully transactional database. Existing already-open pre-release tabs must be reloaded to get the guard. Extremely simultaneous cross-process writes are not guaranteed atomic by this check.

## Local review

Serve `synth-demo` on port 8802, then open `http://127.0.0.1:8802/?ui=v2`. The tests accept a replacement base URL where shown.

```
node synth-demo/shared-storage.test.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_ui_v2.cjs http://127.0.0.1:8802/
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_midi_import_browser.cjs 'http://127.0.0.1:8802/?ui=v2'
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_tab_text_browser.cjs 'http://127.0.0.1:8802/?ui=v2'
```

Also run the existing model/string-layer/MIDI/TAB tests and original-UI app-shell/string-layer/gesture browser tests. Browser checks use Chromium mobile emulation; real iPhone Safari, its software keyboard, home-screen installation and PDF save are not verified. No publication is authorized for this candidate.
