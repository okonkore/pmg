# V2 duration grip

Single editable-note selection in Select or Pencil mode shows a 44×44 CSS pixel ↔ grip below the note end, above when the lower edge has insufficient space. Position is clamped inside the visible roll, outside the sticky piano/ruler and transport controls. Offscreen notes, multiple selection, hidden layers, readonly songs, Pan and Range modes have no grip. Open dialogs hide it. Scroll, viewport resize and note/grid redraw update its position; its size does not shrink with zoom.

Drag the grip horizontally to change duration; note-body movement and the legacy thin edge remain unchanged. This reuses the existing resize gesture, snap/bounds, one-step Undo and cancellation/pinch rollback. Arrow keys on the focused grip adjust duration without moving pitch/time. Pitch, velocity, string, assignment origin and IDs are preserved. Range mode still moves the group, including when dragging a note edge.

The grip is offset from the selected/unison note row; dense neighbouring rows may lie underneath its floating area. Switching to Pan/Range or clearing selection removes it. There is no edge auto-scroll. The current snap setting still controls duration steps (default 1/16); finer duration editing remains available in note details. Real iPhone ergonomics are unverified; local tests use Chromium mobile emulation.

Local preview: serve synth-demo on 8805 and open /?ui=v2#piano-roll. Focused test: PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_resize_grip.cjs. No audio or storage format changes; no publication authorized for this candidate.
